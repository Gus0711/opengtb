/**
 * Conversions d'unités hydrauliques.
 *
 * Convention :
 *   1 mCE = ρ_eau · g · 1 m = 1000 · 9.80665 = 9806.65 Pa exactement
 *   (cohérent avec g = 9.80665 m/s² défini dans `constants.ts`).
 *
 * Pour un fluide ≠ eau pure, la conversion Pa ↔ mCE utilise ρ_eau (1000) pour
 * rester aligné sur la convention industrielle : "1 mètre de colonne d'eau"
 * est une unité d'énergie hydraulique exprimée en hauteur d'eau pure, pas
 * dépendante du fluide véhiculé. La fonction `dpToHauteurFluide` permet
 * d'obtenir la hauteur exprimée dans le fluide réel si besoin.
 */

import { G, PA_PAR_MCE, PA_PAR_BAR, SEC_PAR_HEURE } from './constants';

export function dpToKPa(Pa: number): number {
	return Pa / 1000;
}

export function dpToBar(Pa: number): number {
	return Pa / PA_PAR_BAR;
}

/**
 * Convertit une pression [Pa] en mètres de colonne d'eau (référence
 * industrielle, ρ_eau = 1000).
 */
export function dpToMCE(Pa: number): number {
	return Pa / PA_PAR_MCE;
}

/**
 * Hauteur exprimée dans le fluide réel (si on veut comparer une HMT à une
 * cote géométrique d'un circuit ouvert au glycol par exemple) :
 *   h [m] = ΔP / (ρ_fluide · g)
 */
export function dpToHauteurFluide(Pa: number, rho_kgm3: number): number {
	if (rho_kgm3 <= 0) throw new Error('ρ doit être strictement positif.');
	return Pa / (rho_kgm3 * G);
}

/**
 * Débit volumique [m³/h] à partir d'une puissance thermique et d'un ΔT.
 *
 *   Q = P / (cp_vol · ΔT)
 *
 * `cpVolumique` est en kWh/(m³·K), calculé via `proprietesFluide(...)`.
 */
export function debitDepuisPuissance(P_kW: number, deltaT_K: number, cpVolumique: number): number {
	if (deltaT_K <= 0) throw new Error('ΔT doit être strictement positif.');
	if (cpVolumique <= 0) throw new Error('cp volumique doit être strictement positif.');
	return P_kW / (cpVolumique * deltaT_K);
}

export function m3hToM3s(Q_m3h: number): number {
	return Q_m3h / SEC_PAR_HEURE;
}

export function m3sToM3h(Q_m3s: number): number {
	return Q_m3s * SEC_PAR_HEURE;
}

/** Toutes les unités usuelles à partir d'une valeur en Pa. */
export interface AllUnits {
	Pa: number;
	kPa: number;
	mCE: number;
	bar: number;
}

export function dpAllUnits(Pa: number): AllUnits {
	return { Pa, kPa: dpToKPa(Pa), mCE: dpToMCE(Pa), bar: dpToBar(Pa) };
}

export function dpUnitsTrio(Pa: number): { Pa: number; kPa: number; mCE: number } {
	return { Pa, kPa: dpToKPa(Pa), mCE: dpToMCE(Pa) };
}
