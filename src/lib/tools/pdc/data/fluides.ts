/**
 * Tables de propriétés des fluides caloporteurs : eau pure, eau + MEG
 * (mono-éthylène glycol), eau + MPG (mono-propylène glycol).
 *
 * Pour chaque mélange à concentration donnée, on tabule la masse volumique ρ
 * [kg/m³] et la viscosité cinématique ν [m²/s · 10⁻⁶] en fonction de la
 * température [°C].
 *
 * Sources principales :
 *   - Eau pure :  NIST Webbook (IAPWS-IF97), v. 2024.
 *   - MEG :       Clariant *Antifrogen N — Product Information*,
 *                 MEGlobal *Ethylene Glycol Product Guide* (édition 2018),
 *                 DOW *Engineering and Operating Guide for DOWTHERM SR-1*.
 *   - MPG :       DOW *Engineering and Operating Guide for DOWFROST*
 *                 (édition 2018), DOW *Propylene Glycol — Properties of
 *                 aqueous solutions*, ASHRAE Handbook Fundamentals 2021 ch. 31
 *                 "Physical Properties of Secondary Coolants".
 *
 * **Aucune extrapolation hors table** : `proprietesFluide` throw si T sort
 * de l'intervalle.
 *
 * Pour ν : valeurs en 10⁻⁶ m²/s ( = mm²/s = cSt) afin de garder une lecture
 * humaine ; conversion en m²/s faite par `fluide.ts` (multiplication par
 * 1e-6).
 */

import type { FluidId } from '../types';

export interface FluidRow {
	/** °C */
	T: number;
	/** kg/m³ */
	rho: number;
	/** 10⁻⁶ m²/s (cSt) */
	nu: number;
	/** kJ/(kg·K) */
	cp: number;
}

/**
 * Eau pure — table de référence NIST.
 *
 * cp : 4.186 kJ/(kg·K) à 20 °C, légère variation < 1 % sur 0-100 °C.
 */
export const EAU_TABLE: ReadonlyArray<FluidRow> = [
	{ T: 0, rho: 999.8, nu: 1.787, cp: 4.218 },
	{ T: 10, rho: 999.7, nu: 1.307, cp: 4.192 },
	{ T: 20, rho: 998.2, nu: 1.004, cp: 4.182 },
	{ T: 30, rho: 995.7, nu: 0.801, cp: 4.179 },
	{ T: 40, rho: 992.2, nu: 0.658, cp: 4.179 },
	{ T: 50, rho: 988.1, nu: 0.553, cp: 4.181 },
	{ T: 60, rho: 983.2, nu: 0.475, cp: 4.185 },
	{ T: 70, rho: 977.8, nu: 0.413, cp: 4.19 },
	{ T: 80, rho: 971.8, nu: 0.365, cp: 4.197 },
	{ T: 90, rho: 965.3, nu: 0.326, cp: 4.205 },
	{ T: 100, rho: 958.4, nu: 0.295, cp: 4.216 }
];

/**
 * Mélange eau + mono-éthylène glycol par concentration volumique.
 *
 * Sources : Clariant Antifrogen N (édition 2019, tables p. 8-10) + MEGlobal
 * Ethylene Glycol Product Guide (édition 2018, Fig. 19-22). Les valeurs cp
 * sont alignées sur ASHRAE Handbook Fundamentals 2021 ch. 31.
 *
 * Plage couverte : -10 à +80 °C pour 20-50 %, +0 à +80 °C pour 10 % (point
 * de congélation ≈ -3 °C à 10 % vol). Hors plage liquide → ligne absente.
 */
export const MEG_TABLES: Record<number, ReadonlyArray<FluidRow>> = {
	10: [
		{ T: 0, rho: 1013, nu: 1.95, cp: 4.05 },
		{ T: 20, rho: 1011, nu: 1.32, cp: 4.06 },
		{ T: 40, rho: 1005, nu: 0.90, cp: 4.08 },
		{ T: 60, rho: 996, nu: 0.66, cp: 4.10 },
		{ T: 80, rho: 985, nu: 0.50, cp: 4.13 }
	],
	20: [
		{ T: -10, rho: 1031, nu: 3.30, cp: 3.91 },
		{ T: 0, rho: 1029, nu: 2.50, cp: 3.92 },
		{ T: 20, rho: 1024, nu: 1.65, cp: 3.94 },
		{ T: 40, rho: 1016, nu: 1.13, cp: 3.97 },
		{ T: 60, rho: 1006, nu: 0.82, cp: 4.00 },
		{ T: 80, rho: 994, nu: 0.62, cp: 4.04 }
	],
	30: [
		{ T: -10, rho: 1052, nu: 6.50, cp: 3.78 },
		{ T: 0, rho: 1048, nu: 4.50, cp: 3.80 },
		{ T: 20, rho: 1041, nu: 2.60, cp: 3.83 },
		{ T: 40, rho: 1032, nu: 1.70, cp: 3.86 },
		{ T: 60, rho: 1021, nu: 1.20, cp: 3.89 },
		{ T: 80, rho: 1008, nu: 0.90, cp: 3.93 }
	],
	40: [
		{ T: -10, rho: 1066, nu: 9.50, cp: 3.62 },
		{ T: 0, rho: 1063, nu: 6.50, cp: 3.65 },
		{ T: 20, rho: 1055, nu: 3.70, cp: 3.69 },
		{ T: 40, rho: 1045, nu: 2.30, cp: 3.73 },
		{ T: 60, rho: 1033, nu: 1.60, cp: 3.77 },
		{ T: 80, rho: 1020, nu: 1.18, cp: 3.81 }
	],
	50: [
		{ T: -20, rho: 1086, nu: 22.0, cp: 3.41 },
		{ T: -10, rho: 1082, nu: 14.0, cp: 3.45 },
		{ T: 0, rho: 1078, nu: 9.50, cp: 3.48 },
		{ T: 20, rho: 1069, nu: 5.10, cp: 3.53 },
		{ T: 40, rho: 1058, nu: 3.10, cp: 3.58 },
		{ T: 60, rho: 1046, nu: 2.10, cp: 3.63 },
		{ T: 80, rho: 1032, nu: 1.50, cp: 3.68 }
	]
};

/**
 * Mélange eau + mono-propylène glycol par concentration volumique.
 *
 * ρ et ν : DOW *Engineering and Operating Guide for DOWFROST*, Form
 * 180-01286-0904 AMS, Tables 10 (densités SI) et 14 (viscosités dynamiques
 * SI). Conversion ν = μ/ρ effectuée à la source. Plages liquides définies
 * par Table 4 (freeze/burst points) — toute température sous le point de
 * congélation est exclue de la table.
 *
 * cp : valeurs lissées ASHRAE Handbook Fundamentals 2021 ch. 31 (tables 26
 * "Propylene Glycol Solutions") — granularité grossière suffisante car cp
 * varie de moins de 1 % sur les plages opérationnelles GTB.
 *
 * DOWFROST contient 3-5 % d'inhibiteurs : écart attendu vs MPG pur
 *   - ρ ≈ +0.3 à +0.7 %
 *   - ν ≈ +1 à +3 %
 * Acceptable pour calcul de pertes de charge GTB. Incertitude globale
 * recommandée : ρ ±1 %, ν ±5 % sur 0-80 °C ; ν ±10 % sous 0 °C.
 */
export const MPG_TABLES: Record<number, ReadonlyArray<FluidRow>> = {
	10: [
		// freeze point ≈ -3 °C → pas de ligne à -10 °C
		{ T: 0, rho: 1015.0, nu: 2.640, cp: 4.13 },
		{ T: 10, rho: 1012.4, nu: 1.867, cp: 4.14 },
		{ T: 20, rho: 1009.3, nu: 1.407, cp: 4.15 },
		{ T: 30, rho: 1005.7, nu: 1.104, cp: 4.16 },
		{ T: 40, rho: 1001.6, nu: 0.889, cp: 4.17 },
		{ T: 50, rho: 997.0, nu: 0.732, cp: 4.18 },
		{ T: 60, rho: 991.9, nu: 0.625, cp: 4.19 },
		{ T: 70, rho: 986.4, nu: 0.537, cp: 4.2 },
		{ T: 80, rho: 980.3, nu: 0.469, cp: 4.21 }
	],
	20: [
		// freeze point ≈ -7 °C → pas de ligne à -10 °C
		{ T: 0, rho: 1027.0, nu: 3.944, cp: 4.0 },
		{ T: 10, rho: 1023.8, nu: 2.725, cp: 4.02 },
		{ T: 20, rho: 1020.2, nu: 1.980, cp: 4.04 },
		{ T: 30, rho: 1016.0, nu: 1.496, cp: 4.06 },
		{ T: 40, rho: 1011.3, nu: 1.167, cp: 4.08 },
		{ T: 50, rho: 1006.1, nu: 0.944, cp: 4.1 },
		{ T: 60, rho: 1000.4, nu: 0.780, cp: 4.12 },
		{ T: 70, rho: 994.2, nu: 0.664, cp: 4.14 },
		{ T: 80, rho: 987.5, nu: 0.567, cp: 4.16 }
	],
	30: [
		// freeze point ≈ -12 °C → -10 °C garde une marge fine, conservé
		{ T: -10, rho: 1050.0, nu: 22.010, cp: 3.83 },
		{ T: 0, rho: 1037.4, nu: 6.815, cp: 3.86 },
		{ T: 10, rho: 1033.7, nu: 4.373, cp: 3.88 },
		{ T: 20, rho: 1029.5, nu: 2.972, cp: 3.9 },
		{ T: 30, rho: 1024.8, nu: 2.137, cp: 3.93 },
		{ T: 40, rho: 1019.6, nu: 1.599, cp: 3.95 },
		{ T: 50, rho: 1013.8, nu: 1.243, cp: 3.97 },
		{ T: 60, rho: 1007.6, nu: 1.002, cp: 4.0 },
		{ T: 70, rho: 1000.8, nu: 0.829, cp: 4.02 },
		{ T: 80, rho: 993.5, nu: 0.705, cp: 4.05 }
	],
	40: [
		// freeze point ≈ -21 °C
		{ T: -10, rho: 1058.0, nu: 32.618, cp: 3.65 },
		{ T: 0, rho: 1046.3, nu: 11.756, cp: 3.69 },
		{ T: 10, rho: 1042.1, nu: 6.919, cp: 3.71 },
		{ T: 20, rho: 1037.4, nu: 4.425, cp: 3.74 },
		{ T: 30, rho: 1032.2, nu: 3.023, cp: 3.77 },
		{ T: 40, rho: 1026.4, nu: 2.182, cp: 3.8 },
		{ T: 50, rho: 1020.2, nu: 1.647, cp: 3.83 },
		{ T: 60, rho: 1013.4, nu: 1.293, cp: 3.86 },
		{ T: 70, rho: 1006.2, nu: 1.053, cp: 3.89 },
		{ T: 80, rho: 998.4, nu: 0.881, cp: 3.92 }
	],
	50: [
		// freeze point ≈ -33 °C
		{ T: -10, rho: 1064.8, nu: 58.959, cp: 3.51 },
		{ T: 0, rho: 1053.9, nu: 17.345, cp: 3.55 },
		{ T: 10, rho: 1049.2, nu: 10.093, cp: 3.58 },
		{ T: 20, rho: 1044.0, nu: 6.341, cp: 3.62 },
		{ T: 30, rho: 1038.3, nu: 4.247, cp: 3.65 },
		{ T: 40, rho: 1032.1, nu: 3.004, cp: 3.69 },
		{ T: 50, rho: 1025.4, nu: 2.224, cp: 3.72 },
		{ T: 60, rho: 1018.2, nu: 1.719, cp: 3.76 },
		{ T: 70, rho: 1010.4, nu: 1.366, cp: 3.79 },
		{ T: 80, rho: 1002.2, nu: 1.118, cp: 3.83 }
	]
};

/** Concentrations volumiques tabulées pour MEG et MPG. */
export const GLYCOL_CONCENTRATIONS = [10, 20, 30, 40, 50] as const;
export type GlycolPct = (typeof GLYCOL_CONCENTRATIONS)[number];

/**
 * Récupère le label "source documentaire" pour traçabilité.
 */
export function fluideSource(type: FluidId, glycolPct: number): string {
	if (type === 'eau') return 'NIST IAPWS-IF97';
	if (type === 'meg') return `Clariant Antifrogen N + MEGlobal (MEG ${glycolPct} % vol)`;
	return `DOW DOWFROST + ASHRAE HoF 2021 ch. 31 (MPG ${glycolPct} % vol)`;
}
