/**
 * Dimensionnement V3V — calculs purs.
 *
 * Références normatives et techniques :
 *   - NF EN 60534-2-1 / IEC 60534-2-1 : équations Kv pour liquides en régime
 *     turbulent non cavitant.
 *   - NF E29-312 : définition du coefficient Kv.
 *   - Siemens CA1N4023F, Caleffi 6370, ABCclim, XPair / ADEGEB : règles de
 *     sélection Kvs et plages d'autorité.
 *
 * Hypothèses :
 *   - Régime turbulent (Re > 10 000) — pas de correction Reynolds.
 *   - Pas de calcul de cavitation IEC 60534-2 complet (FL non saisi).
 *   - Coefficient volumique 1.163 kWh/(m³·K) pour l'eau pure (valeur 20 °C ; à
 *     70 °C le coefficient réel est ≈ 1.137 mais 1.163 reste la convention CVC).
 */

import {
	COEF_VOL_EAU,
	CP_EAU,
	DN_KVS_RANGES,
	DN_LIST,
	KVS_SERIES,
	MEG_TABLE,
	MPG_TABLE,
	RHO_EAU
} from './constants';
import type { Alternative, FluidId, V3VInputs, V3VResult, Verdict } from './types';

interface FluidProps {
	cp: number;
	rho: number;
	coefVolumique: number;
}

function interpolate(
	table: ReadonlyArray<readonly [number, number, number]>,
	x: number
): { cp: number; rho: number } {
	if (x <= table[0][0]) return { cp: table[0][1], rho: table[0][2] };
	const last = table[table.length - 1];
	if (x >= last[0]) return { cp: last[1], rho: last[2] };
	for (let i = 0; i < table.length - 1; i++) {
		const [x0, cp0, rho0] = table[i];
		const [x1, cp1, rho1] = table[i + 1];
		if (x >= x0 && x <= x1) {
			const t = (x - x0) / (x1 - x0);
			return { cp: cp0 + (cp1 - cp0) * t, rho: rho0 + (rho1 - rho0) * t };
		}
	}
	return { cp: table[0][1], rho: table[0][2] };
}

/**
 * Propriétés thermo-physiques du fluide caloporteur.
 *
 * @returns cp [J/(kg·K)], ρ [kg/m³], coefVolumique = cp·ρ/3.6e6 [kWh/(m³·K)]
 */
export function proprietesFluide(fluide: FluidId, glycolPct = 0): FluidProps {
	let cp: number;
	let rho: number;
	if (fluide === 'eau') {
		cp = CP_EAU;
		rho = RHO_EAU;
	} else if (fluide === 'meg') {
		({ cp, rho } = interpolate(MEG_TABLE, glycolPct));
	} else {
		({ cp, rho } = interpolate(MPG_TABLE, glycolPct));
	}
	// Pour l'eau pure on retourne exactement 1.163 (convention CVC) plutôt que
	// 1.16278 (valeur calculée), afin de coller aux abaques.
	const coefVolumique =
		fluide === 'eau' && glycolPct === 0 ? COEF_VOL_EAU : (cp * rho) / 3.6e6;
	return { cp, rho, coefVolumique };
}

/**
 * Débit volumique à partir d'une puissance thermique et d'un écart de température.
 *
 * Q [m³/h] = P [kW] / (coefVolumique · ΔT [K])
 *
 * Pour l'eau pure, coefVolumique = 1.163 kWh/(m³·K).
 */
export function calculerDebit(P_kW: number, deltaT_K: number, coefVolumique: number): number {
	if (deltaT_K <= 0) throw new Error('ΔT doit être strictement positif');
	if (coefVolumique <= 0) throw new Error('Coefficient volumique doit être strictement positif');
	return P_kW / (coefVolumique * deltaT_K);
}

export function calculerPuissance(Q_m3h: number, deltaT_K: number, coefVolumique: number): number {
	return Q_m3h * coefVolumique * deltaT_K;
}

export function calculerDeltaT(P_kW: number, Q_m3h: number, coefVolumique: number): number {
	if (Q_m3h <= 0) throw new Error('Q doit être strictement positif');
	return P_kW / (Q_m3h * coefVolumique);
}

/**
 * Coefficient Kv requis (NF EN 60534-2-1, liquides en régime turbulent).
 *
 *   Kv = Q · √(ρ/ρ₀) / √(ΔPv)         avec ρ₀ = 1000 kg/m³, ΔPv en bar
 *
 * Pour l'eau (ρ = 1000), simplification : Kv = Q / √(ΔPv).
 */
export function calculerKv(Q_m3h: number, dPv_bar: number, rho_kgm3 = 1000): number {
	if (dPv_bar <= 0) throw new Error('ΔPv doit être strictement positif');
	return (Q_m3h * Math.sqrt(rho_kgm3 / 1000)) / Math.sqrt(dPv_bar);
}

/**
 * ΔPv réelle induite par un Kvs catalogue donné, sous le débit nominal.
 *
 *   ΔPv [bar] = (Q · √(ρ/ρ₀))² / Kvs² = (Q² · ρ/ρ₀) / Kvs²
 */
export function calculerDpvReelle(Q_m3h: number, kvs: number, rho_kgm3 = 1000): number {
	if (kvs <= 0) throw new Error('Kvs doit être strictement positif');
	return (Q_m3h * Q_m3h * (rho_kgm3 / 1000)) / (kvs * kvs);
}

/**
 * Autorité d'une vanne : a = ΔPv₁₀₀ / (ΔPv₁₀₀ + ΔPr).
 * Les deux pertes de charge doivent être exprimées dans la même unité.
 */
export function calculerAutorite(dpvReelle: number, dPr: number): number {
	const denom = dpvReelle + dPr;
	if (denom <= 0) throw new Error('ΔPv + ΔPr doit être strictement positif');
	return dpvReelle / denom;
}

/**
 * ΔPv cible pour atteindre une autorité visée :
 *   ΔPv = a_cible · ΔPr / (1 − a_cible)
 *
 * Quand a_cible = 0.5 on retrouve la règle de l'art : ΔPv = ΔPr.
 */
export function dpvCible(autoriteCible: number, dPr: number): number {
	if (autoriteCible <= 0 || autoriteCible >= 1) {
		throw new Error('Autorité cible doit être dans ]0 ; 1[');
	}
	return (autoriteCible * dPr) / (1 - autoriteCible);
}

/**
 * Cherche dans la série Kvs normalisée la valeur immédiatement inférieure ou
 * égale à `kvTheorique` (politique "autorité-first" : on ne surdimensionne jamais).
 *
 * Si `kvTheorique` < min(série), retourne le plus petit Kvs disponible.
 */
export function selectKvs(
	kvTheorique: number
): { retenu: number; inferieur: number; superieur: number; index: number } {
	let idx = 0;
	for (let i = KVS_SERIES.length - 1; i >= 0; i--) {
		if (KVS_SERIES[i] <= kvTheorique) {
			idx = i;
			break;
		}
	}
	if (kvTheorique < KVS_SERIES[0]) idx = 0;

	const retenu = KVS_SERIES[idx];
	const inferieur = idx > 0 ? KVS_SERIES[idx - 1] : KVS_SERIES[0];
	const superieur =
		idx < KVS_SERIES.length - 1 ? KVS_SERIES[idx + 1] : KVS_SERIES[KVS_SERIES.length - 1];
	return { retenu, inferieur, superieur, index: idx };
}

/**
 * Plage de DN compatibles avec un Kvs donné, d'après les catalogues constructeurs
 * agrégés. Retourne null si aucun DN standard ne couvre ce Kvs.
 */
export function plageDN(kvs: number): [number, number] | null {
	const compatibles: number[] = [];
	for (const [dnStr, range] of Object.entries(DN_KVS_RANGES)) {
		const [min, max] = range;
		if (kvs >= min && kvs <= max) compatibles.push(Number(dnStr));
	}
	if (compatibles.length === 0) return null;
	return [Math.min(...compatibles), Math.max(...compatibles)];
}

/**
 * Évalue un verdict qualitatif sur l'autorité d'après les plages classiques
 * (Siemens / Caleffi / ABCclim) :
 *   a < 0.25         → rejet (pompage, instabilité)
 *   0.25 ≤ a < 0.50  → limite (régulation médiocre)
 *   0.50 ≤ a ≤ 0.70  → optimal
 *   0.70 < a < 0.90  → acceptable (sur-HMT pompe, usure)
 *   a ≥ 0.90         → rejet pratique
 */
export function verdictAutorite(a: number): { verdict: Verdict; justification: string } {
	const f = a.toFixed(2);
	if (a < 0.25)
		return {
			verdict: 'rejete',
			justification: `Autorité ${f} < 0.25 : risque de pompage et d'instabilité de régulation.`
		};
	if (a < 0.5)
		return {
			verdict: 'limite',
			justification: `Autorité ${f} dans [0.25 ; 0.50[ : régulation médiocre, à éviter sur boucle critique.`
		};
	if (a <= 0.7)
		return {
			verdict: 'optimal',
			justification: `Autorité ${f} dans [0.50 ; 0.70] : plage cible.`
		};
	if (a < 0.9)
		return {
			verdict: 'acceptable',
			justification: `Autorité ${f} > 0.70 : surdimensionnement HMT pompe et usure prématurée possibles.`
		};
	return {
		verdict: 'rejete',
		justification: `Autorité ${f} → 1 : vanne quasi-inopérante sur la plage utile.`
	};
}

function makeAlternative(kvs: number, Q_m3h: number, dPr_bar: number, rho: number): Alternative {
	const dpv = calculerDpvReelle(Q_m3h, kvs, rho);
	const a = calculerAutorite(dpv, dPr_bar);
	const { verdict } = verdictAutorite(a);
	return { kvs, dpv_kPa: dpv * 100, autorite: a, verdict };
}

/**
 * Orchestrateur principal : à partir des entrées utilisateur, complète la
 * triade P/Q/ΔT, dimensionne, sélectionne le Kvs catalogue, et produit le
 * verdict d'autorité + alternatives + warnings.
 *
 * Lève une Error explicite (pas de NaN silencieux) en cas d'entrée manquante
 * ou de configuration invalide.
 */
export function dimensionnerV3V(inputs: V3VInputs): V3VResult {
	const {
		fluide,
		glycolPct = 0,
		autoriteCible,
		dpr,
		temperature,
		dpvMax,
		dnTuyauterie
	} = inputs;
	let { puissance, debit, deltaT } = inputs;

	if (fluide === 'eau' && glycolPct > 0) {
		throw new Error("Concentration glycol > 0 incompatible avec fluide 'eau'.");
	}
	if (dpr <= 0) throw new Error('ΔPr doit être strictement positif (division par zéro évitée).');
	if (autoriteCible <= 0 || autoriteCible >= 1) {
		throw new Error('Autorité cible doit être dans ]0 ; 1[.');
	}

	const props = proprietesFluide(fluide, glycolPct);
	const warnings: string[] = [];

	// Complétion de la triade P / Q / ΔT
	const has = (v: number | undefined) => v !== undefined && Number.isFinite(v);
	const hP = has(puissance);
	const hQ = has(debit);
	const hDT = has(deltaT);
	let debitCalculDepuisP = false;
	let puissanceCalculee: number | undefined;
	let deltaTCalcule: number | undefined;

	if (!hDT) {
		// ΔT manque → si on a P et Q on calcule ΔT, sinon erreur
		if (hP && hQ) {
			deltaT = calculerDeltaT(puissance!, debit!, props.coefVolumique);
			deltaTCalcule = deltaT;
		} else {
			throw new Error('ΔT manquant : saisir au moins deux valeurs parmi P, Q, ΔT.');
		}
	}

	if (!hQ) {
		if (!hP) {
			throw new Error('Saisir au moins deux valeurs parmi P, Q, ΔT.');
		}
		debit = calculerDebit(puissance!, deltaT!, props.coefVolumique);
		debitCalculDepuisP = true;
	} else if (!hP) {
		puissance = calculerPuissance(debit!, deltaT!, props.coefVolumique);
		puissanceCalculee = puissance;
	} else if (hP && hQ && hDT) {
		// Triple saisie → cohérence
		const Q_calc = calculerDebit(puissance!, deltaT!, props.coefVolumique);
		const ecart = Math.abs(debit! - Q_calc) / Q_calc;
		if (ecart > 0.05) {
			warnings.push(
				`Incohérence P/Q/ΔT (${(ecart * 100).toFixed(1)} %) : Q saisi ${debit!.toFixed(3)} m³/h vs Q calculé ${Q_calc.toFixed(3)} m³/h. La saisie Q est conservée.`
			);
		}
	}

	const Q = debit!;
	const dPr_bar = dpr / 100;

	// ΔPv cible pour atteindre l'autorité visée
	const dpvCible_bar = dpvCible(autoriteCible, dPr_bar);

	// Kv théorique requis
	const kvTheorique = calculerKv(Q, dpvCible_bar, props.rho);

	// Sélection Kvs catalogue
	const { retenu, inferieur, superieur } = selectKvs(kvTheorique);

	// ΔPv et autorité réelles avec le Kvs retenu
	const dpvReelle_bar = calculerDpvReelle(Q, retenu, props.rho);
	const dpvReelle_kPa = dpvReelle_bar * 100;
	const autoriteReelle = calculerAutorite(dpvReelle_bar, dPr_bar);
	const { verdict, justification } = verdictAutorite(autoriteReelle);

	// Alternatives encadrantes
	const alternatives: Alternative[] = [];
	if (inferieur !== retenu) alternatives.push(makeAlternative(inferieur, Q, dPr_bar, props.rho));
	if (superieur !== retenu) alternatives.push(makeAlternative(superieur, Q, dPr_bar, props.rho));

	// Plage DN
	const plage = plageDN(retenu);

	// Warnings métier
	if (dpr < 1) {
		warnings.push(
			`ΔPr saisi très faible (${dpr.toFixed(2)} kPa) : circuit peu résistant — autorité par construction élevée, vérifier la saisie.`
		);
	}
	if (dpr > 100) {
		warnings.push(
			`ΔPr saisi très élevé (${dpr.toFixed(1)} kPa) : circuit très résistant, vérifier la saisie.`
		);
	}
	if (dpvMax !== undefined && dpvReelle_kPa > dpvMax) {
		warnings.push(
			`ΔPv réelle ${dpvReelle_kPa.toFixed(2)} kPa > ΔPv max admissible ${dpvMax.toFixed(2)} kPa : risque cavitation / bruit hydraulique.`
		);
	}
	if (dpvReelle_bar > 1 && temperature > 100) {
		warnings.push(
			`ΔPv ${dpvReelle_bar.toFixed(2)} bar > 1 bar et T° fluide ${temperature} °C > 100 °C : risque de cavitation ; vérifier FL (facteur de récupération) et Pv saturante.`
		);
	}
	if (dnTuyauterie !== undefined && plage) {
		const minDN = plage[0];
		const idxTuyau = DN_LIST.indexOf(dnTuyauterie as (typeof DN_LIST)[number]);
		const idxVanne = DN_LIST.indexOf(minDN as (typeof DN_LIST)[number]);
		if (idxTuyau >= 0 && idxVanne >= 0 && idxTuyau - idxVanne >= 2) {
			warnings.push(
				`DN vanne (≥ ${minDN}) plus de 2 crans en dessous du DN tuyauterie ${dnTuyauterie} : sous-dimensionnement à arbitrer.`
			);
		}
	}
	if (fluide !== 'eau' && glycolPct > 0) {
		warnings.push(
			`Fluide glycolé (${fluide.toUpperCase()} ${glycolPct} %) : cp et ρ corrigés ; vérifier la compatibilité matériaux et la viscosité (régime turbulent supposé).`
		);
	}

	const formuleQ =
		fluide === 'eau' && glycolPct === 0
			? 'Q [m³/h] = P [kW] / (1.163 · ΔT [K])'
			: `Q [m³/h] = P [kW] / (${props.coefVolumique.toFixed(3)} · ΔT [K])`;

	return {
		debitCalcule: Q,
		debitCalculDepuisP,
		puissanceCalculee,
		deltaTCalcule,
		kvTheorique,
		kvsRetenu: retenu,
		kvsInferieur: inferieur,
		kvsSuperieur: superieur,
		plageDN: plage,
		dpvReelle_kPa,
		dpvReelle_bar,
		autoriteReelle,
		verdict,
		justification,
		alternatives,
		warnings,
		hypotheses: {
			cp: props.cp,
			rho: props.rho,
			coefVolumique: props.coefVolumique,
			formule: formuleQ
		}
	};
}
