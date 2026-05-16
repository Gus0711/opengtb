/**
 * Recommandation de pente et parallèle à partir des paramètres
 * bâtiment + émetteur + zone climatique.
 *
 * Principe (DTU 65.11 + manuels constructeurs Siemens/Honeywell) :
 *
 * 1. Au point de dimensionnement (T_ext = T_ext_base), la T° de départ
 *    doit atteindre le régime nominal de l'émetteur :
 *
 *       T_départ_nominal = T_pivot + pente × (T_pivot − T_ext_base)
 *
 *    d'où :
 *
 *       pente_nominale = (T_départ_nominal − T_pivot) / (T_pivot − T_ext_base)
 *
 * 2. Cette pente est valide pour un bâtiment dont l'émetteur a été
 *    dimensionné « sur mesure ». Si le bâtiment est plus isolé qu'à
 *    l'origine (Ubât plus faible), le besoin en T° de départ est
 *    moindre → on minore la pente proportionnellement au rapport
 *    Ubât_réel / Ubât_de_référence.
 *
 *    Ubât_de_référence est la valeur typique de la période où
 *    l'émetteur a été dimensionné — par défaut on prend la valeur
 *    centrale de la période RT 1988 (~0.85) comme « bâti type sur
 *    lequel l'émetteur a été choisi à l'époque ».
 *
 *    Cette correction reste un ordre de grandeur ; un calcul exact
 *    demande la puissance émetteur réelle vs déperditions exactes.
 *
 * 3. Parallèle recommandé : 0 par défaut. Sert d'offset pour les
 *    réglages fins (ressenti utilisateur), pas pour rattraper un
 *    sous-dimensionnement émetteur — dans ce cas, c'est la pente
 *    qu'il faut revoir.
 */

import { getEmitter, getZone } from './data';
import type { EmitterId, ClimateZoneId, LoiEauParams } from './types';

const UBAT_REFERENCE = 0.85;
const UBAT_MIN_FACTOR = 0.5;
const UBAT_MAX_FACTOR = 1.4;

export interface RecommendInputs {
	emitter: EmitterId;
	zone: ClimateZoneId;
	tPivot: number;
	ubat: number;
}

export function recommend(inputs: RecommendInputs): LoiEauParams {
	const emitter = getEmitter(inputs.emitter);
	const zone = getZone(inputs.zone);
	if (!emitter || !zone) {
		return {
			pente: 1.0,
			parallele: 0,
			tMin: 25,
			tMax: 75,
			tPivot: inputs.tPivot
		};
	}

	const tBase = zone.baseTemp;
	const tDepNominal = emitter.regime.departure;
	const delta = inputs.tPivot - tBase;

	// Si pivot est sous T_ext_base (cas absurde, zone très douce et
	// consigne basse) → pente plancher pour éviter division par zéro.
	if (delta <= 0) {
		return {
			pente: 0.5,
			parallele: 0,
			tMin: emitter.defaultMinT,
			tMax: emitter.defaultMaxT,
			tPivot: inputs.tPivot
		};
	}

	const penteNominale = (tDepNominal - inputs.tPivot) / delta;

	const factor = clamp(inputs.ubat / UBAT_REFERENCE, UBAT_MIN_FACTOR, UBAT_MAX_FACTOR);
	const pente = round1(penteNominale * factor);

	return {
		pente,
		parallele: 0,
		tMin: emitter.defaultMinT,
		tMax: emitter.defaultMaxT,
		tPivot: inputs.tPivot
	};
}

/**
 * Sélectionne le Ubât effectif depuis les inputs bâtiment, dans
 * l'ordre de priorité : ubat saisi > année (avec rénovation) >
 * fourchette qualitative > fallback (0.85).
 */
export function effectiveUbat(args: {
	ubat?: number;
	periodUbat?: number;
	isolationUbat?: number;
}): number {
	if (args.ubat !== undefined && Number.isFinite(args.ubat) && args.ubat > 0) {
		return args.ubat;
	}
	if (args.periodUbat !== undefined) return args.periodUbat;
	if (args.isolationUbat !== undefined) return args.isolationUbat;
	return UBAT_REFERENCE;
}

function clamp(v: number, lo: number, hi: number): number {
	return Math.min(hi, Math.max(lo, v));
}

function round1(v: number): number {
	return Math.round(v * 10) / 10;
}
