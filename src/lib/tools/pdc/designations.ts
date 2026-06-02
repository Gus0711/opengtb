/**
 * Résolveur de désignation commerciale → géométrie (⌀ext, épaisseur, ⌀int).
 *
 * Deux modes :
 *   - `designation` : lookup direct dans la table matériau.
 *   - `manuel`      : (ext + ep) OU (int direct) saisis par l'utilisateur.
 */

import { ERROR_CODES, MATERIAU_LABELS, RUGOSITE_TABLE } from './constants';
import { DESIGNATIONS_PAR_MATERIAU } from './data/designations';
import type { Designation, DiametreInput, MateriauId } from './types';

export interface TubeGeometry {
	extMm: number | null;
	epMm: number | null;
	intMm: number;
	rugositeMm: number;
	/** Désignation utilisée (si mode = designation). */
	designation: string | null;
	materiau: MateriauId;
}

export function listerDesignations(materiau: MateriauId): ReadonlyArray<Designation> {
	const list = DESIGNATIONS_PAR_MATERIAU[materiau];
	if (!list) {
		const err = new Error(`Matériau inconnu : « ${String(materiau)} ».`);
		(err as { code?: string }).code = ERROR_CODES.UNKNOWN_MATERIAL;
		throw err;
	}
	return list;
}

export function trouverDesignation(materiau: MateriauId, id: string): Designation | null {
	const list = listerDesignations(materiau);
	return list.find((d) => d.id === id) ?? null;
}

/**
 * Résout les dimensions d'un tube à partir des entrées utilisateur.
 *
 * @throws Error avec code `UNKNOWN_MATERIAL`, `UNKNOWN_DESIGNATION`,
 *         `MISSING_DESIGNATION`, ou `INVALID_DIAMETER`.
 */
export function resoudreDimensionsTube(input: DiametreInput): TubeGeometry {
	const rugosite =
		input.rugositeMm !== undefined ? input.rugositeMm : RUGOSITE_TABLE[input.materiau];
	if (rugosite === undefined) {
		const err = new Error(
			`Matériau inconnu et aucune rugosité custom : « ${String(input.materiau)} ».`
		);
		(err as { code?: string }).code = ERROR_CODES.UNKNOWN_MATERIAL;
		throw err;
	}

	if (input.mode === 'designation') {
		if (!input.designation) {
			const err = new Error(
				`Désignation manquante pour le matériau ${MATERIAU_LABELS[input.materiau]}.`
			);
			(err as { code?: string }).code = ERROR_CODES.MISSING_DESIGNATION;
			throw err;
		}
		const d = trouverDesignation(input.materiau, input.designation);
		if (!d) {
			const err = new Error(
				`Désignation « ${input.designation} » absente de la table ${MATERIAU_LABELS[input.materiau]}.`
			);
			(err as { code?: string }).code = ERROR_CODES.UNKNOWN_DESIGNATION;
			throw err;
		}
		if (d.intMm <= 0 || d.intMm > 2000) {
			const err = new Error(
				`Désignation « ${input.designation} » : ⌀intérieur ${d.intMm} mm hors plage ]0 ; 2000].`
			);
			(err as { code?: string }).code = ERROR_CODES.INVALID_DIAMETER;
			throw err;
		}
		return {
			extMm: d.extMm,
			epMm: d.epMm,
			intMm: d.intMm,
			rugositeMm: rugosite,
			designation: d.id,
			materiau: input.materiau
		};
	}

	// Mode manuel : soit (int direct), soit (ext + ep).
	let intMm = input.diametreIntMm;
	let extMm = input.diametreExtMm ?? null;
	let epMm = input.epaisseurMm ?? null;
	if ((intMm === undefined || intMm === null) && extMm !== null && epMm !== null) {
		intMm = extMm - 2 * epMm;
	}
	if (intMm === undefined || intMm === null) {
		const err = new Error(
			'Mode manuel : fournir soit ⌀intérieur direct, soit (⌀extérieur + épaisseur).'
		);
		(err as { code?: string }).code = ERROR_CODES.MISSING_DESIGNATION;
		throw err;
	}
	if (intMm <= 0 || intMm > 2000) {
		const err = new Error(
			`⌀intérieur ${intMm} mm hors plage ]0 ; 2000].`
		);
		(err as { code?: string }).code = ERROR_CODES.INVALID_DIAMETER;
		throw err;
	}
	return {
		extMm,
		epMm,
		intMm,
		rugositeMm: rugosite,
		designation: null,
		materiau: input.materiau
	};
}
