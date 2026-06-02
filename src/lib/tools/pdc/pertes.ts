/**
 * Calcul des pertes de charge linéiques, singulières, vannes Kvs et
 * équipements terminaux à ΔP fabricant.
 *
 * Références :
 *   - NF EN 805 — Darcy-Weisbach.
 *   - NF EN 60534-2-1 — équations Kv pour vannes (régime turbulent non
 *     cavitant, ρ₀ = 1000 kg/m³).
 *   - Idel'cik, *Mémento des pertes de charge* — formule de Borda pour
 *     élargissement brusque.
 */

import {
	EQUIPEMENT_DP_Q_MAX_RATIO,
	EQUIPEMENT_DP_Q_MIN_RATIO,
	WARNING_CODES
} from './constants';
import type { Warning } from './types';

/**
 * Perte de charge linéique d'une conduite circulaire (Darcy-Weisbach).
 *
 *   ΔP_lin = λ · (1/D) · ρ · V² / 2          [Pa/m]
 *
 * D doit être en mètres, V en m/s, ρ en kg/m³.
 */
export function pdcLineiquePaParM(lambda: number, D_m: number, V_ms: number, rho_kgm3: number): number {
	if (D_m <= 0) throw new Error('D doit être strictement positif (m).');
	return (lambda * rho_kgm3 * V_ms * V_ms) / (2 * D_m);
}

/**
 * Perte de charge linéique totale d'un tronçon.
 *
 *   ΔP_tot = ΔP/m · L                         [Pa]
 */
export function pdcLineique(lambda: number, D_m: number, L_m: number, V_ms: number, rho_kgm3: number): number {
	return pdcLineiquePaParM(lambda, D_m, V_ms, rho_kgm3) * L_m;
}

/**
 * Perte de charge singulière d'un accessoire :
 *
 *   ΔP_sing = ζ · ρ · V² / 2                  [Pa]
 *
 * Par convention, V est la vitesse dans le tronçon où l'accessoire est posé.
 */
export function pdcSinguliere(zeta: number, V_ms: number, rho_kgm3: number): number {
	return (zeta * rho_kgm3 * V_ms * V_ms) / 2;
}

/**
 * Coefficient ζ équivalent d'une vanne caractérisée par son Kvs (NF EN
 * 60534-2-1, ρ₀ = 1000 kg/m³).
 *
 *   ΔP [bar] = (Q [m³/h] / Kvs)² · (ρ / ρ₀)
 *
 * On exprime ce ΔP et on en déduit le ζ équivalent à la section du tronçon
 * de pose pour cohérence d'agrégation.
 *
 *   ζ_eq = ΔP · 2 / (ρ · V²)
 */
export function zetaFromKvs(
	Kvs_m3h: number,
	Q_m3h: number,
	rho_kgm3: number,
	V_ms: number
): { zeta: number; dpPa: number } {
	if (Kvs_m3h <= 0) throw new Error('Kvs doit être strictement positif.');
	const dpBar = ((Q_m3h * Q_m3h) / (Kvs_m3h * Kvs_m3h)) * (rho_kgm3 / 1000);
	const dpPa = dpBar * 100_000;
	const denom = rho_kgm3 * V_ms * V_ms;
	const zeta = denom > 0 ? (dpPa * 2) / denom : 0;
	return { zeta, dpPa };
}

/**
 * Perte de charge d'un équipement terminal donné par un couple
 * (ΔP_nominal, Q_nominal). Loi parabolique :
 *
 *   ΔP_réel = ΔP_nom · (Q / Q_nom)²
 *
 * Valide en régime turbulent dominé par les pertes singulières (cas usuel
 * radiateurs, batteries CTA, échangeurs PAC, ballons). Plage de validité
 * Q ∈ [0.3 · Q_nom ; 2 · Q_nom], au-delà → warning.
 *
 * @returns dpPa et un warning éventuel (extrapolation).
 */
export function dpEquipement(
	dpNominaleKpa: number,
	debitNominalM3h: number,
	debitReelM3h: number,
	tronconId: string | null = null,
	libelle: string | null = null
): { dpPa: number; warning: Warning | null } {
	if (dpNominaleKpa <= 0) throw new Error('ΔP_nominale doit être strictement positive (kPa).');
	if (debitNominalM3h <= 0) throw new Error('Q_nominal doit être strictement positif (m³/h).');
	const ratio = debitReelM3h / debitNominalM3h;
	const dpReelKpa = dpNominaleKpa * ratio * ratio;
	const dpPa = dpReelKpa * 1000;
	let warning: Warning | null = null;
	if (ratio < EQUIPEMENT_DP_Q_MIN_RATIO || ratio > EQUIPEMENT_DP_Q_MAX_RATIO) {
		const tag = libelle ? `« ${libelle} »` : 'Équipement';
		warning = {
			code: WARNING_CODES.EXTRAPOLATION_EQUIPEMENT,
			niveau: 'warning',
			message:
				`${tag} : Q réel = ${debitReelM3h.toFixed(2)} m³/h ` +
				`hors plage de validité [${EQUIPEMENT_DP_Q_MIN_RATIO} · Q_nom ; ${EQUIPEMENT_DP_Q_MAX_RATIO} · Q_nom] = ` +
				`[${(EQUIPEMENT_DP_Q_MIN_RATIO * debitNominalM3h).toFixed(2)} ; ${(EQUIPEMENT_DP_Q_MAX_RATIO * debitNominalM3h).toFixed(2)}] m³/h. ` +
				`ΔP extrapolé : ${dpReelKpa.toFixed(2)} kPa.`,
			troncon: tronconId,
			valeur: ratio,
			seuil:
				ratio < EQUIPEMENT_DP_Q_MIN_RATIO
					? EQUIPEMENT_DP_Q_MIN_RATIO
					: EQUIPEMENT_DP_Q_MAX_RATIO
		};
	}
	return { dpPa, warning };
}

/**
 * Formule de Borda pour un élargissement brusque :
 *
 *   ζ = (1 - S₁ / S₂)²
 *
 * où S₁ est la section amont (petit ⌀) et S₂ la section aval (gros ⌀).
 * Référence : Idel'cik § 4-1.
 */
export function zetaBorda(s1OverS2: number): number {
	if (s1OverS2 < 0 || s1OverS2 > 1) {
		throw new Error('Ratio S₁/S₂ doit être dans [0 ; 1].');
	}
	const x = 1 - s1OverS2;
	return x * x;
}
