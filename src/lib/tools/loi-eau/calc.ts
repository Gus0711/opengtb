/**
 * Calcul de la température de départ selon la loi d'eau.
 *
 * Formule (forme « pivot ») utilisée par la plupart des régulateurs
 * climatiques : Siemens RVL, Honeywell Smile, Vaillant ATMOS,
 * Viessmann Vitotronic, Belimo Energy Valve, etc.
 *
 *   T_départ = T_pivot + pente × (T_pivot − T_ext) + parallèle
 *
 * - T_pivot : température d'ambiance souhaitée (typ. 20 °C). Au-dessus
 *   de cette T° extérieure, la chauffe est inutile (= T_départ tend
 *   vers T_pivot).
 * - pente : coefficient de proportionnalité (sans unité). Plus elle
 *   est élevée, plus T_départ augmente vite quand il fait froid.
 * - parallèle : offset vertical (°C) translatant toute la courbe sans
 *   en changer la pente.
 *
 * Bornes T_min / T_max appliquées en post-traitement (clamping).
 */

import type { LoiEauParams } from './types';

/**
 * Calcule la température de départ pour une T° extérieure donnée.
 */
export function tDeparture(tExt: number, params: LoiEauParams): number {
	const raw = params.tPivot + params.pente * (params.tPivot - tExt) + params.parallele;
	return Math.min(params.tMax, Math.max(params.tMin, raw));
}

/**
 * Version sans clamping — utile pour visualiser la courbe brute.
 */
export function tDepartureRaw(tExt: number, params: LoiEauParams): number {
	return params.tPivot + params.pente * (params.tPivot - tExt) + params.parallele;
}

/**
 * Échantillonne la courbe sur une plage de T° extérieures.
 * Retourne deux tableaux parallèles (xs, ys) pour le tracé SVG.
 */
export function sampleCurve(
	params: LoiEauParams,
	tExtMin: number,
	tExtMax: number,
	steps = 80
): { xs: number[]; ys: number[]; ysRaw: number[] } {
	const xs: number[] = new Array(steps + 1);
	const ys: number[] = new Array(steps + 1);
	const ysRaw: number[] = new Array(steps + 1);
	for (let i = 0; i <= steps; i++) {
		const t = tExtMin + ((tExtMax - tExtMin) * i) / steps;
		xs[i] = t;
		ys[i] = tDeparture(t, params);
		ysRaw[i] = tDepartureRaw(t, params);
	}
	return { xs, ys, ysRaw };
}

/**
 * Retourne la T° extérieure à laquelle la courbe entre en clamping
 * (atteint T_max ou T_min), ou null si jamais.
 */
export function clampPoints(params: LoiEauParams): {
	tExtAtMax: number | null;
	tExtAtMin: number | null;
} {
	if (params.pente <= 0) return { tExtAtMax: null, tExtAtMin: null };
	// T_max atteint quand raw == T_max :
	//   T_pivot + pente × (T_pivot − T_ext) + parallele = T_max
	//   T_ext = T_pivot − (T_max − T_pivot − parallele) / pente
	const tExtAtMax =
		params.tPivot - (params.tMax - params.tPivot - params.parallele) / params.pente;
	const tExtAtMin =
		params.tPivot - (params.tMin - params.tPivot - params.parallele) / params.pente;
	return { tExtAtMax, tExtAtMin };
}
