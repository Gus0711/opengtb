/**
 * Règles de diagnostic métier sur le réglage de la loi d'eau.
 *
 * Les seuils proviennent des manuels Siemens RVL/RVD, Honeywell Smile,
 * Vaillant ATMOS et de la pratique courante d'installation.
 */

import { getEmitter, getZone } from './data';
import { tDeparture, clampPoints } from './calc';
import type { Diagnostic, EmitterId, ClimateZoneId, LoiEauParams } from './types';

export interface DiagnoseInputs {
	emitter: EmitterId;
	zone: ClimateZoneId;
	params: LoiEauParams;
}

export function diagnose(inputs: DiagnoseInputs): Diagnostic[] {
	const diags: Diagnostic[] = [];
	const emitter = getEmitter(inputs.emitter);
	const zone = getZone(inputs.zone);
	if (!emitter || !zone) return diags;

	const { pente, parallele, tMin, tMax, tPivot } = inputs.params;

	if (pente <= 0) {
		diags.push({
			level: 'error',
			message: 'Pente nulle ou négative.',
			hint: 'La régulation ne réagira pas à la baisse de T° extérieure — vérifier le paramètre pente.'
		});
		return diags;
	}

	const slopeRange = emitter.typicalSlopeRange;
	if (pente > slopeRange.max + 0.3) {
		diags.push({
			level: 'warn',
			message: `Pente élevée (${pente.toFixed(2)}) pour ${emitter.short}.`,
			hint: `Plage typique ${slopeRange.min}–${slopeRange.max}. Risque de surchauffe par temps doux et inconfort.`
		});
	} else if (pente < slopeRange.min - 0.2) {
		diags.push({
			level: 'warn',
			message: `Pente faible (${pente.toFixed(2)}) pour ${emitter.short}.`,
			hint: `Plage typique ${slopeRange.min}–${slopeRange.max}. Risque de ne pas couvrir les besoins par grand froid.`
		});
	}

	const tDepAtBase = tDeparture(zone.baseTemp, inputs.params);
	const margin = tMax - tDepAtBase;
	if (margin < 0.5) {
		const clamp = clampPoints(inputs.params);
		const tClamp = clamp.tExtAtMax !== null ? clamp.tExtAtMax.toFixed(0) : '–';
		diags.push({
			level: 'warn',
			message: `T° départ max atteinte dès ${tClamp} °C ext.`,
			hint:
				'Bâtiment potentiellement sous-isolé pour cet émetteur, ou émetteur sous-dimensionné. ' +
				'Augmenter T° max ou choisir un émetteur plus chaud.'
		});
	}

	if (emitter.id === 'plancher' && tMax > 50) {
		diags.push({
			level: 'warn',
			message: 'T° max plancher chauffant > 50 °C.',
			hint:
				'NF EN 1264 : T° surface 28 °C max en zone d\'occupation, soit ~45 °C max au départ. ' +
				'Risque dégradation chape / inconfort thermique.'
		});
	}

	if (emitter.regime.return >= 55 && emitter.id !== 'plancher') {
		// Cas chaudière condensation : retour > 55 °C empêche condensation.
		// On signale si le réglage actuel produit en pratique un retour
		// élevé. Heuristique : retour ≈ départ − ΔT_emetteur (20 K ici).
		const tRetAtBase = tDepAtBase - 20;
		if (tRetAtBase > 55) {
			diags.push({
				level: 'info',
				message: 'Régime chaud : condensation difficile.',
				hint:
					'Si chaudière condensation, viser un retour < 55 °C. Baisser pente ou choisir émetteur BT.'
			});
		}
	}

	if (Math.abs(parallele) > 10) {
		diags.push({
			level: 'info',
			message: `Parallèle inhabituel (${parallele > 0 ? '+' : ''}${parallele} °C).`,
			hint:
				'Un parallèle au-delà de ±10 °C compense souvent un mauvais réglage de pente ou un capteur défaillant.'
		});
	}

	if (tMin < tPivot) {
		diags.push({
			level: 'info',
			message: `T° min départ (${tMin} °C) inférieure à l'ambiance (${tPivot} °C).`,
			hint: 'Sans effet : la régulation s\'arrête en pratique au-dessus de T° pivot.'
		});
	}

	if (diags.length === 0) {
		diags.push({
			level: 'ok',
			message: 'Réglage cohérent avec votre installation.'
		});
	}

	return diags;
}
