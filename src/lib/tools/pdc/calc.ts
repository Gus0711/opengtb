/**
 * Orchestrateur principal — calcul des pertes de charge d'un circuit en
 * série, du circulateur au point le plus défavorable.
 *
 * Garanties :
 *   - Fonction pure : ne mute pas l'entrée, déterministe.
 *   - Pas de NaN silencieux : entrée incohérente → erreur explicite.
 *   - Sortie complète même en présence d'erreurs (calcul partiel jusqu'au
 *     premier blocage par tronçon).
 *
 * Notes :
 *   - Si `circuitFermeSymetrique = true`, longueurs et accessoires sont
 *     comptés ×2 **sauf** les `equipement_dp` (radiateur, batterie CTA…)
 *     qui sont uniques sur le chemin physique.
 *   - Le débit peut varier d'un tronçon à l'autre (cas dorsale → branche).
 */

import {
	PA_PAR_BAR,
	PA_PAR_MCE,
	SEUILS_PAR_TYPE,
	VITESSE_LIMITE_ABSOLUE,
	VITESSE_LIMITE_BAS,
	VITESSE_LIMITE_CUIVRE,
	WARNING_CODES,
	ZETA_TABLE
} from './constants';
import { dpAllUnits, dpUnitsTrio, debitDepuisPuissance } from './conversions';
import { resoudreDimensionsTube } from './designations';
import { proprietesFluide } from './fluide';
import { lambdaDispatch, reynolds, rugositeRelative, vitesse } from './friction';
import {
	dpEquipement,
	pdcLineique,
	pdcLineiquePaParM,
	pdcSinguliere,
	zetaBorda,
	zetaFromKvs
} from './pertes';
import { validateInputs } from './validators';
import type {
	Accessoire,
	AccessoireAggrege,
	AccessoireType,
	Circuit,
	DetailResultat,
	ErrorEntry,
	FluidProps,
	LambdaMethod,
	Resultat,
	ResultatAccessoire,
	ResultatTroncon,
	ResumeResultat,
	Troncon,
	Verdict,
	Warning
} from './types';

const ZETA_KEYS = Object.keys(ZETA_TABLE) as Array<keyof typeof ZETA_TABLE>;

/* ============================================================ */
/*  Helpers verdict                                              */
/* ============================================================ */

function verdictVitesse(
	V: number,
	type: Troncon['type'],
	materiau: string | null,
	tronconId: string
): { verdict: Verdict; warnings: Warning[] } {
	const seuils = SEUILS_PAR_TYPE[type];
	const warnings: Warning[] = [];
	let verdict: Verdict = 'ok';

	if (V < VITESSE_LIMITE_BAS) {
		verdict = 'limite';
		warnings.push({
			code: WARNING_CODES.VITESSE_TROP_FAIBLE,
			niveau: 'warning',
			message: `Tronçon ${tronconId} : vitesse ${V.toFixed(2)} m/s < 0.2 m/s — risque embouage et désaérage difficile.`,
			troncon: tronconId,
			valeur: V,
			seuil: VITESSE_LIMITE_BAS
		});
	} else if (V > VITESSE_LIMITE_ABSOLUE) {
		verdict = 'rejete';
		warnings.push({
			code: WARNING_CODES.VITESSE_TROP_ELEVEE,
			niveau: 'warning',
			message: `Tronçon ${tronconId} : vitesse ${V.toFixed(2)} m/s > ${VITESSE_LIMITE_ABSOLUE} m/s — bruit et vibrations garantis, à rejeter.`,
			troncon: tronconId,
			valeur: V,
			seuil: VITESSE_LIMITE_ABSOLUE
		});
	} else {
		// Cas cuivre : 2.0 m/s = limite érosion-corrosion (avant la limite absolue de 3.0)
		if (V > VITESSE_LIMITE_CUIVRE && materiau && materiau.startsWith('cuivre')) {
			verdict = 'limite';
			warnings.push({
				code: WARNING_CODES.VITESSE_CUIVRE_EROSION,
				niveau: 'warning',
				message: `Tronçon ${tronconId} : vitesse ${V.toFixed(2)} m/s > 2 m/s sur cuivre — risque d'érosion-corrosion (norme EN 12502).`,
				troncon: tronconId,
				valeur: V,
				seuil: VITESSE_LIMITE_CUIVRE
			});
		}
		if (V > seuils.vitesseOkMax) {
			verdict = 'limite';
			warnings.push({
				code: WARNING_CODES.VITESSE_TROP_ELEVEE,
				niveau: 'warning',
				message: `Tronçon ${tronconId} : vitesse ${V.toFixed(2)} m/s > ${seuils.vitesseOkMax} m/s recommandée pour ce type.`,
				troncon: tronconId,
				valeur: V,
				seuil: seuils.vitesseOkMax
			});
		} else if (V < seuils.vitesseOkMin) {
			verdict = 'limite';
			warnings.push({
				code: WARNING_CODES.VITESSE_TROP_FAIBLE,
				niveau: 'warning',
				message: `Tronçon ${tronconId} : vitesse ${V.toFixed(2)} m/s < ${seuils.vitesseOkMin} m/s recommandée pour ce type.`,
				troncon: tronconId,
				valeur: V,
				seuil: seuils.vitesseOkMin
			});
		}
	}

	return { verdict, warnings };
}

function verdictDpLineique(
	dp: number,
	L: number,
	type: Troncon['type'],
	tronconId: string
): { verdict: Verdict; warnings: Warning[] } {
	const seuils = SEUILS_PAR_TYPE[type];
	const warnings: Warning[] = [];
	let verdict: Verdict = 'ok';

	if (dp > seuils.dpLineiqueOkMax) {
		verdict = 'limite';
		warnings.push({
			code: WARNING_CODES.DP_LINEIQUE_TROP_ELEVEE,
			niveau: 'warning',
			message: `Tronçon ${tronconId} : ΔP linéique ${dp.toFixed(0)} Pa/m > ${seuils.dpLineiqueOkMax} Pa/m — réseau sous-dimensionné pour ce type.`,
			troncon: tronconId,
			valeur: dp,
			seuil: seuils.dpLineiqueOkMax
		});
	} else if (dp < seuils.dpLineiqueOkMin && L > 10) {
		verdict = 'limite';
		warnings.push({
			code: WARNING_CODES.DP_LINEIQUE_TROP_FAIBLE,
			niveau: 'warning',
			message: `Tronçon ${tronconId} : ΔP linéique ${dp.toFixed(0)} Pa/m < ${seuils.dpLineiqueOkMin} Pa/m sur ${L.toFixed(1)} m — réseau probablement surdimensionné.`,
			troncon: tronconId,
			valeur: dp,
			seuil: seuils.dpLineiqueOkMin
		});
	}
	return { verdict, warnings };
}

/* ============================================================ */
/*  Calcul d'un tronçon                                          */
/* ============================================================ */

function calculerDebitTroncon(t: Troncon, fluide: FluidProps, presetDeltaT: number): number {
	if (t.debit.mode === 'manuel') {
		return t.debit.valeurM3h!;
	}
	const dt = t.debit.deltaTk ?? presetDeltaT;
	return debitDepuisPuissance(t.debit.puissanceKw!, dt, fluide.cpVolumique);
}

function calculerAccessoire(
	a: Accessoire,
	context: {
		tronconId: string;
		V_ms: number;
		rho: number;
		debitTronconM3h: number;
		quantiteEffective: number;
	}
): { resultat: ResultatAccessoire; warnings: Warning[] } {
	const warnings: Warning[] = [];
	let zeta = 0;
	let source: ResultatAccessoire['source'] = 'table';
	let dpUnitairePa = 0;

	if (a.type === 'custom') {
		zeta = a.zetaCustom!;
		source = 'custom';
		dpUnitairePa = pdcSinguliere(zeta, context.V_ms, context.rho);
	} else if (a.type === 'vanne_kvs') {
		const { zeta: z, dpPa } = zetaFromKvs(
			a.kvs!,
			context.debitTronconM3h,
			context.rho,
			context.V_ms
		);
		zeta = z;
		dpUnitairePa = dpPa;
		source = 'kvs';
	} else if (a.type === 'equipement_dp') {
		const { dpPa, warning } = dpEquipement(
			a.dpNominaleKpa!,
			a.debitNominalM3h!,
			context.debitTronconM3h,
			context.tronconId,
			a.libelle ?? null
		);
		dpUnitairePa = dpPa;
		// ζ équivalent à la section du tronçon pour cohérence d'agrégation
		const denom = context.rho * context.V_ms * context.V_ms;
		zeta = denom > 0 ? (dpPa * 2) / denom : 0;
		source = 'equipement_dp';
		if (warning) warnings.push(warning);
	} else if (a.type === 'elargissement_brusque') {
		const ratio = a.sectionAvalRatio ?? 0.5;
		zeta = zetaBorda(ratio);
		dpUnitairePa = pdcSinguliere(zeta, context.V_ms, context.rho);
		source = 'table';
	} else {
		const key = a.type as keyof typeof ZETA_TABLE;
		if (ZETA_KEYS.includes(key)) {
			zeta = ZETA_TABLE[key];
			dpUnitairePa = pdcSinguliere(zeta, context.V_ms, context.rho);
			source = 'table';
		} else {
			// Type inconnu — ne devrait pas arriver post-validation
			zeta = 0;
			dpUnitairePa = 0;
			source = 'table';
		}
	}

	const dpTotalPa = dpUnitairePa * context.quantiteEffective;
	return {
		resultat: {
			type: a.type,
			libelle: a.libelle ?? null,
			quantite: context.quantiteEffective,
			zetaUtilise: zeta,
			source,
			dpUnitairePa,
			dpTotalPa,
			warning: warnings[0]?.message ?? null
		},
		warnings
	};
}

interface TronconCalcOutcome {
	resultat: ResultatTroncon | null;
	warnings: Warning[];
	errors: ErrorEntry[];
}

function calculerTroncon(
	t: Troncon,
	fluide: FluidProps,
	method: LambdaMethod,
	presetDeltaT: number,
	options: { symetrique: boolean; toleranceColebrook: number; maxIterColebrook: number }
): TronconCalcOutcome {
	const id = t.id || `#${t.ordre}`;
	const warnings: Warning[] = [];
	const errors: ErrorEntry[] = [];

	let geom;
	try {
		geom = resoudreDimensionsTube(t.diametre);
	} catch (e) {
		errors.push({
			code: (e as { code?: string }).code ?? 'UNKNOWN',
			niveau: 'error',
			message: `Tronçon ${id} : ${(e as Error).message}`,
			troncon: id,
			valeur: null,
			seuil: null
		});
		return { resultat: null, warnings, errors };
	}

	let debitM3h: number;
	try {
		debitM3h = calculerDebitTroncon(t, fluide, presetDeltaT);
	} catch (e) {
		errors.push({
			code: 'INVALID_FLOW',
			niveau: 'error',
			message: `Tronçon ${id} : ${(e as Error).message}`,
			troncon: id,
			valeur: null,
			seuil: null
		});
		return { resultat: null, warnings, errors };
	}

	const D_m = geom.intMm / 1000;
	const V_ms = vitesse(debitM3h, geom.intMm);
	const Re = reynolds(V_ms, D_m, fluide.nu);
	const epsD = rugositeRelative(geom.rugositeMm, geom.intMm);

	let lambdaInfo;
	try {
		lambdaInfo = lambdaDispatch(Re, epsD, method, {
			tolerance: options.toleranceColebrook,
			maxIter: options.maxIterColebrook,
			tronconId: id
		});
	} catch (e) {
		errors.push({
			code: (e as { code?: string }).code ?? 'UNKNOWN',
			niveau: 'error',
			message: `Tronçon ${id} : ${(e as Error).message}`,
			troncon: id,
			valeur: null,
			seuil: null
		});
		return { resultat: null, warnings, errors };
	}
	warnings.push(...lambdaInfo.warnings);

	const lengthFactor = options.symetrique ? 2 : 1;
	const longueurReelleM = t.longueur * lengthFactor;
	const dpLineiquePaParM = pdcLineiquePaParM(lambdaInfo.lambda, D_m, V_ms, fluide.rho);
	const dpLineairePa = pdcLineique(lambdaInfo.lambda, D_m, longueurReelleM, V_ms, fluide.rho);

	// Verdicts vitesse et ΔP linéique
	const vV = verdictVitesse(V_ms, t.type, geom.materiau, id);
	const vDp = verdictDpLineique(dpLineiquePaParM, longueurReelleM, t.type, id);
	warnings.push(...vV.warnings, ...vDp.warnings);

	// Accessoires
	const accessoiresRes: ResultatAccessoire[] = [];
	let dpSinguliereTotalePa = 0;
	let dpEquipementsPa = 0;

	for (const a of t.accessoires ?? []) {
		// Doublage : les equipement_dp ne sont jamais doublés (uniques sur le chemin)
		const quantite =
			options.symetrique && a.type !== 'equipement_dp' ? a.quantite * 2 : a.quantite;
		const out = calculerAccessoire(a, {
			tronconId: id,
			V_ms,
			rho: fluide.rho,
			debitTronconM3h: debitM3h,
			quantiteEffective: quantite
		});
		accessoiresRes.push(out.resultat);
		warnings.push(...out.warnings);
		if (a.type === 'equipement_dp') {
			dpEquipementsPa += out.resultat.dpTotalPa;
		} else {
			dpSinguliereTotalePa += out.resultat.dpTotalPa;
		}
	}

	const dpTronconPa = dpLineairePa + dpSinguliereTotalePa + dpEquipementsPa;

	const resultat: ResultatTroncon = {
		id,
		ordre: t.ordre,
		libelle: t.libelle,
		type: t.type,

		diametreIntMm: geom.intMm,
		rugositeMm: geom.rugositeMm,
		rugositeRelative: epsD,

		longueurReelleM,
		debitM3h,
		debitMs: debitM3h / 3600,
		vitesseMs: V_ms,
		reynolds: Re,
		regime: lambdaInfo.regime,
		methodeLambda: lambdaInfo.methode,
		lambda: lambdaInfo.lambda,

		dpLineiquePaParM,
		dpLineaire: dpUnitsTrio(dpLineairePa),

		accessoires: accessoiresRes,
		dpSinguliereTotal: dpUnitsTrio(dpSinguliereTotalePa),
		dpEquipementsTotal: dpUnitsTrio(dpEquipementsPa),

		dpTronconTotal: dpUnitsTrio(dpTronconPa),
		partDuTotalPct: 0, // recalculé au niveau circuit

		verdictVitesse: vV.verdict,
		verdictDpLineique: vDp.verdict,

		warnings: warnings.filter((w) => w.troncon === id)
	};

	return { resultat, warnings, errors };
}

/* ============================================================ */
/*  Agrégation                                                   */
/* ============================================================ */

function aggregerAccessoires(troncons: ResultatTroncon[]): AccessoireAggrege[] {
	const map = new Map<AccessoireType, AccessoireAggrege>();
	for (const tr of troncons) {
		for (const a of tr.accessoires) {
			const cur = map.get(a.type);
			if (cur) {
				cur.quantiteTotale += a.quantite;
				cur.dpTotalePa += a.dpTotalPa;
			} else {
				map.set(a.type, {
					type: a.type,
					quantiteTotale: a.quantite,
					dpTotalePa: a.dpTotalPa
				});
			}
		}
	}
	return [...map.values()].sort((a, b) => b.dpTotalePa - a.dpTotalePa);
}

function combinerVerdicts(verdicts: Verdict[]): Verdict {
	if (verdicts.some((v) => v === 'rejete')) return 'rejete';
	if (verdicts.some((v) => v === 'limite')) return 'limite';
	return 'ok';
}

/* ============================================================ */
/*  Entry-point                                                  */
/* ============================================================ */

/**
 * Calcule les pertes de charge du circuit en série fourni en entrée.
 *
 * Le résultat contient toujours la section `fluide`, `resume`, `detail`
 * (potentiellement vides en cas d'erreurs), et les listes `warnings` et
 * `errors` accumulées.
 */
export function calculerPertesDeCharge(circuit: Circuit): Resultat {
	const validation = validateInputs(circuit);

	// Fluide
	let fluide: FluidProps;
	try {
		fluide = proprietesFluide(
			circuit.fluide.type,
			circuit.fluide.glycolPct ?? 0,
			circuit.fluide.temperature
		);
	} catch (e) {
		const code = (e as { code?: string }).code ?? 'UNKNOWN';
		const err: ErrorEntry = {
			code,
			niveau: 'error',
			message: (e as Error).message,
			troncon: null,
			valeur: null,
			seuil: null
		};
		return {
			fluide: {
				rho: 0,
				nu: 0,
				mu: 0,
				cpVolumique: 0,
				source: ''
			},
			resume: emptyResume(),
			detail: { troncons: [], accessoiresAgreges: [] },
			warnings: validation.warnings,
			errors: [...validation.errors, err]
		};
	}

	const method = circuit.options?.methodeLambda ?? 'serghides';
	const symetrique = circuit.options?.circuitFermeSymetrique ?? false;
	const toleranceColebrook = circuit.options?.toleranceColebrook ?? 1e-10;
	const maxIterColebrook = circuit.options?.maxIterColebrook ?? 50;

	const presetDeltaT = 20; // valeur par défaut si tronçon en mode puissance sans ΔT

	const troncons: ResultatTroncon[] = [];
	const warnings: Warning[] = [...validation.warnings];
	const errors: ErrorEntry[] = [...validation.errors];

	for (const t of [...circuit.troncons].sort((a, b) => a.ordre - b.ordre)) {
		const out = calculerTroncon(t, fluide, method, presetDeltaT, {
			symetrique,
			toleranceColebrook,
			maxIterColebrook
		});
		warnings.push(...out.warnings.filter((w) => !troncons.find((tr) => tr.id === w.troncon)));
		errors.push(...out.errors);
		if (out.resultat) {
			// remplacer les warnings du tronçon par ceux filtrés
			troncons.push(out.resultat);
		}
	}

	// Agrégation
	let dpLineairePa = 0;
	let dpSinguliereTotalePa = 0;
	let dpEquipementsTotalePa = 0;
	for (const tr of troncons) {
		dpLineairePa += tr.dpLineaire.Pa;
		dpSinguliereTotalePa += tr.dpSinguliereTotal.Pa;
		dpEquipementsTotalePa += tr.dpEquipementsTotal.Pa;
	}
	const hmtPa = dpLineairePa + dpSinguliereTotalePa + dpEquipementsTotalePa;

	// Pourcentages par tronçon + repartition globale
	let plusPenalisant: ResumeResultat['tronconLePlusPenalisant'] = null;
	const totalForPct = hmtPa > 0 ? hmtPa : 1;
	for (const tr of troncons) {
		tr.partDuTotalPct = (tr.dpTronconTotal.Pa / totalForPct) * 100;
		if (!plusPenalisant || tr.partDuTotalPct > plusPenalisant.partDuTotalPct) {
			plusPenalisant = {
				id: tr.id,
				libelle: tr.libelle,
				partDuTotalPct: tr.partDuTotalPct
			};
		}
	}

	const vitesses = troncons.map((t) => t.vitesseMs).filter((v) => Number.isFinite(v));
	const longueurTotale = troncons.reduce((acc, t) => acc + t.longueurReelleM, 0);
	const dpLinTotaleParM = longueurTotale > 0 ? dpLineairePa / longueurTotale : 0;

	const verdicts: Verdict[] = [];
	for (const tr of troncons) {
		verdicts.push(tr.verdictVitesse, tr.verdictDpLineique);
	}
	const verdictGlobal = combinerVerdicts(verdicts);

	const resume: ResumeResultat = {
		hmtTotale: {
			Pa: hmtPa,
			kPa: hmtPa / 1000,
			mCE: hmtPa / PA_PAR_MCE,
			bar: hmtPa / PA_PAR_BAR
		},
		dpLineaireTotale: dpUnitsTrio(dpLineairePa),
		dpSinguliereTotale: dpUnitsTrio(dpSinguliereTotalePa),
		dpEquipementsTotale: dpUnitsTrio(dpEquipementsTotalePa),
		vitesseMin: vitesses.length ? Math.min(...vitesses) : 0,
		vitesseMax: vitesses.length ? Math.max(...vitesses) : 0,
		dpLineiqueMoyennePaParM: dpLinTotaleParM,
		tronconLePlusPenalisant: plusPenalisant,
		repartitionPct: {
			lineaire: (dpLineairePa / totalForPct) * 100,
			singuliere: (dpSinguliereTotalePa / totalForPct) * 100,
			equipements: (dpEquipementsTotalePa / totalForPct) * 100
		},
		verdictGlobal,
		nbWarnings: warnings.length,
		nbErrors: errors.length
	};

	const detail: DetailResultat = {
		troncons,
		accessoiresAgreges: aggregerAccessoires(troncons)
	};

	void dpAllUnits; // (réservé : conversion bar/kPa/Pa/mCE est utilisée via hmtTotale)

	return { fluide, resume, detail, warnings, errors };
}

function emptyResume(): ResumeResultat {
	const z = { Pa: 0, kPa: 0, mCE: 0 };
	return {
		hmtTotale: { Pa: 0, kPa: 0, mCE: 0, bar: 0 },
		dpLineaireTotale: z,
		dpSinguliereTotale: z,
		dpEquipementsTotale: z,
		vitesseMin: 0,
		vitesseMax: 0,
		dpLineiqueMoyennePaParM: 0,
		tronconLePlusPenalisant: null,
		repartitionPct: { lineaire: 0, singuliere: 0, equipements: 0 },
		verdictGlobal: 'rejete',
		nbWarnings: 0,
		nbErrors: 0
	};
}
