/**
 * Validation des entrées du calcul de pertes de charge.
 *
 * Politique :
 *   - Accumule erreurs et warnings sans interrompre, pour permettre une UI
 *     qui affiche tout d'un coup.
 *   - Codes d'erreur exportés depuis `constants.ts`.
 *   - Messages français, précis, mentionnant la valeur reçue et la plage
 *     attendue.
 */

import {
	ERROR_CODES,
	MATERIAU_LABELS,
	RUGOSITE_TABLE,
	WARNING_CODES,
	type ErrorCode,
	type WarningCode
} from './constants';
import { DESIGNATIONS_PAR_MATERIAU } from './data/designations';
import type {
	Accessoire,
	Circuit,
	DiametreInput,
	ErrorEntry,
	LambdaMethod,
	Troncon,
	Warning
} from './types';

const METHODES_VALIDES: LambdaMethod[] = ['serghides', 'colebrook', 'haaland'];

export interface ValidationOutcome {
	valid: boolean;
	errors: ErrorEntry[];
	warnings: Warning[];
}

const mkError = (
	code: ErrorCode,
	message: string,
	troncon: string | null = null,
	valeur: number | null = null,
	seuil: number | null = null
): ErrorEntry => ({ code, niveau: 'error', message, troncon, valeur, seuil });

const mkWarning = (
	code: WarningCode,
	message: string,
	troncon: string | null = null,
	valeur: number | null = null,
	seuil: number | null = null
): Warning => ({ code, niveau: 'warning', message, troncon, valeur, seuil });

/* ============================================================ */
/*  Sous-validateurs                                              */
/* ============================================================ */

function validerFluide(circuit: Circuit, errors: ErrorEntry[]): void {
	const { fluide } = circuit;
	const T = fluide.temperature;
	if (!Number.isFinite(T) || T < -40 || T > 200) {
		errors.push(
			mkError(
				ERROR_CODES.TEMPERATURE_OUT_OF_RANGE,
				`Température fluide ${T} °C hors plage acceptée [-40 ; 200].`,
				null,
				T,
				200
			)
		);
	}
	if (fluide.type === 'eau' && fluide.glycolPct !== undefined && fluide.glycolPct > 0) {
		errors.push(
			mkError(
				ERROR_CODES.INCONSISTENT_FLUID,
				`Concentration glycol ${fluide.glycolPct} % incompatible avec fluide « eau pure » : choisir MEG ou MPG.`,
				null,
				fluide.glycolPct,
				0
			)
		);
	}
	if ((fluide.type === 'meg' || fluide.type === 'mpg') && fluide.glycolPct === undefined) {
		errors.push(
			mkError(
				ERROR_CODES.MISSING_GLYCOL_PCT,
				`Concentration glycol manquante pour fluide ${fluide.type.toUpperCase()}.`
			)
		);
	}
	if (fluide.glycolPct !== undefined && (fluide.glycolPct < 0 || fluide.glycolPct > 50)) {
		errors.push(
			mkError(
				ERROR_CODES.GLYCOL_OUT_OF_RANGE,
				`Concentration glycol ${fluide.glycolPct} % hors plage tabulée [0 ; 50].`,
				null,
				fluide.glycolPct,
				50
			)
		);
	}
}

function validerDiametre(
	d: DiametreInput,
	tronconId: string,
	errors: ErrorEntry[],
	warnings: Warning[]
): void {
	if (!d) {
		errors.push(
			mkError(ERROR_CODES.MISSING_DESIGNATION, `Tronçon ${tronconId} : diamètre absent.`, tronconId)
		);
		return;
	}
	if (!(d.materiau in RUGOSITE_TABLE) && d.rugositeMm === undefined) {
		errors.push(
			mkError(
				ERROR_CODES.UNKNOWN_MATERIAL,
				`Tronçon ${tronconId} : matériau « ${String(d.materiau)} » inconnu et aucune rugosité custom fournie.`,
				tronconId
			)
		);
		return;
	}
	if (d.rugositeMm !== undefined && d.rugositeMm > 5) {
		warnings.push(
			mkWarning(
				WARNING_CODES.RUGOSITE_INHABITUELLE,
				`Tronçon ${tronconId} : rugosité custom ${d.rugositeMm} mm > 5 mm, vérifier la valeur.`,
				tronconId,
				d.rugositeMm,
				5
			)
		);
	}
	if (d.mode === 'designation') {
		if (!d.designation) {
			errors.push(
				mkError(
					ERROR_CODES.MISSING_DESIGNATION,
					`Tronçon ${tronconId} : désignation manquante pour ${MATERIAU_LABELS[d.materiau] ?? d.materiau}.`,
					tronconId
				)
			);
			return;
		}
		const list = DESIGNATIONS_PAR_MATERIAU[d.materiau];
		if (list && !list.some((x) => x.id === d.designation)) {
			errors.push(
				mkError(
					ERROR_CODES.UNKNOWN_DESIGNATION,
					`Tronçon ${tronconId} : désignation « ${d.designation} » absente de la table ${MATERIAU_LABELS[d.materiau] ?? d.materiau}.`,
					tronconId
				)
			);
		}
	} else if (d.mode === 'manuel') {
		const intMm =
			d.diametreIntMm ??
			(d.diametreExtMm !== undefined && d.epaisseurMm !== undefined
				? d.diametreExtMm - 2 * d.epaisseurMm
				: undefined);
		if (intMm === undefined) {
			errors.push(
				mkError(
					ERROR_CODES.MISSING_DESIGNATION,
					`Tronçon ${tronconId} : fournir soit ⌀intérieur, soit (⌀extérieur + épaisseur).`,
					tronconId
				)
			);
			return;
		}
		if (!(intMm > 0) || intMm > 2000) {
			errors.push(
				mkError(
					ERROR_CODES.INVALID_DIAMETER,
					`Tronçon ${tronconId} : ⌀intérieur ${intMm} mm hors plage ]0 ; 2000].`,
					tronconId,
					intMm,
					2000
				)
			);
		}
	}
}

function validerAccessoire(
	a: Accessoire,
	tronconId: string,
	errors: ErrorEntry[]
): void {
	if (!a.quantite || a.quantite < 1 || !Number.isInteger(a.quantite)) {
		errors.push(
			mkError(
				ERROR_CODES.INVALID_FLOW,
				`Tronçon ${tronconId} : quantité ${a.quantite} d'accessoire invalide (entier ≥ 1).`,
				tronconId,
				a.quantite,
				1
			)
		);
	}
	if (a.type === 'custom') {
		if (a.zetaCustom === undefined || !Number.isFinite(a.zetaCustom) || a.zetaCustom < 0) {
			errors.push(
				mkError(
					ERROR_CODES.MISSING_ZETA,
					`Tronçon ${tronconId} : accessoire custom sans coefficient ζ ≥ 0 fourni.`,
					tronconId
				)
			);
		}
	} else if (a.type === 'vanne_kvs') {
		if (a.kvs === undefined || !Number.isFinite(a.kvs) || a.kvs <= 0) {
			errors.push(
				mkError(
					ERROR_CODES.MISSING_KVS,
					`Tronçon ${tronconId} : vanne_kvs sans Kvs > 0 fourni.`,
					tronconId
				)
			);
		}
	} else if (a.type === 'equipement_dp') {
		if (
			a.dpNominaleKpa === undefined ||
			!Number.isFinite(a.dpNominaleKpa) ||
			a.dpNominaleKpa <= 0
		) {
			errors.push(
				mkError(
					ERROR_CODES.MISSING_DP_NOMINAL,
					`Tronçon ${tronconId} : equipement_dp sans ΔP_nominale > 0 (kPa) fourni.`,
					tronconId
				)
			);
		}
		if (
			a.debitNominalM3h === undefined ||
			!Number.isFinite(a.debitNominalM3h) ||
			a.debitNominalM3h <= 0
		) {
			errors.push(
				mkError(
					ERROR_CODES.MISSING_DP_NOMINAL,
					`Tronçon ${tronconId} : equipement_dp sans Q_nominal > 0 (m³/h) fourni.`,
					tronconId
				)
			);
		}
	}
}

function validerTroncon(t: Troncon, errors: ErrorEntry[], warnings: Warning[]): void {
	const id = t.id || `#${t.ordre}`;
	if (!Number.isFinite(t.longueur) || t.longueur < 0) {
		errors.push(
			mkError(
				ERROR_CODES.INVALID_LENGTH,
				`Tronçon ${id} : longueur ${t.longueur} m invalide (≥ 0).`,
				id,
				t.longueur,
				0
			)
		);
	}

	validerDiametre(t.diametre, id, errors, warnings);

	// Débit
	if (!t.debit) {
		errors.push(
			mkError(ERROR_CODES.INVALID_FLOW, `Tronçon ${id} : entrée débit manquante.`, id)
		);
	} else if (t.debit.mode === 'manuel') {
		if (
			t.debit.valeurM3h === undefined ||
			!Number.isFinite(t.debit.valeurM3h) ||
			t.debit.valeurM3h <= 0
		) {
			errors.push(
				mkError(
					ERROR_CODES.INVALID_FLOW,
					`Tronçon ${id} : débit manuel manquant ou ≤ 0.`,
					id,
					t.debit.valeurM3h ?? null,
					0
				)
			);
		}
	} else if (t.debit.mode === 'puissance') {
		if (
			t.debit.puissanceKw === undefined ||
			!Number.isFinite(t.debit.puissanceKw) ||
			t.debit.puissanceKw <= 0
		) {
			errors.push(
				mkError(
					ERROR_CODES.INVALID_FLOW,
					`Tronçon ${id} : puissance manquante ou ≤ 0 pour calcul débit.`,
					id,
					t.debit.puissanceKw ?? null,
					0
				)
			);
		}
		if (
			t.debit.deltaTk !== undefined &&
			(!Number.isFinite(t.debit.deltaTk) || t.debit.deltaTk <= 0)
		) {
			errors.push(
				mkError(
					ERROR_CODES.INVALID_FLOW,
					`Tronçon ${id} : ΔT ${t.debit.deltaTk} K invalide (> 0).`,
					id,
					t.debit.deltaTk,
					0
				)
			);
		}
	}

	for (const a of t.accessoires ?? []) {
		validerAccessoire(a, id, errors);
	}
}

/* ============================================================ */
/*  Entry-point                                                  */
/* ============================================================ */

export function validateInputs(circuit: Circuit): ValidationOutcome {
	const errors: ErrorEntry[] = [];
	const warnings: Warning[] = [];

	if (!circuit || !circuit.fluide) {
		errors.push(
			mkError(
				ERROR_CODES.INCONSISTENT_FLUID,
				'Entrée circuit invalide : champ « fluide » manquant.'
			)
		);
		return { valid: false, errors, warnings };
	}

	validerFluide(circuit, errors);

	const method = circuit.options?.methodeLambda ?? 'serghides';
	if (!METHODES_VALIDES.includes(method)) {
		errors.push(
			mkError(
				ERROR_CODES.UNKNOWN_LAMBDA_METHOD,
				`Méthode λ inconnue : « ${String(method)} ». Valeurs : ${METHODES_VALIDES.join(', ')}.`
			)
		);
	}

	if (!circuit.troncons || circuit.troncons.length === 0) {
		errors.push(
			mkError(
				ERROR_CODES.INVALID_FLOW,
				'Circuit sans tronçon : ajouter au moins un tronçon.'
			)
		);
		return { valid: errors.length === 0, errors, warnings };
	}

	for (const t of circuit.troncons) {
		validerTroncon(t, errors, warnings);
	}

	return { valid: errors.length === 0, errors, warnings };
}

export { mkError, mkWarning };
