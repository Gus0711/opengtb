import type {
	BaselinePoint,
	ParseConsoResult,
	RegressionResult,
	StationData
} from './types';

/**
 * Recalcule les DJU mensuels, annuels et moyens à partir des températures
 * stockées dans la station et des bases passées en paramètre. Permet à
 * l'utilisateur de changer librement la base chauffage / clim sans refetch.
 *
 * Formule : DJU_mensuel = max(0, base − T_mean_mois) × nbDays, idem en clim
 * avec signe inversé. Identique à la logique de scripts/dju/fetch-data.ts.
 */
export function recomputeWithBases(
	station: StationData,
	baseHeating: number,
	baseCooling: number
): StationData {
	const round1 = (n: number) => Math.round(n * 10) / 10;
	const monthly = station.monthly.map((m) => {
		const t = m.tMean;
		const djuH = t == null ? null : round1(Math.max(0, baseHeating - t) * m.nbDays);
		const djuC = t == null ? null : round1(Math.max(0, t - baseCooling) * m.nbDays);
		return { ...m, djuH, djuC };
	});

	const byYear = new Map<number, typeof monthly>();
	for (const m of monthly) {
		const year = Number(m.date.slice(0, 4));
		if (!byYear.has(year)) byYear.set(year, []);
		byYear.get(year)!.push(m);
	}
	const yearly = [...byYear.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([year, months]) => {
			const withT = months.filter((m) => m.tMean != null);
			const monthsCovered = withT.length;
			const complete = monthsCovered === 12;
			const totDays = withT.reduce((s, m) => s + m.nbDays, 0);
			const tMean = totDays > 0
				? withT.reduce((s, m) => s + (m.tMean as number) * m.nbDays, 0) / totDays
				: null;
			const djuH = withT.length > 0 ? withT.reduce((s, m) => s + (m.djuH ?? 0), 0) : null;
			const djuC = withT.length > 0 ? withT.reduce((s, m) => s + (m.djuC ?? 0), 0) : null;
			return {
				year,
				tMean: tMean != null ? round1(tMean) : null,
				djuH: djuH != null ? round1(djuH) : null,
				djuC: djuC != null ? round1(djuC) : null,
				monthsCovered,
				complete
			};
		});

	const completeYearsSet = new Set(yearly.filter((y) => y.complete).map((y) => y.year));
	const completes = yearly.filter((y) => y.complete);
	const avgYearly = {
		djuH:
			completes.length > 0
				? round1(completes.reduce((s, y) => s + (y.djuH as number), 0) / completes.length)
				: null,
		djuC:
			completes.length > 0
				? round1(completes.reduce((s, y) => s + (y.djuC as number), 0) / completes.length)
				: null,
		tMean:
			completes.length > 0
				? round1(completes.reduce((s, y) => s + (y.tMean as number), 0) / completes.length)
				: null,
		yearsCount: completes.length
	};

	const byMonth = new Map<number, typeof monthly>();
	for (const m of monthly) {
		const year = Number(m.date.slice(0, 4));
		const mo = Number(m.date.slice(5, 7));
		if (!completeYearsSet.has(year) || m.tMean == null) continue;
		if (!byMonth.has(mo)) byMonth.set(mo, []);
		byMonth.get(mo)!.push(m);
	}
	const avgMonthly = [] as StationData['averages']['monthly'];
	for (let mo = 1; mo <= 12; mo++) {
		const ms = byMonth.get(mo) ?? [];
		if (ms.length === 0) {
			avgMonthly.push({ month: mo, djuH: null, djuC: null, tMean: null });
		} else {
			avgMonthly.push({
				month: mo,
				djuH: round1(ms.reduce((s, m) => s + (m.djuH ?? 0), 0) / ms.length),
				djuC: round1(ms.reduce((s, m) => s + (m.djuC ?? 0), 0) / ms.length),
				tMean: round1(ms.reduce((s, m) => s + (m.tMean as number), 0) / ms.length)
			});
		}
	}

	return {
		...station,
		baseHeating,
		baseCooling,
		monthly,
		yearly,
		averages: { yearly: avgYearly, monthly: avgMonthly }
	};
}

/** Liste les années complètes disponibles pour une station (utile pour <select>). */
export function completeYears(station: StationData): number[] {
	return station.yearly.filter((y) => y.complete).map((y) => y.year);
}

/** Liste de toutes les années disponibles avec leur état complet/partiel. */
export function allYears(station: StationData): Array<{ year: number; complete: boolean; monthsCovered: number }> {
	return station.yearly.map((y) => ({
		year: y.year,
		complete: y.complete,
		monthsCovered: y.monthsCovered
	}));
}

/** Génère un CSV exportable des DJU mensuels d'une station, années filtrées. */
export function buildCsv(
	station: StationData,
	yearsFilter?: number[]
): string {
	const headers = [
		'date',
		'tMean_C',
		'nbDays',
		`djuH_base${station.baseHeating}`,
		`djuC_base${station.baseCooling}`
	];
	const lines: string[] = [headers.join(';')];
	const ySet = yearsFilter ? new Set(yearsFilter) : null;
	for (const m of station.monthly) {
		const year = Number(m.date.slice(0, 4));
		if (ySet && !ySet.has(year)) continue;
		lines.push(
			[
				m.date,
				fmtCsv(m.tMean),
				String(m.nbDays),
				fmtCsv(m.djuH),
				fmtCsv(m.djuC)
			].join(';')
		);
	}
	return lines.join('\n') + '\n';
}

function fmtCsv(v: number | null): string {
	return v == null ? '' : String(v).replace('.', ',');
}

/**
 * Régression linéaire simple y = a·x + b par moindres carrés.
 * Pour l'IPMVP Option C : x = DJU mensuel, y = conso mensuelle.
 *
 *   a = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)   (pente : kWh/DJU)
 *   b = (Σy − a·Σx) / n                      (ordonnée : kWh/mois indépendants du climat)
 *   r² = 1 − SS_res / SS_tot                 (qualité d'ajustement)
 */
export function linearRegression(points: BaselinePoint[]): RegressionResult | null {
	const n = points.length;
	if (n < 3) return null;
	let sumX = 0;
	let sumY = 0;
	let sumXY = 0;
	let sumX2 = 0;
	for (const p of points) {
		sumX += p.dju;
		sumY += p.conso;
		sumXY += p.dju * p.conso;
		sumX2 += p.dju * p.dju;
	}
	const denom = n * sumX2 - sumX * sumX;
	if (denom === 0) return null;
	const a = (n * sumXY - sumX * sumY) / denom;
	const b = (sumY - a * sumX) / n;

	const meanY = sumY / n;
	let ssRes = 0;
	let ssTot = 0;
	for (const p of points) {
		const yPred = a * p.dju + b;
		ssRes += (p.conso - yPred) ** 2;
		ssTot += (p.conso - meanY) ** 2;
	}
	const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
	return { a, b, r2, n };
}

/**
 * Joint les consos mensuelles saisies à leurs DJU mesurés depuis la station.
 * Ignore les mois sans DJU disponible (ex : avant 2010 ou trous de données).
 */
export function buildBaseline(
	station: StationData,
	consos: Array<{ yearMonth: string; conso: number }>
): { points: BaselinePoint[]; missing: string[] } {
	const djuByMonth = new Map(station.monthly.map((m) => [m.date, m.djuH]));
	const points: BaselinePoint[] = [];
	const missing: string[] = [];
	for (const c of consos) {
		const dju = djuByMonth.get(c.yearMonth);
		if (dju == null) {
			missing.push(c.yearMonth);
			continue;
		}
		points.push({ yearMonth: c.yearMonth, dju, conso: c.conso });
	}
	return { points, missing };
}

/**
 * Parse un texte multiligne au format `YYYY-MM <sep> kWh`. Sépareurs acceptés :
 * `;`, `,`, tab, multiples espaces. Lignes vides et commentaires (`#`) ignorés.
 * Tolère la virgule décimale française.
 */
export function parseConsoInput(text: string): ParseConsoResult {
	const out: ParseConsoResult = { points: [], errors: [] };
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i].trim();
		if (!raw || raw.startsWith('#')) continue;
		const cells = splitLine(raw);
		if (cells.length < 2) {
			out.errors.push(`Ligne ${i + 1} : 2 valeurs attendues (date ; kWh)`);
			continue;
		}
		const yearMonth = normalizeYearMonth(cells[0]);
		if (!yearMonth) {
			out.errors.push(`Ligne ${i + 1} : date "${cells[0]}" non reconnue (attendu YYYY-MM)`);
			continue;
		}
		const consoStr = cells[1].replace(/\s/g, '').replace(',', '.');
		const conso = Number(consoStr);
		if (!Number.isFinite(conso) || conso < 0) {
			out.errors.push(`Ligne ${i + 1} : conso "${cells[1]}" invalide`);
			continue;
		}
		out.points.push({ yearMonth, conso });
	}
	return out;
}

/**
 * Détecte le séparateur de cellules d'une ligne. Priorité `;` > tab > `,` >
 * espaces. Ainsi `9500,5` reste interprétable comme virgule décimale tant que
 * la ligne contient `;` ou tab comme séparateur cellulaire.
 */
function splitLine(line: string): string[] {
	let sep: RegExp;
	if (line.includes(';')) sep = /;/;
	else if (line.includes('\t')) sep = /\t+/;
	else if (line.includes(',')) sep = /,/;
	else sep = /\s+/;
	return line.split(sep).map((s) => s.trim()).filter(Boolean);
}

function normalizeYearMonth(s: string): string | null {
	// Accepte 2023-01, 2023/01, 202301, 01/2023, 01-2023
	const t = s.trim();
	let m = t.match(/^(\d{4})[-/]?(\d{2})$/);
	if (m) return `${m[1]}-${m[2]}`;
	m = t.match(/^(\d{2})[-/](\d{4})$/);
	if (m) return `${m[2]}-${m[1]}`;
	return null;
}
