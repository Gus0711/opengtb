/**
 * Validation des entrées projet — accumule erreurs et warnings sans interrompre.
 * Codes structurés pour permettre à l'UI de filtrer / regrouper.
 */

import { TABLE_R4222_6, TABLE_RSDT_641, TABLE_CRECHE } from './constants';
import type { ErrorEntry, Local, Population, Projet, ValidationOutcome, Warning } from './types';

const VOLUME_MIN_PAR_OCCUPANT_M3 = 15;

function err(code: string, message: string, local: string | null = null, valeur: number | null = null, seuil: number | null = null): ErrorEntry {
	return { code, niveau: 'error', message, local, valeur, seuil };
}

function warn(code: string, message: string, local: string | null = null, valeur: number | null = null, seuil: number | null = null): Warning {
	return { code, niveau: 'warning', message, local, valeur, seuil };
}

function validatePopulation(p: Population, localId: string, errors: ErrorEntry[], warnings: Warning[]): void {
	if (p.nbOccupants === undefined || p.nbOccupants === null || Number.isNaN(p.nbOccupants)) {
		errors.push(
			err(
				'INCONSISTENT_POPULATION',
				`Population « ${p.libelle ?? '(sans libellé)'} » : effectif manquant.`,
				localId
			)
		);
		return;
	}
	if (p.nbOccupants < 0) {
		errors.push(
			err(
				'INCONSISTENT_POPULATION',
				`Population « ${p.libelle} » : effectif négatif (${p.nbOccupants}).`,
				localId,
				p.nbOccupants
			)
		);
		return;
	}
	if (p.nbOccupants === 0) {
		warnings.push(
			warn(
				'POPULATION_VIDE',
				`Population « ${p.libelle} » à 0 occupant : ignorée dans le calcul.`,
				localId,
				0
			)
		);
	}

	if (!p.referentiel) {
		errors.push(
			err('UNKNOWN_REFERENTIEL', `Population « ${p.libelle} » : référentiel non précisé.`, localId)
		);
		return;
	}

	if (p.referentiel === 'code_travail') {
		if (!(p.designationLocal in TABLE_R4222_6)) {
			errors.push(
				err(
					'UNKNOWN_DESIGNATION',
					`Population « ${p.libelle} » : désignation Code du Travail inconnue (« ${p.designationLocal} »).`,
					localId
				)
			);
		}
	} else if (p.referentiel === 'rsdt_641') {
		if (!(p.designationLocal in TABLE_RSDT_641)) {
			errors.push(
				err(
					'UNKNOWN_DESIGNATION',
					`Population « ${p.libelle} » : désignation RSDT 64.1 inconnue (« ${p.designationLocal} »).`,
					localId
				)
			);
		}
	} else if (p.referentiel === 'creche') {
		if (!(p.designationLocal in TABLE_CRECHE)) {
			errors.push(
				err(
					'UNKNOWN_DESIGNATION',
					`Population « ${p.libelle} » : désignation crèche inconnue (« ${p.designationLocal} »).`,
					localId
				)
			);
		}
	} else if (p.referentiel === 'rsdt_642') {
		errors.push(
			err(
				'UNKNOWN_REFERENTIEL',
				`Population « ${p.libelle} » : RSDT 64.2 (pollution spécifique) ne se calcule pas par population mais via les paramètres spécifiques du local (cuisine, sanitaires).`,
				localId
			)
		);
	}
}

function validateLocal(l: Local, errors: ErrorEntry[], warnings: Warning[]): void {
	if (!l.id) errors.push(err('MISSING_REQUIRED_PARAM', 'Local sans identifiant.'));

	const lid = l.id ?? '?';

	if (!Number.isFinite(l.surface_m2) || l.surface_m2 <= 0) {
		errors.push(
			err(
				'INVALID_AREA',
				`Local « ${l.libelle} » : surface invalide (${l.surface_m2} m²).`,
				lid,
				l.surface_m2,
				0
			)
		);
	}
	if (!Number.isFinite(l.hauteurSousPlafond_m) || l.hauteurSousPlafond_m <= 0) {
		errors.push(
			err(
				'MISSING_REQUIRED_PARAM',
				`Local « ${l.libelle} » : hauteur sous plafond manquante ou invalide (${l.hauteurSousPlafond_m} m).`,
				lid,
				l.hauteurSousPlafond_m,
				0
			)
		);
	}

	if (!l.zone) {
		errors.push(err('UNKNOWN_ZONE', `Local « ${l.libelle} » : zone non précisée.`, lid));
	}

	// Cuisine : paramètres spécifiques requis
	if (l.zone === 'cuisine_collective') {
		const n = l.parametresSpecifiques?.nbRepasSimultanes;
		if (n === undefined || !Number.isFinite(n) || n <= 0) {
			errors.push(
				err(
					'MISSING_REQUIRED_PARAM',
					`Local « ${l.libelle} » (cuisine collective) : « nbRepasSimultanes » requis et > 0.`,
					lid,
					n ?? null,
					0
				)
			);
		}
	}

	// Sanitaires : au moins un équipement
	if (l.zone === 'sanitaire') {
		const ps = l.parametresSpecifiques ?? {};
		const total = (ps.nbCabinets ?? 0) + (ps.nbLavabos ?? 0) + (ps.nbDouches ?? 0);
		if (total === 0) {
			errors.push(
				err(
					'MISSING_REQUIRED_PARAM',
					`Local « ${l.libelle} » (sanitaire) : indiquer au moins un cabinet, lavabo ou douche.`,
					lid
				)
			);
		}
	}

	// Crèche local de change
	if (l.zone === 'creche' && l.libelle.toLowerCase().includes('change')) {
		const n = l.parametresSpecifiques?.nbPostesChange;
		if (n !== undefined && n <= 0) {
			errors.push(
				err(
					'MISSING_REQUIRED_PARAM',
					`Local « ${l.libelle} » (change) : « nbPostesChange » doit être > 0.`,
					lid,
					n,
					0
				)
			);
		}
	}

	// Santé
	if (l.zone === 'sante') {
		const c = l.parametresSpecifiques?.classementZoneSante;
		if (c === undefined) {
			errors.push(
				err(
					'MISSING_REQUIRED_PARAM',
					`Local « ${l.libelle} » (santé) : « classementZoneSante » requis (1, 2, 3 ou 4).`,
					lid
				)
			);
		} else if (![1, 2, 3, 4].includes(c)) {
			errors.push(
				err(
					'UNKNOWN_DESIGNATION',
					`Local « ${l.libelle} » : classement santé invalide (${c}).`,
					lid,
					c
				)
			);
		}
	}

	// Populations
	for (const p of l.populations) validatePopulation(p, lid, errors, warnings);

	// Densité d'occupation
	const nbOccTotal = l.populations.reduce((s, p) => s + (p.nbOccupants > 0 ? p.nbOccupants : 0), 0);
	if (nbOccTotal > 0 && Number.isFinite(l.surface_m2) && Number.isFinite(l.hauteurSousPlafond_m)) {
		const V = l.surface_m2 * l.hauteurSousPlafond_m;
		const vParOccupant = V / nbOccTotal;
		if (vParOccupant < VOLUME_MIN_PAR_OCCUPANT_M3) {
			warnings.push(
				warn(
					'VOLUME_INSUFFISANT_PER_OCCUPANT',
					`Local « ${l.libelle} » : volume par occupant ${vParOccupant.toFixed(1)} m³/pers < ${VOLUME_MIN_PAR_OCCUPANT_M3} m³/pers (densité élevée).`,
					lid,
					vParOccupant,
					VOLUME_MIN_PAR_OCCUPANT_M3
				)
			);
		}
	}
}

/**
 * Validation projet complète. Retourne un outcome avec accumulation des erreurs
 * et warnings ; n'interrompt jamais.
 */
export function validateProjet(p: Projet): ValidationOutcome {
	const errors: ErrorEntry[] = [];
	const warnings: Warning[] = [];

	if (!p || typeof p !== 'object') {
		errors.push(err('MISSING_REQUIRED_PARAM', 'Projet manquant ou invalide.'));
		return { valid: false, errors, warnings };
	}

	if (!Array.isArray(p.locaux) || p.locaux.length === 0) {
		errors.push(err('MISSING_REQUIRED_PARAM', 'Projet sans local — ajouter au moins un local.'));
	} else {
		for (const l of p.locaux) validateLocal(l, errors, warnings);
	}

	if (p.options) {
		if (
			p.options.categorieQaiCible &&
			!['QAI1', 'QAI2', 'QAI3', 'QAI4'].includes(p.options.categorieQaiCible)
		) {
			errors.push(
				err(
					'INVALID_QAI_CATEGORY',
					`Catégorie QAI invalide : « ${p.options.categorieQaiCible} ».`
				)
			);
		}
	}

	return { valid: errors.length === 0, errors, warnings };
}
