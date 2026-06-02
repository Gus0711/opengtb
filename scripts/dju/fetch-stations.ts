// scripts/dju/fetch-stations.ts
//
// Parcourt les 96 départements de France métropolitaine et sélectionne les
// N meilleures stations par département (top 3 par défaut). Écrit le résultat
// dans `src/lib/tools/dju/data/stations.json`.
//
// Critères de sélection :
//   1. Stations avec posteOuvert=true (données récentes disponibles)
//   2. typePoste ≤ 3 (1 synoptique, 2 climato principal, 3 secondaire)
//   3. Tri : typePoste croissant, puis altitude la plus modérée (proche 100m)
//   4. Cap à MAX_PER_DEPT entrées
//
// Lancement :
//   npm run dju:stations
//
// Options :
//   --probe <dept>       affiche les stations brutes d'un département
//   --max <N>            change le cap par dept (défaut : 3)
//   --force              refait la sélection même pour les dept déjà connus

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MfClient, type RawStation } from './lib/mf-client.ts';
import { DEPARTEMENTS, type Departement } from './lib/departements.ts';

const SLEEP_BETWEEN_DEPTS_MS = 1500;
const DEFAULT_MAX_PER_DEPT = 3;
const MAX_TYPE_POSTE = 3;

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../../src/lib/tools/dju/data/stations.json');

export interface StationRecord {
	id: string;
	name: string;
	dept: string;
	deptName: string;
	lat: number;
	lon: number;
	alt: number;
	typePoste: number | null;
}

export interface StationsFile {
	metadata: {
		fetchedAt: string;
		source: string;
		count: number;
	};
	stations: StationRecord[];
}

function pickTopN(stations: RawStation[], n: number): RawStation[] {
	const eligible = stations.filter(
		(s) => s.posteOuvert && (s.typePoste ?? 99) <= MAX_TYPE_POSTE
	);
	// Tri : typePoste croissant (1 = mieux), puis altitude « modérée » (proche 100m)
	const sorted = [...eligible].sort((a, b) => {
		const ta = a.typePoste ?? 99;
		const tb = b.typePoste ?? 99;
		if (ta !== tb) return ta - tb;
		const da = Math.abs((a.alt ?? 0) - 100);
		const db = Math.abs((b.alt ?? 0) - 100);
		return da - db;
	});
	return sorted.slice(0, n);
}

// L'API DPClim refuse les codes 2A/2B. La Corse historique (id=20) renvoie
// toutes les stations des deux départements ; on splitte par latitude.
const CORSE_LAT_SPLIT = 42.15;

// Cache pour ne charger qu'une fois la liste Corse complète
let corseStations: RawStation[] | null = null;

async function getCorseStations(client: MfClient): Promise<RawStation[]> {
	if (!corseStations) corseStations = await client.listStations('20');
	return corseStations;
}

async function fetchDept(
	client: MfClient,
	dept: Departement,
	maxPerDept: number
): Promise<StationRecord[]> {
	let list: RawStation[];
	if (dept.code === '2A' || dept.code === '2B') {
		const all = await getCorseStations(client);
		list = all.filter((s) =>
			dept.code === '2A' ? s.lat < CORSE_LAT_SPLIT : s.lat >= CORSE_LAT_SPLIT
		);
	} else {
		list = await client.listStations(dept.code);
	}
	const picks = pickTopN(list, maxPerDept);
	return picks.map((pick) => ({
		id: pick.id,
		name: pick.nom,
		dept: dept.code,
		deptName: dept.name,
		lat: pick.lat,
		lon: pick.lon,
		alt: pick.alt,
		typePoste: pick.typePoste ?? null
	}));
}

async function probe(client: MfClient, deptCode: string, maxPerDept: number): Promise<void> {
	const dept = DEPARTEMENTS.find((d) => d.code === deptCode);
	if (!dept) {
		console.error(`Département inconnu : ${deptCode}`);
		process.exit(1);
	}
	console.log(`[probe] Stations du département ${dept.code} — ${dept.name}\n`);
	const list = await client.listStations(dept.code);
	for (const s of list) {
		console.log(
			`  ${s.id.padEnd(10)} ${s.nom.padEnd(28)} alt=${String(s.alt).padStart(4)}m  type=${
				s.typePoste ?? '?'
			}  ouvert=${s.posteOuvert ? 'oui' : 'non'}`
		);
	}
	const picks = pickTopN(list, maxPerDept);
	console.log(`\n→ Sélection top ${maxPerDept} :`);
	if (picks.length === 0) {
		console.log('   AUCUNE (toutes fermées ou typePoste > 3)');
	} else {
		picks.forEach((p, i) =>
			console.log(`   ${i + 1}. ${p.id} ${p.nom} (type ${p.typePoste}, alt ${p.alt}m)`)
		);
	}
}

async function main(): Promise<void> {
	const applicationId = process.env.MF_APPLICATION_ID;
	if (!applicationId) {
		console.error('MF_APPLICATION_ID manquant. Renseigne-le dans .env puis relance.');
		process.exit(1);
	}
	const client = new MfClient({ applicationId });

	// Parse options
	const maxIdx = process.argv.indexOf('--max');
	const maxPerDept =
		maxIdx !== -1 ? Number(process.argv[maxIdx + 1]) || DEFAULT_MAX_PER_DEPT : DEFAULT_MAX_PER_DEPT;
	const force = process.argv.includes('--force');

	// Mode probe : juste afficher un département pour debug
	const probeIdx = process.argv.indexOf('--probe');
	if (probeIdx !== -1) {
		const code = process.argv[probeIdx + 1];
		if (!code) {
			console.error('Usage : --probe <code-departement>');
			process.exit(1);
		}
		await probe(client, code, maxPerDept);
		return;
	}

	// Mode resume : on garde les dept déjà bien fournis (≥ maxPerDept stations).
	// Pour les autres on refait la sélection complète (remplace les entrées existantes).
	const existing = await loadExisting();
	const existingByDept = new Map<string, StationRecord[]>();
	for (const rec of existing) {
		if (!existingByDept.has(rec.dept)) existingByDept.set(rec.dept, []);
		existingByDept.get(rec.dept)!.push(rec);
	}

	const todo = DEPARTEMENTS.filter((d) => {
		if (force) return true;
		const have = existingByDept.get(d.code) ?? [];
		return have.length < maxPerDept;
	});
	const alreadyDone = DEPARTEMENTS.length - todo.length;
	console.log(
		`Top ${maxPerDept} stations / département. ${alreadyDone} dept déjà OK, ${todo.length} à (re)fetcher.\n`
	);

	// On part des dept déjà OK, on ajoute/remplace au fur et à mesure
	const records: StationRecord[] = [];
	for (const dept of DEPARTEMENTS) {
		if (!todo.includes(dept)) {
			records.push(...(existingByDept.get(dept.code) ?? []));
		}
	}
	const skipped: string[] = [];

	for (let i = 0; i < todo.length; i++) {
		const dept = todo[i];
		try {
			const picks = await fetchDept(client, dept, maxPerDept);
			if (picks.length > 0) {
				records.push(...picks);
				const names = picks.map((p) => `${p.id} ${p.name}`).join(', ');
				console.log(
					`  [OK]   ${dept.code} ${dept.name.padEnd(30)} → ${picks.length} station(s) : ${names}`
				);
				await writeOutput(records);
			} else {
				skipped.push(`${dept.code} (aucune station éligible)`);
				console.log(
					`  [SKIP] ${dept.code} ${dept.name.padEnd(30)} → aucune station éligible (ouverte + typePoste ≤ 3)`
				);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			skipped.push(`${dept.code} (${msg})`);
			console.log(`  [ERR]  ${dept.code} ${dept.name.padEnd(30)} → ${msg}`);
		}
		if (i < todo.length - 1) await sleep(SLEEP_BETWEEN_DEPTS_MS);
	}

	await writeOutput(records);

	console.log(`\n${records.length} stations écrites dans ${OUT_PATH}`);
	if (skipped.length > 0) {
		console.log(`${skipped.length} départements non couverts :`);
		for (const s of skipped) console.log(`  - ${s}`);
	}
}

async function loadExisting(): Promise<StationRecord[]> {
	try {
		const raw = await readFile(OUT_PATH, 'utf-8');
		const parsed = JSON.parse(raw) as StationsFile;
		return parsed.stations ?? [];
	} catch {
		return [];
	}
}

async function writeOutput(records: StationRecord[]): Promise<void> {
	const sorted = [...records].sort((a, b) => a.dept.localeCompare(b.dept));
	const out: StationsFile = {
		metadata: {
			fetchedAt: new Date().toISOString(),
			source: 'Météo-France DPClim',
			count: sorted.length
		},
		stations: sorted
	};
	await mkdir(dirname(OUT_PATH), { recursive: true });
	await writeFile(OUT_PATH, JSON.stringify(out, null, '\t') + '\n', 'utf-8');
}

main().catch((err) => {
	console.error('Erreur fatale :', err);
	process.exit(1);
});
