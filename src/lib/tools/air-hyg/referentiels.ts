/**
 * Référentiels — lookups dans les tables réglementaires avec traçabilité.
 *
 * Chaque fonction retourne { debit, texteCite, sourceArticle } pour permettre
 * à l'orchestrateur de remplir `texteCite` sur chaque ligne du résultat et
 * d'agréger les textes appliqués dans `textesLegauxAppliques`.
 *
 * Aucune fonction ne lève d'erreur "soft" (return undefined / NaN). Une clé
 * inconnue ou un argument hors plage lève une `Error` explicite.
 */

import {
	EMISSIONS_CO2_LH,
	QP_NF_EN_16798,
	qBatNfEn16798,
	TABLE_CRECHE,
	TABLE_NFS_90351,
	TABLE_R4212_6,
	TABLE_R4222_6,
	TABLE_RSDT_641,
	TABLE_RSDT_642_SANITAIRE,
	TEXTE_CITE_CUISINE_RSDT_642,
	TRANCHES_CUISINE_RSDT_642,
	type EntreeReferentiel
} from './constants';
import type {
	ActivitePhysique,
	CategorieBatiment,
	CategorieQai,
	ClassementSante,
	DesignationCodeTravail,
	DesignationCreche,
	DesignationRsdt641,
	ProfilOccupant
} from './types';

/* ============================================================ */
/*  Code du Travail R4222-6                                      */
/* ============================================================ */

/**
 * Débit minimal d'air neuf par occupant pour un local à pollution non
 * spécifique sur lieu de travail.
 *
 * Source : Code du Travail, article R4222-6.
 */
export function getDebitCodeTravail(designation: DesignationCodeTravail): EntreeReferentiel {
	const e = TABLE_R4222_6[designation];
	if (!e) throw new Error(`Désignation Code du Travail inconnue : « ${designation} ».`);
	return e;
}

/* ============================================================ */
/*  RSDT 64.1                                                    */
/* ============================================================ */

/**
 * Débit minimal d'air neuf par occupant pour un ERP à pollution non spécifique.
 *
 * Source : RSDT Art. 64.1.
 */
export function getDebitRsdt641(designation: DesignationRsdt641): EntreeReferentiel {
	const e = TABLE_RSDT_641[designation];
	if (!e) throw new Error(`Désignation RSDT 64.1 inconnue : « ${designation} ».`);
	return e;
}

/* ============================================================ */
/*  RSDT 64.2 — sanitaires forfaitaires                          */
/* ============================================================ */

export type TypeSanitaire = keyof typeof TABLE_RSDT_642_SANITAIRE;

/**
 * Débit forfaitaire pour sanitaires ERP (RSDT 64.2). Le résultat retourné est
 * le débit unitaire ; multiplier par le nombre d'équipements pour obtenir le
 * total.
 */
export function getDebitRsdt642Sanitaire(type: TypeSanitaire): EntreeReferentiel {
	const e = TABLE_RSDT_642_SANITAIRE[type];
	if (!e) throw new Error(`Type de sanitaire RSDT 64.2 inconnu : « ${type} ».`);
	return { debit: e.debit, texteCite: e.texteCite, sourceArticle: e.sourceArticle };
}

/* ============================================================ */
/*  R4212-6 — sanitaires lieu de travail                         */
/* ============================================================ */

export type TypeSanitaireTravail = keyof typeof TABLE_R4212_6;

export function getDebitR4212_6(
	type: TypeSanitaireTravail,
	quantite = 1
): { debit: number; texteCite: string; sourceArticle: string } {
	const e = TABLE_R4212_6[type];
	if (!e) throw new Error(`Type de sanitaire R4212-6 inconnu : « ${type} ».`);
	if (type === 'groupe_bain_douche') {
		const eg = TABLE_R4212_6.groupe_bain_douche;
		const debit = eg.debit + Math.max(0, quantite - 1) * eg.debitParEquipementSup;
		return { debit, texteCite: eg.texteCite, sourceArticle: eg.sourceArticle };
	}
	if (type === 'lavabos_groupes') {
		return {
			debit: e.debit * quantite,
			texteCite: e.texteCite,
			sourceArticle: e.sourceArticle
		};
	}
	return { debit: e.debit, texteCite: e.texteCite, sourceArticle: e.sourceArticle };
}

/* ============================================================ */
/*  RSDT 64.2 — cuisines collectives                             */
/* ============================================================ */

/**
 * Débit air neuf cuisine collective d'après le nombre de repas servis
 * simultanément (RSDT 64.2 + arrêté du 20 janvier 1983).
 *
 * Règle :
 *   - N < 150  : max(25·N, 500)
 *   - 150–500  : 20·N
 *   - 501–1500 : 15·N
 *   - > 1500   : max(10·N, 10 000)
 *
 * Lève une Error si N ≤ 0.
 */
export function getDebitRsdt642Cuisine(nbRepasSimultanes: number): {
	debit: number;
	texteCite: string;
	sourceArticle: string;
	tranche: string;
} {
	if (!Number.isFinite(nbRepasSimultanes) || nbRepasSimultanes <= 0) {
		throw new Error(
			`Nombre de repas servis simultanément invalide : « ${nbRepasSimultanes} » (doit être > 0).`
		);
	}
	const tranche = TRANCHES_CUISINE_RSDT_642.find(
		(t) => nbRepasSimultanes >= t.min && (t.max === null || nbRepasSimultanes <= t.max)
	);
	if (!tranche) {
		throw new Error(`Aucune tranche cuisine RSDT pour N = ${nbRepasSimultanes}.`);
	}
	const brut = tranche.parRepas * nbRepasSimultanes;
	const debit = Math.max(brut, tranche.plancher);
	return {
		debit,
		texteCite: `${TEXTE_CITE_CUISINE_RSDT_642} (tranche ${tranche.libelle})`,
		sourceArticle: 'RSDT 64.2 + Arrêté 20/01/1983',
		tranche: tranche.libelle
	};
}

/* ============================================================ */
/*  Crèches — arrêté 31/08/2021                                  */
/* ============================================================ */

/**
 * Débit air neuf crèche (arrêté 31/08/2021). Retourne le débit unitaire par
 * enfant ou par poste. L'orchestrateur multiplie par le nombre d'enfants ou
 * de postes.
 */
export function getDebitCreche(designation: DesignationCreche): EntreeReferentiel {
	const e = TABLE_CRECHE[designation];
	if (!e) throw new Error(`Désignation crèche inconnue : « ${designation} ».`);
	return e;
}

/* ============================================================ */
/*  NF S 90-351 — santé                                          */
/* ============================================================ */

/**
 * Débit air neuf zone santé à risque infectieux (NF S 90-351:2013).
 *
 * Pour les zones 2, 3, 4 : calcul en taux de renouvellement × volume.
 * Pour la zone 1 : pas de contrainte vol/h — retourne debit = 0 et un texte
 * indiquant que RSDT/Code Travail s'applique.
 */
export function getDebitSanteNfs90351(
	classement: ClassementSante,
	volume_m3: number
): { debit: number; texteCite: string; sourceArticle: string; tauxVolh: number | null; surpressionMini_Pa: number | null } {
	if (!Number.isFinite(volume_m3) || volume_m3 <= 0) {
		throw new Error(`Volume local invalide pour zone santé : « ${volume_m3} » m³.`);
	}
	const e = TABLE_NFS_90351[classement];
	if (!e) throw new Error(`Classement NF S 90-351 inconnu : « ${classement} ».`);
	const debit = e.tauxRenouvellement_volh !== null ? e.tauxRenouvellement_volh * volume_m3 : 0;
	return {
		debit,
		texteCite: e.texteCite,
		sourceArticle: e.sourceArticle,
		tauxVolh: e.tauxRenouvellement_volh,
		surpressionMini_Pa: e.surpressionMini_Pa
	};
}

/* ============================================================ */
/*  NF EN 16798 — q_p et q_B                                     */
/* ============================================================ */

export function getQpNfEn16798(categorieQai: CategorieQai): number {
	const v = QP_NF_EN_16798[categorieQai];
	if (v === undefined) throw new Error(`Catégorie QAI inconnue : « ${categorieQai} ».`);
	return v;
}

export function getQbNfEn16798(
	categorieQai: CategorieQai,
	categorieBat: CategorieBatiment
): number {
	if (!['QAI1', 'QAI2', 'QAI3', 'QAI4'].includes(categorieQai)) {
		throw new Error(`Catégorie QAI inconnue : « ${categorieQai} ».`);
	}
	if (!['B1', 'B2', 'B3'].includes(categorieBat)) {
		throw new Error(`Catégorie bâtiment inconnue : « ${categorieBat} ».`);
	}
	return qBatNfEn16798(categorieQai, categorieBat);
}

/* ============================================================ */
/*  Émissions CO₂ par profil + activité                          */
/* ============================================================ */

/**
 * Émission de CO₂ par occupant (L/h) selon profil et niveau d'activité.
 * Source : NF EN 16798-1:2019, Annexe C.
 */
export function emissionCO2ParOccupant(
	profil: ProfilOccupant = 'adulte',
	activite: ActivitePhysique = 'repos'
): number {
	const t = EMISSIONS_CO2_LH[profil];
	if (!t) throw new Error(`Profil occupant inconnu : « ${profil} ».`);
	const v = t[activite];
	if (v === undefined) throw new Error(`Activité physique inconnue : « ${activite} ».`);
	return v;
}
