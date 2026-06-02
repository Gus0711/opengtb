/**
 * Orchestrateur — calcul des débits d'air hygiéniques à l'échelle du projet.
 *
 * Résilience : une erreur de calcul sur un local n'interrompt pas le calcul des
 * autres locaux. L'erreur est rapportée dans `errors[]` et le local est
 * remplacé par un ResultatLocal en mode dégradé (debit = 0, warnings).
 *
 * Pureté : aucune mutation des entrées, aucun I/O, déterministe.
 *
 * Exemple d'appel direct :
 *   ```ts
 *   const r = calculerDebitsHygieniques({
 *     libelle: 'Test',
 *     options: { methodeCalcul: 'reglementaire_fr', categorieQaiCible: 'QAI2',
 *                categorieBatiment: 'B2', co2Exterieur_ppm: 400,
 *                afficherComparaisonEuropeenne: true },
 *     locaux: [{
 *       id: 'L1', libelle: 'Bureau', zone: 'tertiaire_bureau',
 *       surface_m2: 50, hauteurSousPlafond_m: 2.7,
 *       populations: [{ libelle: 'Salariés', nbOccupants: 10,
 *                       referentiel: 'code_travail', designationLocal: 'bureau' }]
 *     }]
 *   });
 *   console.log(r.resume.debitTotalAirNeuf_m3h); // 250
 *   ```
 */

import {
	CO2_ACCEPTABLE_PPM,
	CO2_CIBLE_PPM,
	CO2_CRITIQUE_PPM,
	M3H_PAR_LPS,
	TOLERANCE_EQUILIBRE_PCT,
	VERSION
} from './constants';
import { calculerCO2EquilibreMixte } from './co2';
import {
	emissionCO2ParOccupant,
	getDebitCodeTravail,
	getDebitCreche,
	getDebitRsdt641,
	getDebitRsdt642Cuisine,
	getDebitRsdt642Sanitaire,
	getDebitSanteNfs90351,
	getQpNfEn16798,
	getQbNfEn16798,
	type TypeSanitaire
} from './referentiels';
import type {
	ComparaisonNfEn16798,
	DebitForfaitaire,
	DebitPopulation,
	ErrorEntry,
	Local,
	NatureLocal,
	Population,
	Projet,
	Resultat,
	ResultatLocal,
	Verdict,
	Warning
} from './types';

/* ============================================================ */
/*  Helpers                                                      */
/* ============================================================ */

export function volumePuisSurface(surface: number, hsp: number): number {
	return surface * hsp;
}

export function tauxRenouvellement(Q_m3h: number, V_m3: number): number {
	if (V_m3 <= 0) return Infinity;
	return Q_m3h / V_m3;
}

function natureDuLocal(l: Local): NatureLocal {
	if (l.zone === 'sanitaire' || l.zone === 'cuisine_collective') {
		return { pollutionSpecifique: true, flux: 'extraction' };
	}
	return { pollutionSpecifique: false, flux: 'insufflation' };
}

function emissionCO2Pop(p: Population): number {
	if (p.emissionCO2_lh !== undefined && Number.isFinite(p.emissionCO2_lh) && p.emissionCO2_lh >= 0) {
		return p.emissionCO2_lh;
	}
	return emissionCO2ParOccupant(p.profil ?? 'adulte', p.activite ?? 'leger');
}

/* ============================================================ */
/*  Calcul par population (CT, RSDT 64.1, crèche)                */
/* ============================================================ */

function calculerPopulation(p: Population, localId: string): DebitPopulation {
	let unitaire: number;
	let texteCite: string;

	if (p.referentiel === 'code_travail') {
		const e = getDebitCodeTravail(p.designationLocal as never);
		unitaire = e.debit;
		texteCite = e.texteCite;
	} else if (p.referentiel === 'rsdt_641') {
		const e = getDebitRsdt641(p.designationLocal as never);
		unitaire = e.debit;
		texteCite = e.texteCite;
	} else if (p.referentiel === 'creche') {
		const e = getDebitCreche(p.designationLocal as never);
		unitaire = e.debit;
		texteCite = e.texteCite;
	} else {
		throw new Error(
			`Référentiel non supporté pour calcul par population : « ${p.referentiel} » (local ${localId}).`
		);
	}

	const N = Math.max(0, p.nbOccupants);
	return {
		libelle: p.libelle,
		referentiel: p.referentiel,
		texteCite,
		nbOccupants: N,
		debitUnitaire_m3h_occupant: unitaire,
		debitTotal_m3h: unitaire * N
	};
}

/* ============================================================ */
/*  Forfaitaires (cuisine, sanitaires, santé)                    */
/* ============================================================ */

function calculerCuisine(l: Local): DebitForfaitaire[] {
	const n = l.parametresSpecifiques?.nbRepasSimultanes ?? 0;
	const e = getDebitRsdt642Cuisine(n);
	return [
		{
			libelle: `Cuisine collective (${n} repas servis simultanément, ${e.tranche})`,
			texteCite: e.texteCite,
			base: 'nb_repas',
			quantite: n,
			debitTotal_m3h: e.debit
		}
	];
}

function calculerSanitaires(l: Local): DebitForfaitaire[] {
	const ps = l.parametresSpecifiques ?? {};
	const collectif = ps.collectif ?? true;
	const out: DebitForfaitaire[] = [];

	if (ps.nbCabinets && ps.nbCabinets > 0) {
		const t: TypeSanitaire = collectif ? 'cabinet_collectif' : 'cabinet_individuel';
		const e = getDebitRsdt642Sanitaire(t);
		out.push({
			libelle: `Cabinets d'aisances ${collectif ? 'collectifs' : 'individuels'}`,
			texteCite: e.texteCite,
			base: 'nb_cabinets',
			quantite: ps.nbCabinets,
			debitTotal_m3h: e.debit * ps.nbCabinets
		});
	}
	if (ps.nbDouches && ps.nbDouches > 0) {
		const t: TypeSanitaire = collectif ? 'douche_collective' : 'douche_individuelle';
		const e = getDebitRsdt642Sanitaire(t);
		out.push({
			libelle: `Douches ${collectif ? 'collectives' : 'individuelles'}`,
			texteCite: e.texteCite,
			base: 'nb_douches',
			quantite: ps.nbDouches,
			debitTotal_m3h: e.debit * ps.nbDouches
		});
	}
	if (ps.nbLavabos && ps.nbLavabos > 0) {
		const e = getDebitRsdt642Sanitaire('lavabo_groupe');
		out.push({
			libelle: 'Lavabos groupés',
			texteCite: e.texteCite,
			base: 'nb_lavabos',
			quantite: ps.nbLavabos,
			debitTotal_m3h: e.debit * ps.nbLavabos
		});
	}
	return out;
}

function calculerSante(l: Local, volume_m3: number): DebitForfaitaire[] {
	const c = l.parametresSpecifiques?.classementZoneSante;
	if (c === undefined) return [];
	const e = getDebitSanteNfs90351(c, volume_m3);
	if (e.tauxVolh === null) return [];
	return [
		{
			libelle: `Zone santé risque ${c} — taux ${e.tauxVolh} vol/h × ${volume_m3.toFixed(0)} m³`,
			texteCite: e.texteCite,
			base: 'taux_renouvellement',
			quantite: e.tauxVolh,
			debitTotal_m3h: e.debit
		}
	];
}

function calculerChangeCreche(l: Local): DebitForfaitaire[] {
	const n = l.parametresSpecifiques?.nbPostesChange;
	if (!n || n <= 0) return [];
	const e = getDebitCreche('change');
	return [
		{
			libelle: 'Postes de change',
			texteCite: e.texteCite,
			base: 'nb_postes_change',
			quantite: n,
			debitTotal_m3h: e.debit * n
		}
	];
}

/* ============================================================ */
/*  Comparaison NF EN 16798                                      */
/* ============================================================ */

function comparerNfEn16798(
	N: number,
	A_m2: number,
	categorieBat: Projet['options']['categorieBatiment']
): ComparaisonNfEn16798 {
	const compute = (qai: 'QAI1' | 'QAI2' | 'QAI3') =>
		N * getQpNfEn16798(qai) + A_m2 * getQbNfEn16798(qai, categorieBat);
	const d1 = compute('QAI1');
	const d2 = compute('QAI2');
	const d3 = compute('QAI3');
	return {
		debitQAI1_m3h: d1,
		debitQAI2_m3h: d2,
		debitQAI3_m3h: d3,
		ratioMiniFrSurQAI2: 0 // rempli par l'orchestrateur après calcul du débit FR
	};
}

/* ============================================================ */
/*  Verdict CO₂                                                  */
/* ============================================================ */

function verdictLocalDepuisCO2(co2_ppm: number, hasErreurs: boolean): Verdict {
	if (hasErreurs) return 'non_conforme';
	if (co2_ppm <= CO2_CIBLE_PPM) return 'conforme';
	if (co2_ppm <= CO2_ACCEPTABLE_PPM) return 'conforme';
	if (co2_ppm <= CO2_CRITIQUE_PPM) return 'acceptable_avec_reserves';
	return 'non_conforme';
}

/* ============================================================ */
/*  Calcul d'un local                                            */
/* ============================================================ */

function calculerLocal(
	l: Local,
	projet: Projet,
	globalErrors: ErrorEntry[]
): ResultatLocal {
	const warnings: Warning[] = [];
	const sources = new Set<string>();
	const nature = natureDuLocal(l);
	const volume_m3 = volumePuisSurface(l.surface_m2, l.hauteurSousPlafond_m);

	const debitsParPopulation: DebitPopulation[] = [];
	const debitsForfaitaires: DebitForfaitaire[] = [];

	// 1) Populations
	for (const p of l.populations) {
		if (!Number.isFinite(p.nbOccupants) || p.nbOccupants <= 0) continue;
		try {
			const r = calculerPopulation(p, l.id);
			debitsParPopulation.push(r);
			sources.add(srcRef(p.referentiel));
		} catch (e) {
			globalErrors.push({
				code: 'CALC_ERROR',
				niveau: 'error',
				message: (e as Error).message,
				local: l.id,
				valeur: null,
				seuil: null
			});
		}
	}

	// 2) Forfaitaires selon zone
	try {
		if (l.zone === 'cuisine_collective') {
			const out = calculerCuisine(l);
			debitsForfaitaires.push(...out);
			sources.add('RSDT 64.2 + Arrêté 20/01/1983');
		}
		if (l.zone === 'sanitaire') {
			const out = calculerSanitaires(l);
			debitsForfaitaires.push(...out);
			if (out.length > 0) sources.add('RSDT 64.2');
		}
		if (l.zone === 'creche') {
			const out = calculerChangeCreche(l);
			debitsForfaitaires.push(...out);
			if (out.length > 0) sources.add('Arrêté 31/08/2021');
		}
		if (l.zone === 'sante') {
			const out = calculerSante(l, volume_m3);
			debitsForfaitaires.push(...out);
			if (out.length > 0) sources.add('NF S 90-351:2013');
			// Surpression note
			const c = l.parametresSpecifiques?.classementZoneSante;
			if (c !== undefined && c >= 2) {
				warnings.push({
					code: 'SURPRESSION_REQUISE',
					niveau: 'info',
					message: `Zone santé risque ${c} : surpression +15 Pa requise par rapport aux locaux adjacents (NF S 90-351).`,
					local: l.id,
					valeur: 15,
					seuil: null
				});
			}
		}
	} catch (e) {
		globalErrors.push({
			code: 'CALC_ERROR',
			niveau: 'error',
			message: (e as Error).message,
			local: l.id,
			valeur: null,
			seuil: null
		});
	}

	// 3) Pour zone santé risque 3-4 : retenir max(par occupant, taux renouvellement)
	let debitTotalLocal = 0;
	const sumPop = debitsParPopulation.reduce((s, d) => s + d.debitTotal_m3h, 0);
	const sumForf = debitsForfaitaires.reduce((s, d) => s + d.debitTotal_m3h, 0);

	if (l.zone === 'sante' && (l.parametresSpecifiques?.classementZoneSante ?? 1) >= 2) {
		debitTotalLocal = Math.max(sumPop, sumForf);
	} else {
		debitTotalLocal = sumPop + sumForf;
	}

	// 4) Comparaison NF EN 16798
	const nbOccupantsTotal = l.populations.reduce(
		(s, p) => s + (p.nbOccupants > 0 ? p.nbOccupants : 0),
		0
	);
	const comp = comparerNfEn16798(nbOccupantsTotal, l.surface_m2, projet.options.categorieBatiment);
	comp.ratioMiniFrSurQAI2 = comp.debitQAI2_m3h > 0 ? debitTotalLocal / comp.debitQAI2_m3h : 0;

	// 5) CO₂ équilibre
	const occList = l.populations
		.filter((p) => p.nbOccupants > 0)
		.map((p) => ({ nb: p.nbOccupants, G_lh: emissionCO2Pop(p) }));
	const co2Eq = calculerCO2EquilibreMixte(occList, debitTotalLocal, projet.options.co2Exterieur_ppm);

	// 6) Warnings CO₂ et comparaison
	if (occList.length > 0 && Number.isFinite(co2Eq)) {
		if (co2Eq > CO2_CRITIQUE_PPM) {
			warnings.push({
				code: 'CO2_EQUILIBRE_CRITIQUE',
				niveau: 'warning',
				message: `CO₂ équilibre ${Math.round(co2Eq)} ppm > ${CO2_CRITIQUE_PPM} ppm : ventilation très insuffisante (catégorie IV NF EN 16798).`,
				local: l.id,
				valeur: co2Eq,
				seuil: CO2_CRITIQUE_PPM
			});
		} else if (co2Eq > CO2_ACCEPTABLE_PPM) {
			warnings.push({
				code: 'CO2_EQUILIBRE_ELEVE',
				niveau: 'warning',
				message: `CO₂ équilibre ${Math.round(co2Eq)} ppm > ${CO2_ACCEPTABLE_PPM} ppm : ventilation insuffisante au regard des bonnes pratiques.`,
				local: l.id,
				valeur: co2Eq,
				seuil: CO2_ACCEPTABLE_PPM
			});
		}
	}
	if (
		projet.options.afficherComparaisonEuropeenne &&
		comp.ratioMiniFrSurQAI2 > 0 &&
		comp.ratioMiniFrSurQAI2 < 1
	) {
		warnings.push({
			code: 'DEBIT_INFERIEUR_NF_EN_16798_QAI2',
			niveau: 'info',
			message: `Débit FR ${Math.round(debitTotalLocal)} m³/h représente ${(comp.ratioMiniFrSurQAI2 * 100).toFixed(0)} % du standard européen QAI 2 (${Math.round(comp.debitQAI2_m3h)} m³/h).`,
			local: l.id,
			valeur: comp.ratioMiniFrSurQAI2,
			seuil: 1
		});
	}

	// 7) Vérification installation existante
	let verification;
	if (l.installationExistante) {
		const installe = l.installationExistante.debitInstalle_m3h;
		const ecart = installe - debitTotalLocal;
		const ecartPct = debitTotalLocal > 0 ? (ecart / debitTotalLocal) * 100 : 0;
		const verdict =
			ecart >= 0
				? 'conforme'
				: ecartPct >= -10
					? 'limite'
					: 'non_conforme';
		verification = {
			debitInstalle_m3h: installe,
			ecart_m3h: ecart,
			ecart_pct: ecartPct,
			verdict
		} as const;
		if (verdict === 'non_conforme') {
			warnings.push({
				code: 'INSTALLATION_NON_CONFORME',
				niveau: 'warning',
				message: `Installation existante ${installe} m³/h < requis ${Math.round(debitTotalLocal)} m³/h (écart ${ecartPct.toFixed(1)} %).`,
				local: l.id,
				valeur: installe,
				seuil: debitTotalLocal
			});
		}
	}

	// 8) Verdict local
	const hasErreurs = globalErrors.some((e) => e.local === l.id);
	const verdict = verdictLocalDepuisCO2(co2Eq, hasErreurs);

	return {
		id: l.id,
		libelle: l.libelle,
		zone: l.zone,
		nature,
		surface_m2: l.surface_m2,
		volume_m3,
		debitsParPopulation,
		debitsForfaitaires,
		debitTotalLocal_m3h: debitTotalLocal,
		debitTotalLocal_lps: debitTotalLocal / M3H_PAR_LPS,
		tauxRenouvellement_volh: tauxRenouvellement(debitTotalLocal, volume_m3),
		co2Equilibre_ppm: co2Eq,
		comparaisonNfEn16798: comp,
		verification,
		warnings,
		sources: Array.from(sources),
		verdict
	};
}

function srcRef(r: Population['referentiel']): string {
	switch (r) {
		case 'code_travail':
			return 'Code du Travail R4222-6';
		case 'rsdt_641':
			return 'RSDT 64.1';
		case 'creche':
			return 'Arrêté 31/08/2021';
		default:
			return 'Inconnu';
	}
}

/* ============================================================ */
/*  Orchestrateur                                                */
/* ============================================================ */

/**
 * Calcule les débits d'air hygiéniques sur l'ensemble d'un projet.
 *
 * Pure, déterministe, résiliente : une exception levée dans le calcul d'un
 * local est captée et rapportée dans `errors[]`, les autres locaux sont
 * traités normalement.
 */
export function calculerDebitsHygieniques(projet: Projet): Resultat {
	const errors: ErrorEntry[] = [];
	const warnings: Warning[] = [];
	const resultatsLocaux: ResultatLocal[] = [];
	const textesLegauxAppliques = new Set<string>();

	for (const l of projet.locaux) {
		try {
			const r = calculerLocal(l, projet, errors);
			resultatsLocaux.push(r);
			warnings.push(...r.warnings);
			r.sources.forEach((s) => textesLegauxAppliques.add(s));
		} catch (e) {
			errors.push({
				code: 'CALC_LOCAL_FATAL',
				niveau: 'error',
				message: `Calcul local « ${l.libelle} » échoué : ${(e as Error).message}`,
				local: l.id,
				valeur: null,
				seuil: null
			});
			// Local en mode dégradé
			resultatsLocaux.push({
				id: l.id,
				libelle: l.libelle,
				zone: l.zone,
				nature: natureDuLocal(l),
				surface_m2: l.surface_m2,
				volume_m3: volumePuisSurface(l.surface_m2, l.hauteurSousPlafond_m),
				debitsParPopulation: [],
				debitsForfaitaires: [],
				debitTotalLocal_m3h: 0,
				debitTotalLocal_lps: 0,
				tauxRenouvellement_volh: 0,
				co2Equilibre_ppm: 0,
				comparaisonNfEn16798: {
					debitQAI1_m3h: 0,
					debitQAI2_m3h: 0,
					debitQAI3_m3h: 0,
					ratioMiniFrSurQAI2: 0
				},
				warnings: [],
				sources: [],
				verdict: 'non_conforme'
			});
		}
	}

	// Résumé bâtiment
	let debitTotalAirNeuf = 0;
	let debitTotalExtraction = 0;
	let nbOccupantsTotal = 0;
	const co2Weighted: number[] = [];
	const co2Weights: number[] = [];

	for (const r of resultatsLocaux) {
		if (r.nature.flux === 'extraction') {
			debitTotalExtraction += r.debitTotalLocal_m3h;
		} else {
			debitTotalAirNeuf += r.debitTotalLocal_m3h;
		}
		nbOccupantsTotal += r.debitsParPopulation.reduce((s, d) => s + d.nbOccupants, 0);
		if (Number.isFinite(r.co2Equilibre_ppm) && r.debitsParPopulation.length > 0) {
			const w = r.debitsParPopulation.reduce((s, d) => s + d.nbOccupants, 0);
			if (w > 0) {
				co2Weighted.push(r.co2Equilibre_ppm * w);
				co2Weights.push(w);
			}
		}
	}

	const equilibrePct =
		debitTotalAirNeuf > 0
			? ((debitTotalAirNeuf - debitTotalExtraction) / debitTotalAirNeuf) * 100
			: 0;

	if (Math.abs(equilibrePct) > TOLERANCE_EQUILIBRE_PCT && debitTotalAirNeuf > 0) {
		warnings.push({
			code: 'EXTRACTION_DESEQUILIBREE',
			niveau: 'warning',
			message: `Déséquilibre insufflation/extraction : ${equilibrePct.toFixed(1)} % (tolérance ±${TOLERANCE_EQUILIBRE_PCT} %).`,
			local: null,
			valeur: equilibrePct,
			seuil: TOLERANCE_EQUILIBRE_PCT
		});
	}

	const co2Moyen =
		co2Weights.length > 0
			? co2Weighted.reduce((a, b) => a + b, 0) / co2Weights.reduce((a, b) => a + b, 0)
			: projet.options.co2Exterieur_ppm;

	// Verdict global
	let verdictGlobal: Verdict;
	if (errors.length > 0 || resultatsLocaux.some((r) => r.verdict === 'non_conforme')) {
		verdictGlobal = 'non_conforme';
	} else if (
		warnings.some((w) => w.niveau === 'warning') ||
		resultatsLocaux.some((r) => r.verdict === 'acceptable_avec_reserves')
	) {
		verdictGlobal = 'acceptable_avec_reserves';
	} else {
		verdictGlobal = 'conforme';
	}

	return {
		projet: {
			libelle: projet.libelle,
			dateCalcul: new Date().toISOString(),
			version: VERSION,
			sources: Array.from(textesLegauxAppliques)
		},
		resume: {
			debitTotalAirNeuf_m3h: debitTotalAirNeuf,
			debitTotalExtraction_m3h: debitTotalExtraction,
			equilibreAirAirExtrait_pct: equilibrePct,
			nbLocaux: projet.locaux.length,
			nbOccupantsTotal,
			verdictGlobal,
			co2MoyenAttendu_ppm: co2Moyen,
			nbWarnings: warnings.length,
			nbErrors: errors.length
		},
		detail: { locaux: resultatsLocaux },
		warnings,
		errors,
		textesLegauxAppliques: Array.from(textesLegauxAppliques)
	};
}

/* ============================================================ */
/*  Vérification mode conformité installation existante          */
/* ============================================================ */

export function verifierConformiteLocal(
	local: Local,
	debitInstalle_m3h: number,
	projet: Projet
): { ecart_m3h: number; ecart_pct: number; verdict: 'conforme' | 'limite' | 'non_conforme'; debitRequis_m3h: number } {
	const r = calculerLocal({ ...local, installationExistante: { debitInstalle_m3h } }, projet, []);
	const v = r.verification!;
	return {
		ecart_m3h: v.ecart_m3h,
		ecart_pct: v.ecart_pct,
		verdict: v.verdict,
		debitRequis_m3h: r.debitTotalLocal_m3h
	};
}

/* ============================================================ */
/*  Conversions et utilitaires exportés                          */
/* ============================================================ */

export function m3hVersLps(q: number): number {
	return q / M3H_PAR_LPS;
}

export function lpsVersM3h(q: number): number {
	return q * M3H_PAR_LPS;
}
