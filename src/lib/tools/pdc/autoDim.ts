/**
 * Auto-dimensionnement DN — retient la plus petite désignation commerciale
 * d'un matériau qui satisfait des critères locaux (vitesse max, ΔP linéique
 * max).
 *
 * Pas d'optimisation globale du réseau : on raisonne tronçon par tronçon.
 * Pour un dimensionnement réseau complet, l'utilisateur enchaîne les
 * appels.
 */

import { MATERIAU_LABELS } from './constants';
import { listerDesignations } from './designations';
import { debitDepuisPuissance } from './conversions';
import { proprietesFluide } from './fluide';
import { lambdaDispatch, reynolds, rugositeRelative, vitesse } from './friction';
import { pdcLineiquePaParM } from './pertes';
import { RUGOSITE_TABLE } from './constants';
import type { AutoDimInput, AutoDimResultat, AutoDimTentative } from './types';

function evaluerDesignation(
	designation: { id: string; intMm: number },
	rho: number,
	nu: number,
	rugositeMm: number,
	debitM3h: number,
	criteres: AutoDimInput['criteres']
): AutoDimTentative {
	const V = vitesse(debitM3h, designation.intMm);
	const Re = reynolds(V, designation.intMm / 1000, nu);
	const epsD = rugositeRelative(rugositeMm, designation.intMm);
	const lam = lambdaDispatch(Re, epsD, 'serghides').lambda;
	const dpPaParM = pdcLineiquePaParM(lam, designation.intMm / 1000, V, rho);

	const echecs: string[] = [];
	if (criteres.vitesseMaxMs !== undefined && V > criteres.vitesseMaxMs) {
		echecs.push(`V = ${V.toFixed(2)} m/s > ${criteres.vitesseMaxMs} m/s`);
	}
	if (
		criteres.dpLineiqueMaxPaParM !== undefined &&
		dpPaParM > criteres.dpLineiqueMaxPaParM
	) {
		echecs.push(`ΔP/m = ${dpPaParM.toFixed(0)} Pa/m > ${criteres.dpLineiqueMaxPaParM} Pa/m`);
	}

	return {
		designation: designation.id,
		diametreIntMm: designation.intMm,
		vitesseMs: V,
		reynolds: Re,
		lambda: lam,
		dpLineiquePaParM: dpPaParM,
		respecteCriteres: echecs.length === 0,
		echecsCriteres: echecs
	};
}

/**
 * Sélectionne la plus petite désignation d'un matériau qui respecte les
 * critères. Retourne la désignation retenue, la plus petite trop petite, et
 * la juste plus grande surdimensionnée (utiles pour la prise de décision
 * d'arbitrage métier).
 */
export function autoDimensionnerDN(input: AutoDimInput): AutoDimResultat {
	if (
		input.criteres.vitesseMaxMs === undefined &&
		input.criteres.dpLineiqueMaxPaParM === undefined
	) {
		throw new Error(
			'Auto-dim : fournir au moins un critère (vitesseMaxMs ou dpLineiqueMaxPaParM).'
		);
	}

	const fluide = proprietesFluide(
		input.fluide.type,
		input.fluide.glycolPct ?? 0,
		input.fluide.temperature
	);

	const debitM3h =
		input.debit.mode === 'manuel'
			? input.debit.valeurM3h!
			: debitDepuisPuissance(
					input.debit.puissanceKw!,
					input.debit.deltaTk ?? 20,
					fluide.cpVolumique
				);

	if (!Number.isFinite(debitM3h) || debitM3h <= 0) {
		throw new Error('Auto-dim : débit non calculable ou ≤ 0.');
	}

	const rugositeMm = RUGOSITE_TABLE[input.materiau];
	const designations = [...listerDesignations(input.materiau)].sort(
		(a, b) => a.intMm - b.intMm
	);

	const tentatives: AutoDimTentative[] = designations.map((d) =>
		evaluerDesignation(d, fluide.rho, fluide.nu, rugositeMm, debitM3h, input.criteres)
	);

	const idxRetenu = tentatives.findIndex((t) => t.respecteCriteres);

	if (idxRetenu === -1) {
		// Aucune désignation ne respecte les critères → on retourne la plus
		// petite tentée et la plus grande tentée pour informer l'utilisateur.
		return {
			succes: false,
			retenue: null,
			tropPetite: tentatives[0] ?? null,
			tropGrande: tentatives[tentatives.length - 1] ?? null,
			debitUtiliseM3h: debitM3h,
			fluide,
			message: `Aucune désignation ${MATERIAU_LABELS[input.materiau]} ne respecte les critères. Vérifier le matériau ou relâcher les critères (V_max / ΔP_lin_max).`
		};
	}

	return {
		succes: true,
		retenue: tentatives[idxRetenu],
		tropPetite: idxRetenu > 0 ? tentatives[idxRetenu - 1] : null,
		tropGrande:
			idxRetenu < tentatives.length - 1 ? tentatives[idxRetenu + 1] : null,
		debitUtiliseM3h: debitM3h,
		fluide,
		message: `Désignation retenue : ${tentatives[idxRetenu].designation} (${MATERIAU_LABELS[input.materiau]}).`
	};
}
