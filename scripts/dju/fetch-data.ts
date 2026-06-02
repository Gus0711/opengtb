// scripts/dju/fetch-data.ts
//
// Pour chaque station listée dans stations.json :
//   1. Commande les données mensuelles 2010-01 → mois en cours
//   2. Parse le CSV (champs TM, NBTM)
//   3. Calcule DJU chauffage (base 18°C) et clim (base 24°C) par mois et par année
//   4. Écrit `static/data/dju/<station-id>.json`
//
// Note : approximation mensuelle DJU = max(0, base - TM_mois) × NBTM.
// Pour une précision Costic stricte il faudrait des quotidiennes (à faire en V2).
//
// Lancement :
//   npm run dju:data
//
// Mode :
//   --station <id>          ne traite qu'une station précise
//   --dept <code[,code...]> ne traite que les stations d'un (ou plusieurs) dept(s)
//   --force                 re-fetch même les stations déjà à jour

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MfClient, parseMfNumber, type CsvRecord } from './lib/mf-client.ts';
import type { StationRecord, StationsFile } from './fetch-stations.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIONS_PATH = resolve(__dirname, '../../src/lib/tools/dju/data/stations.json');
const OUT_DIR = resolve(__dirname, '../../static/data/dju');
const INDEX_PATH = resolve(__dirname, '../../src/lib/tools/dju/data/index.json');

const BASE_HEATING_C = 18;
const BASE_COOLING_C = 24;
const FETCH_START = '2010-01-01T00:00:00Z';
const SLEEP_BETWEEN_STATIONS_MS = 2000;

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function firstOfCurrentMonthIso(): string {
	const now = new Date();
	const iso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
	// MF impose HH:MM:SS = 00:00:00 → toISOString() donne déjà `T00:00:00.000Z`,
	// mais il faut supprimer les millisecondes.
	return iso.replace('.000Z', 'Z');
}

export interface MonthlyDju {
	date: string; // YYYY-MM
	tMean: number | null;
	nbDays: number;
	djuH: number | null;
	djuC: number | null;
}

export interface YearlyDju {
	year: number;
	tMean: number | null;
	djuH: number | null;
	djuC: number | null;
	monthsCovered: number;
	complete: boolean; // 12 mois présents avec TM
}

export interface StationData {
	id: string;
	name: string;
	dept: string;
	deptName: string;
	lat: number;
	lon: number;
	alt: number;
	period: { start: string; end: string };
	baseHeating: number;
	baseCooling: number;
	updatedAt: string;
	monthly: MonthlyDju[];
	yearly: YearlyDju[];
	averages: {
		yearly: { djuH: number | null; djuC: number | null; tMean: number | null; yearsCount: number };
		monthly: Array<{ month: number; djuH: number | null; djuC: number | null; tMean: number | null }>;
	};
}

export interface IndexEntry {
	id: string;
	dept: string;
	updatedAt: string;
	periodEnd: string;
	yearsCount: number;
}

export interface IndexFile {
	metadata: {
		generatedAt: string;
		source: string;
		baseHeating: number;
		baseCooling: number;
		stationCount: number;
	};
	stations: IndexEntry[];
}

function daysInMonth(year: number, month1to12: number): number {
	return new Date(year, month1to12, 0).getDate();
}

function calcMonthly(rows: CsvRecord[]): MonthlyDju[] {
	// Dédup par date (les chunks annuels de l'API peuvent retourner un mois
	// commun, ex: 2011-01 présent dans le batch 2010 ET dans le batch 2011).
	const byDate = new Map<string, MonthlyDju>();
	for (const row of rows) {
		const dateRaw = row.DATE; // YYYYMM
		if (!dateRaw || dateRaw.length !== 6) continue;
		const year = Number(dateRaw.slice(0, 4));
		const month = Number(dateRaw.slice(4, 6));
		if (!Number.isFinite(year) || !Number.isFinite(month)) continue;
		const date = `${year}-${String(month).padStart(2, '0')}`;
		const tMean = parseMfNumber(row.TM);
		const nbDays = parseMfNumber(row.NBTM) ?? daysInMonth(year, month);
		const djuH =
			tMean == null ? null : Math.max(0, BASE_HEATING_C - tMean) * nbDays;
		const djuC =
			tMean == null ? null : Math.max(0, tMean - BASE_COOLING_C) * nbDays;
		byDate.set(date, {
			date,
			tMean,
			nbDays,
			djuH: djuH != null ? round1(djuH) : null,
			djuC: djuC != null ? round1(djuC) : null
		});
	}
	return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateYearly(monthly: MonthlyDju[]): YearlyDju[] {
	const byYear = new Map<number, MonthlyDju[]>();
	for (const m of monthly) {
		const year = Number(m.date.slice(0, 4));
		if (!byYear.has(year)) byYear.set(year, []);
		byYear.get(year)!.push(m);
	}
	const out: YearlyDju[] = [];
	for (const [year, months] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
		const withT = months.filter((m) => m.tMean != null);
		const monthsCovered = withT.length;
		const complete = monthsCovered === 12;
		const tMean =
			withT.length > 0
				? withT.reduce((s, m) => s + (m.tMean as number) * m.nbDays, 0) /
				  withT.reduce((s, m) => s + m.nbDays, 0)
				: null;
		const djuH = withT.length > 0 ? withT.reduce((s, m) => s + (m.djuH ?? 0), 0) : null;
		const djuC = withT.length > 0 ? withT.reduce((s, m) => s + (m.djuC ?? 0), 0) : null;
		out.push({
			year,
			tMean: tMean != null ? round1(tMean) : null,
			djuH: djuH != null ? round1(djuH) : null,
			djuC: djuC != null ? round1(djuC) : null,
			monthsCovered,
			complete
		});
	}
	return out;
}

function aggregateAverages(monthly: MonthlyDju[], yearly: YearlyDju[]) {
	const completeYears = new Set(yearly.filter((y) => y.complete).map((y) => y.year));
	const completes = yearly.filter((y) => y.complete);
	const meanYearly = {
		djuH: completes.length > 0 ? round1(avg(completes.map((y) => y.djuH as number))) : null,
		djuC: completes.length > 0 ? round1(avg(completes.map((y) => y.djuC as number))) : null,
		tMean: completes.length > 0 ? round1(avg(completes.map((y) => y.tMean as number))) : null,
		yearsCount: completes.length
	};

	const byMonth = new Map<number, MonthlyDju[]>();
	for (const m of monthly) {
		const year = Number(m.date.slice(0, 4));
		const month = Number(m.date.slice(5, 7));
		if (!completeYears.has(year) || m.tMean == null) continue;
		if (!byMonth.has(month)) byMonth.set(month, []);
		byMonth.get(month)!.push(m);
	}
	const meanMonthly: StationData['averages']['monthly'] = [];
	for (let mo = 1; mo <= 12; mo++) {
		const ms = byMonth.get(mo) ?? [];
		if (ms.length === 0) {
			meanMonthly.push({ month: mo, djuH: null, djuC: null, tMean: null });
			continue;
		}
		meanMonthly.push({
			month: mo,
			djuH: round1(avg(ms.map((m) => m.djuH as number))),
			djuC: round1(avg(ms.map((m) => m.djuC as number))),
			tMean: round1(avg(ms.map((m) => m.tMean as number)))
		});
	}
	return { yearly: meanYearly, monthly: meanMonthly };
}

function avg(arr: number[]): number {
	return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round1(n: number): number {
	return Math.round(n * 10) / 10;
}

async function fetchStationData(
	client: MfClient,
	station: StationRecord,
	endIso: string
): Promise<StationData> {
	const rows = await client.fetchMonthlyRange(station.id, FETCH_START, endIso);
	const monthly = calcMonthly(rows);
	const yearly = aggregateYearly(monthly);
	const averages = aggregateAverages(monthly, yearly);
	return {
		id: station.id,
		name: station.name,
		dept: station.dept,
		deptName: station.deptName,
		lat: station.lat,
		lon: station.lon,
		alt: station.alt,
		period: { start: FETCH_START, end: endIso },
		baseHeating: BASE_HEATING_C,
		baseCooling: BASE_COOLING_C,
		updatedAt: new Date().toISOString(),
		monthly,
		yearly,
		averages
	};
}

async function loadStations(): Promise<StationRecord[]> {
	const raw = await readFile(STATIONS_PATH, 'utf-8');
	return (JSON.parse(raw) as StationsFile).stations;
}

async function loadExistingIndex(): Promise<IndexFile | null> {
	try {
		const raw = await readFile(INDEX_PATH, 'utf-8');
		return JSON.parse(raw) as IndexFile;
	} catch {
		return null;
	}
}

async function writeStationFile(data: StationData): Promise<void> {
	const path = resolve(OUT_DIR, `${data.id}.json`);
	await writeFile(path, JSON.stringify(data) + '\n', 'utf-8');
}

async function writeIndex(entries: IndexEntry[]): Promise<void> {
	const sorted = [...entries].sort((a, b) => a.dept.localeCompare(b.dept));
	const out: IndexFile = {
		metadata: {
			generatedAt: new Date().toISOString(),
			source: 'Météo-France DPClim — mensuelles, calcul DJU local',
			baseHeating: BASE_HEATING_C,
			baseCooling: BASE_COOLING_C,
			stationCount: sorted.length
		},
		stations: sorted
	};
	await writeFile(INDEX_PATH, JSON.stringify(out, null, '\t') + '\n', 'utf-8');
}

async function main(): Promise<void> {
	const applicationId = process.env.MF_APPLICATION_ID;
	if (!applicationId) {
		console.error('MF_APPLICATION_ID manquant. Renseigne-le dans .env puis relance.');
		process.exit(1);
	}
	await mkdir(OUT_DIR, { recursive: true });
	await mkdir(dirname(INDEX_PATH), { recursive: true });

	const force = process.argv.includes('--force');
	const stationIdx = process.argv.indexOf('--station');
	const onlyStation = stationIdx !== -1 ? process.argv[stationIdx + 1] : null;
	const deptIdx = process.argv.indexOf('--dept');
	const onlyDepts =
		deptIdx !== -1 && process.argv[deptIdx + 1]
			? new Set(process.argv[deptIdx + 1].split(',').map((s) => s.trim()))
			: null;

	const client = new MfClient({ applicationId });
	const stations = await loadStations();
	const filtered = stations.filter((s) => {
		if (onlyStation && s.id !== onlyStation) return false;
		if (onlyDepts && !onlyDepts.has(s.dept)) return false;
		return true;
	});

	if (filtered.length === 0) {
		console.error('Aucune station correspondante.');
		process.exit(1);
	}

	const existing = (await loadExistingIndex())?.stations ?? [];
	const existingById = new Map(existing.map((e) => [e.id, e]));
	const endIso = firstOfCurrentMonthIso();

	console.log(
		`Récupération DJU mensuels pour ${filtered.length} station(s) — période ${FETCH_START.slice(0, 7)} → ${endIso.slice(0, 7)}\n`
	);

	const index: IndexEntry[] = [...existing];
	const indexById = new Map(index.map((e) => [e.id, e]));

	for (let i = 0; i < filtered.length; i++) {
		const station = filtered[i];
		const already = existingById.get(station.id);
		if (already && already.periodEnd === endIso && !force) {
			console.log(
				`  [SKIP] ${station.dept} ${station.name.padEnd(28)} → à jour (${already.yearsCount} années)`
			);
			continue;
		}
		try {
			const data = await fetchStationData(client, station, endIso);
			await writeStationFile(data);
			const entry: IndexEntry = {
				id: station.id,
				dept: station.dept,
				updatedAt: data.updatedAt,
				periodEnd: endIso,
				yearsCount: data.yearly.filter((y) => y.complete).length
			};
			indexById.set(station.id, entry);
			await writeIndex([...indexById.values()]);
			console.log(
				`  [OK]   ${station.dept} ${station.name.padEnd(28)} → ${data.monthly.length} mois, ${entry.yearsCount} années complètes`
			);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.log(`  [ERR]  ${station.dept} ${station.name.padEnd(28)} → ${msg}`);
		}
		if (i < filtered.length - 1) await sleep(SLEEP_BETWEEN_STATIONS_MS);
	}

	console.log(`\nIndex écrit : ${INDEX_PATH}`);
	console.log(`Données par station : ${OUT_DIR}`);
}

main().catch((err) => {
	console.error('Erreur fatale :', err);
	process.exit(1);
});
