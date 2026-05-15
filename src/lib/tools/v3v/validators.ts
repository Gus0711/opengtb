import { DN_LIST } from './constants';
import type { FluidId, V3VInputs } from './types';

export class ValidationError extends Error {
	field: string;
	constructor(field: string, message: string) {
		super(message);
		this.field = field;
	}
}

export function validateRequired(value: unknown, fieldName: string): void {
	if (value === undefined || value === null || value === '' || Number.isNaN(value as number)) {
		throw new ValidationError(fieldName, `Champ requis : « ${fieldName} ».`);
	}
}

export function validateRange(
	value: number,
	min: number,
	max: number,
	fieldName: string,
	unit = ''
): void {
	if (!Number.isFinite(value)) {
		throw new ValidationError(fieldName, `« ${fieldName} » doit être un nombre fini.`);
	}
	if (value < min || value > max) {
		const u = unit ? ' ' + unit : '';
		throw new ValidationError(
			fieldName,
			`« ${fieldName} » = ${value}${u} hors plage attendue [${min} ; ${max}]${u}.`
		);
	}
}

export interface ValidationOutcome {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

const FLUIDES_VALIDES: FluidId[] = ['eau', 'meg', 'mpg'];

/**
 * Validation des entrées avant appel à `dimensionnerV3V`.
 * Accumule erreurs et warnings sans interrompre, pour permettre une UI
 * qui affiche tout d'un coup.
 */
export function validateInputs(inputs: Partial<V3VInputs>): ValidationOutcome {
	const errors: string[] = [];
	const warnings: string[] = [];

	const range = (
		v: number | undefined,
		min: number,
		max: number,
		name: string,
		unit = ''
	): boolean => {
		if (v === undefined || v === null || Number.isNaN(v)) return false;
		try {
			validateRange(v, min, max, name, unit);
			return true;
		} catch (e) {
			errors.push((e as Error).message);
			return false;
		}
	};

	// Plages
	if (inputs.puissance !== undefined) range(inputs.puissance, 0.1, 50000, 'Puissance', 'kW');
	if (inputs.debit !== undefined) range(inputs.debit, 0.01, 1000, 'Débit', 'm³/h');
	if (inputs.deltaT !== undefined) range(inputs.deltaT, 1, 60, 'ΔT', 'K');
	if (inputs.glycolPct !== undefined) range(inputs.glycolPct, 0, 60, 'Glycol', '%');
	if (inputs.dpr !== undefined) range(inputs.dpr, 0.1, 1000, 'ΔPr', 'kPa');
	if (inputs.autoriteCible !== undefined)
		range(inputs.autoriteCible, 0.3, 0.8, 'Autorité cible');
	if (inputs.dpvMax !== undefined) range(inputs.dpvMax, 1, 2000, 'ΔPv max admissible', 'kPa');
	if (inputs.temperature !== undefined) range(inputs.temperature, -20, 200, 'Température', '°C');

	// Triade P/Q/ΔT : au moins deux saisies
	const saisies = [inputs.puissance, inputs.debit, inputs.deltaT].filter(
		(v) => v !== undefined && v !== null && !Number.isNaN(v)
	);
	if (saisies.length < 2) {
		errors.push('Saisir au moins deux valeurs parmi Puissance, Débit, ΔT.');
	}

	// Champs strictement requis
	if (inputs.fluide === undefined) {
		errors.push('Champ requis : « Fluide ».');
	} else if (!FLUIDES_VALIDES.includes(inputs.fluide)) {
		errors.push(`Fluide invalide : « ${inputs.fluide} ».`);
	}
	if (inputs.dpr === undefined || inputs.dpr === null || Number.isNaN(inputs.dpr)) {
		errors.push('Champ requis : « ΔPr circuit ».');
	}
	if (
		inputs.autoriteCible === undefined ||
		inputs.autoriteCible === null ||
		Number.isNaN(inputs.autoriteCible)
	) {
		errors.push('Champ requis : « Autorité cible ».');
	}
	if (
		inputs.temperature === undefined ||
		inputs.temperature === null ||
		Number.isNaN(inputs.temperature)
	) {
		errors.push('Champ requis : « Température fluide ».');
	}

	// Cohérences logiques
	if (inputs.fluide === 'eau' && inputs.glycolPct !== undefined && inputs.glycolPct > 0) {
		errors.push("Incohérence : glycol > 0 % avec fluide « eau ». Choisir MEG ou MPG.");
	}
	if (
		(inputs.fluide === 'meg' || inputs.fluide === 'mpg') &&
		(inputs.glycolPct === undefined || inputs.glycolPct === 0)
	) {
		warnings.push(
			`Fluide ${inputs.fluide.toUpperCase()} sélectionné mais concentration glycol nulle : équivalent à de l'eau pure.`
		);
	}

	// Warnings circuit
	if (inputs.dpr !== undefined && inputs.dpr < 1 && inputs.dpr >= 0.1) {
		warnings.push(
			`ΔPr saisi très faible (${inputs.dpr} kPa) : autorité par construction élevée.`
		);
	}
	if (inputs.dpr !== undefined && inputs.dpr > 100) {
		warnings.push(`ΔPr saisi très élevé (${inputs.dpr} kPa) : vérifier la saisie.`);
	}

	// DN tuyauterie : doit appartenir à la liste standard
	if (inputs.dnTuyauterie !== undefined && inputs.dnTuyauterie !== null) {
		if (!DN_LIST.includes(inputs.dnTuyauterie as (typeof DN_LIST)[number])) {
			errors.push(
				`DN tuyauterie « ${inputs.dnTuyauterie} » hors liste standard (${DN_LIST.join(', ')}).`
			);
		}
	}

	return { valid: errors.length === 0, errors, warnings };
}
