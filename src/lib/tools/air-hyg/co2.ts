/**
 * CO₂ à l'équilibre — bilan massique stationnaire.
 *
 * Source : NF EN 16798-1:2019, Annexe C, équation (C.1) :
 *
 *   C_eq [ppm] = C_ext [ppm] + (G_CO₂ [L/h/occ] × N) / Q [m³/h] × 1000
 *
 * (le facteur 1000 convertit L → m³ pour exprimer la concentration ajoutée en
 *  ppm volumique).
 *
 * Hypothèse : régime stationnaire, mélange parfait, N constant, Q = débit d'air
 * neuf total entrant dans le local (m³/h).
 */

import { CO2_EXTERIEUR_DEFAUT_PPM } from './constants';

/**
 * Concentration de CO₂ à l'équilibre dans un local.
 *
 * @param N        Nombre d'occupants
 * @param Q_m3h    Débit d'air neuf entrant (m³/h)
 * @param G_CO2_lh Émission de CO₂ par occupant (L/h)
 * @param C_ext_ppm Concentration de CO₂ extérieur (ppm), défaut 400
 */
export function calculerCO2Equilibre(
	N: number,
	Q_m3h: number,
	G_CO2_lh: number,
	C_ext_ppm = CO2_EXTERIEUR_DEFAUT_PPM
): number {
	if (Q_m3h <= 0) return Infinity;
	if (N <= 0 || G_CO2_lh <= 0) return C_ext_ppm;
	return C_ext_ppm + (G_CO2_lh * N * 1000) / Q_m3h;
}

/**
 * Émission CO₂ totale d'une liste d'occupants (L/h) — somme pondérée par
 * effectifs et émissions individuelles.
 */
export function emissionCO2Totale_lh(
	occupants: ReadonlyArray<{ nb: number; G_lh: number }>
): number {
	let total = 0;
	for (const o of occupants) total += o.nb * o.G_lh;
	return total;
}

/**
 * CO₂ équilibre à partir d'une liste hétérogène d'occupants (adultes / enfants
 * à activités différentes). La masse totale de CO₂ produite (L/h) est divisée
 * par le débit total ; les profils différents se cumulent linéairement.
 */
export function calculerCO2EquilibreMixte(
	occupants: ReadonlyArray<{ nb: number; G_lh: number }>,
	Q_m3h: number,
	C_ext_ppm = CO2_EXTERIEUR_DEFAUT_PPM
): number {
	if (Q_m3h <= 0) return Infinity;
	const G_tot = emissionCO2Totale_lh(occupants);
	if (G_tot <= 0) return C_ext_ppm;
	return C_ext_ppm + (G_tot * 1000) / Q_m3h;
}
