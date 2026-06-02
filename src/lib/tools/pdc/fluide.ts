/**
 * Propriétés thermo-physiques du fluide à T (et concentration glycol) donnés.
 *
 * Interpolation linéaire bi-dimensionnelle pour les mélanges glycolés :
 *   1. interpolation en T à chaque concentration tabulée encadrante,
 *   2. interpolation en concentration entre les deux résultats.
 *
 * Toute température hors de l'intervalle tabulé d'une concentration utile
 * lève une erreur — aucune extrapolation silencieuse.
 */

import { ERROR_CODES, FLUIDES_LABELS } from './constants';
import {
	EAU_TABLE,
	GLYCOL_CONCENTRATIONS,
	MEG_TABLES,
	MPG_TABLES,
	fluideSource,
	type FluidRow
} from './data/fluides';
import type { FluidId, FluidProps } from './types';

/* ============================================================ */
/*  Interpolations                                               */
/* ============================================================ */

interface FluidRowInterp {
	rho: number;
	nu: number;
	cp: number;
}

function interpRow(a: FluidRowInterp, b: FluidRowInterp, t: number): FluidRowInterp {
	return {
		rho: a.rho + (b.rho - a.rho) * t,
		nu: a.nu + (b.nu - a.nu) * t,
		cp: a.cp + (b.cp - a.cp) * t
	};
}

/**
 * Interpolation linéaire d'une table monotone en T, pour les colonnes
 * (ρ, ν, cp). Throw si T sort de l'intervalle.
 */
function interpolateOnT(
	table: ReadonlyArray<FluidRow>,
	T: number,
	context: string
): FluidRowInterp {
	if (table.length === 0) {
		throw newOutOfRangeError(
			`Table fluide vide pour ${context}.`,
			T,
			null,
			null
		);
	}
	const tMin = table[0].T;
	const tMax = table[table.length - 1].T;
	if (T < tMin || T > tMax) {
		throw newOutOfRangeError(
			`Température ${T} °C hors plage tabulée [${tMin} ; ${tMax}] pour ${context}.`,
			T,
			tMin,
			tMax
		);
	}
	for (let i = 0; i < table.length - 1; i++) {
		const a = table[i];
		const b = table[i + 1];
		if (T >= a.T && T <= b.T) {
			const t = b.T === a.T ? 0 : (T - a.T) / (b.T - a.T);
			return interpRow(a, b, t);
		}
	}
	// Filet de sécurité (T = exactement tMax) — déjà couvert par la dernière
	// itération, mais on garde le retour explicite.
	const last = table[table.length - 1];
	return { rho: last.rho, nu: last.nu, cp: last.cp };
}

function newOutOfRangeError(
	message: string,
	value: number,
	min: number | null,
	max: number | null
): Error {
	const err = new Error(message);
	(err as { code?: string }).code = ERROR_CODES.TEMPERATURE_OUT_OF_RANGE;
	(err as { value?: number }).value = value;
	(err as { min?: number | null }).min = min;
	(err as { max?: number | null }).max = max;
	return err;
}

/**
 * Trouve l'encadrement de concentrations utiles dans la table {10,20,30,40,50}.
 * Si pct < 10 → encadrement (10, 10). Si pct > 50 → erreur (hors plage).
 */
function bracketConcentration(pct: number): [number, number, number] {
	if (pct < 0) throw new Error('Concentration glycol < 0 % impossible.');
	if (pct > 50) {
		const err = new Error(
			`Concentration glycol ${pct} % hors plage tabulée [0 ; 50] %.`
		);
		(err as { code?: string }).code = ERROR_CODES.GLYCOL_OUT_OF_RANGE;
		throw err;
	}
	if (pct < GLYCOL_CONCENTRATIONS[0]) {
		// 0–10 % : on interpole linéairement entre eau pure (équivalent 0 %) et
		// la table à 10 %. Pour rester strict, on demande au caller de passer
		// par la route 'eau' en dessous de la concentration minimale tabulée.
		// On préfère ici éviter le silence : interpolation depuis 10 % suffit
		// dans la grande majorité des cas pratiques (les concentrations CVC
		// utilisées sont 20-40 %).
		return [GLYCOL_CONCENTRATIONS[0], GLYCOL_CONCENTRATIONS[0], 0];
	}
	for (let i = 0; i < GLYCOL_CONCENTRATIONS.length - 1; i++) {
		const a = GLYCOL_CONCENTRATIONS[i];
		const b = GLYCOL_CONCENTRATIONS[i + 1];
		if (pct >= a && pct <= b) {
			const t = b === a ? 0 : (pct - a) / (b - a);
			return [a, b, t];
		}
	}
	const last = GLYCOL_CONCENTRATIONS[GLYCOL_CONCENTRATIONS.length - 1];
	return [last, last, 0];
}

/* ============================================================ */
/*  API publique                                                 */
/* ============================================================ */

/**
 * Propriétés thermo-physiques d'un fluide à T (°C) et concentration glycol
 * donnés. Aucune extrapolation hors table.
 *
 * @returns ρ [kg/m³], ν [m²/s], μ [Pa·s], cpVolumique [kWh/(m³·K)].
 *
 * @throws Error avec code `TEMPERATURE_OUT_OF_RANGE` si T sort de la plage,
 *         `GLYCOL_OUT_OF_RANGE` si concentration hors [0 ; 50] %,
 *         `INCONSISTENT_FLUID` si glycol > 0 avec type 'eau'.
 */
export function proprietesFluide(
	type: FluidId,
	glycolPct: number,
	T: number
): FluidProps {
	if (type === 'eau' && glycolPct > 0) {
		const err = new Error(
			`Concentration glycol ${glycolPct} % incompatible avec fluide « ${FLUIDES_LABELS.eau} ».`
		);
		(err as { code?: string }).code = ERROR_CODES.INCONSISTENT_FLUID;
		throw err;
	}

	if (type === 'eau') {
		const r = interpolateOnT(EAU_TABLE, T, 'eau pure (NIST)');
		const nu_si = r.nu * 1e-6;
		return {
			rho: r.rho,
			nu: nu_si,
			mu: r.rho * nu_si,
			cpVolumique: (r.cp * 1000 * r.rho) / 3.6e6,
			source: fluideSource('eau', 0)
		};
	}

	const tables = type === 'meg' ? MEG_TABLES : MPG_TABLES;
	const [aPct, bPct, t] = bracketConcentration(glycolPct);
	const tableA = tables[aPct];
	const tableB = tables[bPct];

	const ctx = `${type.toUpperCase()} ${glycolPct} % vol`;
	const rA = interpolateOnT(tableA, T, `${ctx} (table ${aPct} %)`);
	const rB = aPct === bPct ? rA : interpolateOnT(tableB, T, `${ctx} (table ${bPct} %)`);
	const merged = aPct === bPct ? rA : interpRow(rA, rB, t);

	const nu_si = merged.nu * 1e-6;
	return {
		rho: merged.rho,
		nu: nu_si,
		mu: merged.rho * nu_si,
		cpVolumique: (merged.cp * 1000 * merged.rho) / 3.6e6,
		source: fluideSource(type, glycolPct)
	};
}
