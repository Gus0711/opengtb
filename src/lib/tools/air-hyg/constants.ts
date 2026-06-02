/**
 * Tables réglementaires et normatives — débit d'air hygiénique.
 *
 * Sources :
 *   - Code du Travail, articles R4222-1 à R4222-26, R4212-6
 *     (Décret n°2008-244 du 7 mars 2008).
 *   - Règlement Sanitaire Départemental Type (RSDT), Titre III, articles 63 et 64
 *     (64.1 pollution non spécifique ERP, 64.2 pollution spécifique).
 *   - Arrêté du 20 janvier 1983 modifiant le RSDT — cuisines collectives.
 *   - Arrêté du 31 août 2021 — établissements d'accueil du jeune enfant.
 *   - NF S 90-351:2013 — Établissements de santé, zones à environnement maîtrisé.
 *   - NF EN 16798-1:2019 méthode 1 — méthode performancielle.
 *
 * Toutes les valeurs en m³/h sauf indication contraire.
 *
 * Convention : `texteCite` est la citation à afficher à l'utilisateur sur la
 * fiche de résultat ; `sourceArticle` est l'identifiant court (pour
 * `textesLegauxAppliques`).
 */

import type {
	CategorieBatiment,
	CategorieQai,
	ClassementSante,
	DesignationCodeTravail,
	DesignationCreche,
	DesignationRsdt641
} from './types';

export const VERSION = '1.0.0';

/** Conversions. */
export const M3H_PAR_LPS = 3.6;
/** ppm de CO₂ extérieur de référence (NF EN 16798-1). */
export const CO2_EXTERIEUR_DEFAUT_PPM = 400;
/** Émissions CO₂ adulte au repos (NF EN 16798-1 / ANSI ASHRAE 62.1). L/h. */
export const G_CO2_ADULTE_REPOS_LH = 20;

/* ============================================================ */
/*  R4222-6 — Code du Travail, pollution non spécifique          */
/* ============================================================ */

export interface EntreeReferentiel {
	debit: number;
	texteCite: string;
	sourceArticle: string;
}

/**
 * Table R4222-6 : débits minimaux d'air neuf pour locaux à pollution non
 * spécifique sur lieu de travail. Valeurs en m³/h par occupant.
 *
 * Source : Code du Travail, article R4222-6.
 *
 *   - Bureaux, locaux sans travail physique : 25
 *   - Locaux de restauration, locaux de vente, locaux de réunion : 30
 *   - Ateliers et locaux avec travail physique léger : 45
 *   - Autres ateliers et locaux : 60
 */
export const TABLE_R4222_6: Record<DesignationCodeTravail, EntreeReferentiel> = {
	bureau: {
		debit: 25,
		texteCite: 'Code du Travail Art. R4222-6 — bureaux, locaux sans travail physique',
		sourceArticle: 'Code du Travail R4222-6'
	},
	restauration_vente_reunion: {
		debit: 30,
		texteCite: 'Code du Travail Art. R4222-6 — locaux de restauration, de vente, de réunion',
		sourceArticle: 'Code du Travail R4222-6'
	},
	atelier_physique_leger: {
		debit: 45,
		texteCite: 'Code du Travail Art. R4222-6 — ateliers et locaux avec travail physique léger',
		sourceArticle: 'Code du Travail R4222-6'
	},
	atelier_autre: {
		debit: 60,
		texteCite: 'Code du Travail Art. R4222-6 — autres ateliers et locaux',
		sourceArticle: 'Code du Travail R4222-6'
	}
};

/* ============================================================ */
/*  R4212-6 — Code du Travail, sanitaires lieu de travail        */
/* ============================================================ */

/**
 * Table R4212-6 : débits forfaitaires pour locaux sanitaires sur lieu de travail.
 * Valeurs en m³/h par local (ou par équipement, voir détail).
 *
 * Source : Code du Travail, article R4212-6.
 */
export const TABLE_R4212_6 = {
	cabinet_isole: {
		debit: 30,
		texteCite: "Code du Travail Art. R4212-6 — cabinet d'aisances isolé",
		sourceArticle: 'Code du Travail R4212-6'
	},
	salle_bain_isolee: {
		debit: 45,
		texteCite: 'Code du Travail Art. R4212-6 — salle de bains ou douches isolée',
		sourceArticle: 'Code du Travail R4212-6'
	},
	salle_bain_avec_cabinet: {
		debit: 60,
		texteCite: "Code du Travail Art. R4212-6 — salle de bains/douches avec cabinet d'aisances",
		sourceArticle: 'Code du Travail R4212-6'
	},
	groupe_bain_douche: {
		/** 30 m³/h pour le premier équipement + 15 m³/h par équipement supplémentaire. */
		debit: 30,
		debitParEquipementSup: 15,
		texteCite:
			"Code du Travail Art. R4212-6 — bains, douches et cabinets d'aisances groupés (30 + 15 par équipement au-delà du 1er)",
		sourceArticle: 'Code du Travail R4212-6'
	},
	lavabos_groupes: {
		debit: 10,
		texteCite: 'Code du Travail Art. R4212-6 — lavabos groupés (10 m³/h par lavabo)',
		sourceArticle: 'Code du Travail R4212-6'
	}
} as const;

/* ============================================================ */
/*  RSDT 64.1 — ERP pollution non spécifique                     */
/* ============================================================ */

/**
 * Table RSDT 64.1 : débits minimaux d'air neuf pour ERP à pollution non
 * spécifique. Valeurs en m³/h par occupant sauf mention contraire.
 *
 * Source : Règlement Sanitaire Départemental Type, Titre III, article 64.1.
 */
export const TABLE_RSDT_641: Record<DesignationRsdt641, EntreeReferentiel> = {
	enseignement_primaire_college: {
		debit: 15,
		texteCite:
			'RSDT Art. 64.1 — enseignement maternelle, primaire, secondaire 1er cycle (collège)',
		sourceArticle: 'RSDT 64.1'
	},
	enseignement_lycee_universite: {
		debit: 18,
		texteCite: 'RSDT Art. 64.1 — enseignement secondaire 2e cycle (lycée), universitaire',
		sourceArticle: 'RSDT 64.1'
	},
	atelier_enseignement_laboratoire: {
		debit: 18,
		texteCite: "RSDT Art. 64.1 — ateliers d'enseignement et laboratoires (pollution non spécifique)",
		sourceArticle: 'RSDT 64.1'
	},
	bureau: {
		debit: 25,
		texteCite: 'RSDT Art. 64.1 — bureaux et locaux assimilés',
		sourceArticle: 'RSDT 64.1'
	},
	reunion: {
		debit: 18,
		texteCite: 'RSDT Art. 64.1 — locaux de réunion (sans restauration ni spectacle)',
		sourceArticle: 'RSDT 64.1'
	},
	vente: {
		debit: 22,
		texteCite: 'RSDT Art. 64.1 — locaux de vente (commerce)',
		sourceArticle: 'RSDT 64.1'
	},
	restauration: {
		debit: 22,
		texteCite: 'RSDT Art. 64.1 — locaux de restauration (salle de restaurant)',
		sourceArticle: 'RSDT 64.1'
	},
	sport_sportif: {
		debit: 25,
		texteCite: 'RSDT Art. 64.1 — locaux à usage sportif, par sportif',
		sourceArticle: 'RSDT 64.1'
	},
	sport_spectateur: {
		debit: 18,
		texteCite: 'RSDT Art. 64.1 — locaux à usage sportif, par spectateur',
		sourceArticle: 'RSDT 64.1'
	},
	piscine_hall: {
		debit: 22,
		texteCite: 'RSDT Art. 64.1 — piscines, halls',
		sourceArticle: 'RSDT 64.1'
	},
	spectacle_cinema: {
		debit: 30,
		texteCite: 'RSDT Art. 64.1 — salles de spectacle, cinémas, salles polyvalentes',
		sourceArticle: 'RSDT 64.1'
	},
	conference: {
		debit: 30,
		texteCite: 'RSDT Art. 64.1 — salles de réunion type "open meeting" / conférence',
		sourceArticle: 'RSDT 64.1'
	},
	culte: {
		debit: 18,
		texteCite: 'RSDT Art. 64.1 — lieux de culte',
		sourceArticle: 'RSDT 64.1'
	},
	hebergement_chambre: {
		debit: 30,
		texteCite: 'RSDT Art. 64.1 — hébergement, chambres (30 m³/h mini par chambre si < 3 pers.)',
		sourceArticle: 'RSDT 64.1'
	}
};

/* ============================================================ */
/*  RSDT 64.2 — pollution spécifique (sanitaires + cuisines)     */
/* ============================================================ */

/**
 * Table RSDT 64.2 sanitaires ERP. Valeurs en m³/h par équipement.
 *
 * Source : RSDT Art. 64.2.
 */
export const TABLE_RSDT_642_SANITAIRE = {
	cabinet_individuel: {
		debit: 15,
		texteCite: "RSDT Art. 64.2 — cabinet d'aisances individuel",
		sourceArticle: 'RSDT 64.2'
	},
	cabinet_collectif: {
		debit: 30,
		texteCite: "RSDT Art. 64.2 — cabinet d'aisances à usage collectif (par cabinet)",
		sourceArticle: 'RSDT 64.2'
	},
	douche_individuelle: {
		debit: 15,
		texteCite: 'RSDT Art. 64.2 — salle de bains/douches individuelle',
		sourceArticle: 'RSDT 64.2'
	},
	douche_collective: {
		debit: 30,
		texteCite: 'RSDT Art. 64.2 — salle de bains/douches collective (par poste)',
		sourceArticle: 'RSDT 64.2'
	},
	lavabo_isole: {
		debit: 15,
		texteCite: 'RSDT Art. 64.2 — lavabo isolé',
		sourceArticle: 'RSDT 64.2'
	},
	lavabo_groupe: {
		debit: 10,
		texteCite: 'RSDT Art. 64.2 — lavabo groupé (par lavabo)',
		sourceArticle: 'RSDT 64.2'
	}
} as const;

/**
 * Tranches de débit cuisines collectives — RSDT 64.2 + arrêté du 20 janvier
 * 1983. Le débit = `parRepas × N`, plancher = `plancher`.
 *
 * Tranches :
 *   - N < 150  : 25 par repas, plancher 500 m³/h
 *   - 150–500  : 20 par repas
 *   - 501–1500 : 15 par repas
 *   - > 1500   : 10 par repas, plancher 10 000 m³/h
 *
 * Implémentation : pour chaque tranche, on retourne max(parRepas·N, plancher).
 */
export interface TrancheCuisine {
	min: number;
	/** Inclusif ; null = sans plafond. */
	max: number | null;
	parRepas: number;
	plancher: number;
	libelle: string;
}

export const TRANCHES_CUISINE_RSDT_642: TrancheCuisine[] = [
	{ min: 1, max: 149, parRepas: 25, plancher: 500, libelle: '< 150 repas' },
	{ min: 150, max: 500, parRepas: 20, plancher: 0, libelle: '150 à 500 repas' },
	{ min: 501, max: 1500, parRepas: 15, plancher: 0, libelle: '501 à 1 500 repas' },
	{ min: 1501, max: null, parRepas: 10, plancher: 10000, libelle: '> 1 500 repas' }
];

export const TEXTE_CITE_CUISINE_RSDT_642 =
	'RSDT Art. 64.2 + arrêté du 20 janvier 1983 — cuisines collectives, débit selon nombre de repas servis simultanément';

/* ============================================================ */
/*  Crèches — arrêté du 31 août 2021                             */
/* ============================================================ */

/**
 * Table crèches — arrêté du 31 août 2021. Valeurs en m³/h.
 *
 *   - Pièce de vie : 15 par enfant accueilli
 *   - Dortoir : 15 par enfant
 *   - Local de change : 20 par poste de change
 *
 * Source : Arrêté du 31 août 2021 relatif aux normes applicables aux EAJE.
 */
export const TABLE_CRECHE: Record<DesignationCreche, EntreeReferentiel> = {
	piece_vie: {
		debit: 15,
		texteCite: "Arrêté 31/08/2021 — pièces de vie (par enfant accueilli)",
		sourceArticle: 'Arrêté 31/08/2021'
	},
	dortoir: {
		debit: 15,
		texteCite: 'Arrêté 31/08/2021 — dortoirs (par enfant)',
		sourceArticle: 'Arrêté 31/08/2021'
	},
	change: {
		debit: 20,
		texteCite: 'Arrêté 31/08/2021 — local de change (par poste)',
		sourceArticle: 'Arrêté 31/08/2021'
	}
};

/* ============================================================ */
/*  NF S 90-351 — santé, zones à risque infectieux               */
/* ============================================================ */

/**
 * Table NF S 90-351:2013 — taux de renouvellement d'air minimal par classement
 * de zone à risque biocontamination. Valeurs indicatives — la classification
 * définitive relève d'un bureau d'études spécialisé en environnement
 * hospitalier.
 *
 *   - Risque 4 : bloc op ultra-propre, ≥ 50 vol/h ou flux laminaire, +15 Pa
 *   - Risque 3 : bloc op standard / soins intensifs, 25 vol/h (médiane 20-30)
 *   - Risque 2 : chambres protégées / néonatologie, 13 vol/h (médiane 10-15)
 *   - Risque 1 : locaux courants — pas de contrainte vol/h, RSDT/CT s'applique
 *
 * Source : NF S 90-351:2013, Annexe A.
 */
export interface EntreeSante {
	tauxRenouvellement_volh: number | null;
	surpressionMini_Pa: number | null;
	texteCite: string;
	sourceArticle: string;
}

export const TABLE_NFS_90351: Record<ClassementSante, EntreeSante> = {
	4: {
		tauxRenouvellement_volh: 50,
		surpressionMini_Pa: 15,
		texteCite:
			'NF S 90-351:2013 — zone à risque 4 (bloc op ultra-propre) : ≥ 50 vol/h ou flux laminaire, surpression +15 Pa',
		sourceArticle: 'NF S 90-351:2013'
	},
	3: {
		tauxRenouvellement_volh: 25,
		surpressionMini_Pa: 15,
		texteCite:
			'NF S 90-351:2013 — zone à risque 3 (bloc op standard, soins intensifs) : 20–30 vol/h, surpression +15 Pa',
		sourceArticle: 'NF S 90-351:2013'
	},
	2: {
		tauxRenouvellement_volh: 13,
		surpressionMini_Pa: 15,
		texteCite:
			'NF S 90-351:2013 — zone à risque 2 (chambres protégées, néonatologie) : 10–15 vol/h, surpression +15 Pa',
		sourceArticle: 'NF S 90-351:2013'
	},
	1: {
		tauxRenouvellement_volh: null,
		surpressionMini_Pa: null,
		texteCite:
			'NF S 90-351:2013 — zone à risque 1 (locaux courants) : pas de contrainte vol/h, RSDT/Code Travail applicable',
		sourceArticle: 'NF S 90-351:2013'
	}
};

/* ============================================================ */
/*  NF EN 16798-1 méthode 1                                      */
/* ============================================================ */

/**
 * Débit par occupant q_p selon catégorie QAI. Valeurs en m³/h/personne.
 *
 * Source : NF EN 16798-1:2019, Annexe B, tableau B.6.
 * Conversion 1 L/s = 3.6 m³/h.
 *
 *   - QAI 1 (haute) : 10 L/s/pers = 36 m³/h
 *   - QAI 2         :  7 L/s/pers = 25.2 m³/h
 *   - QAI 3 (mini)  :  4 L/s/pers = 14.4 m³/h
 *   - QAI 4 (médiocre) : 2.8 L/s/pers ≈ 10 m³/h
 */
export const QP_NF_EN_16798: Record<CategorieQai, number> = {
	QAI1: 36,
	QAI2: 25.2,
	QAI3: 14.4,
	QAI4: 10
};

/**
 * Débit surfacique q_B selon catégorie QAI × catégorie bâtiment. m³/h/m².
 *
 * Source : NF EN 16798-1:2019, Annexe B, tableau B.6.
 *
 *   - B1 (très peu polluant) : QAI 2 = 0.5 L/s/m² = 1.8 m³/h/m²
 *   - B2 (peu polluant)      : QAI 2 = 1.0 L/s/m² = 3.6 m³/h/m²
 *   - B3 (non polluant connu): QAI 2 = 2.0 L/s/m² = 7.2 m³/h/m²
 *
 * Échelle entre catégories QAI : on applique le même facteur q_p_QAIX/q_p_QAI2.
 */
const FACTEURS_QAI_VS_QAI2: Record<CategorieQai, number> = {
	QAI1: QP_NF_EN_16798.QAI1 / QP_NF_EN_16798.QAI2,
	QAI2: 1,
	QAI3: QP_NF_EN_16798.QAI3 / QP_NF_EN_16798.QAI2,
	QAI4: QP_NF_EN_16798.QAI4 / QP_NF_EN_16798.QAI2
};

const QB_NF_EN_16798_QAI2: Record<CategorieBatiment, number> = {
	B1: 1.8,
	B2: 3.6,
	B3: 7.2
};

export function qBatNfEn16798(qai: CategorieQai, bat: CategorieBatiment): number {
	return QB_NF_EN_16798_QAI2[bat] * FACTEURS_QAI_VS_QAI2[qai];
}

/* ============================================================ */
/*  Seuils de verdict CO₂ (NF EN 16798 / bonnes pratiques QAI)   */
/* ============================================================ */

/** Cible — ventilation correcte selon NF EN 16798 catégorie II. */
export const CO2_CIBLE_PPM = 1000;
/** Acceptable — catégorie III (HCSP avis 2024 mentionne 1300 ppm en seuil d'alerte). */
export const CO2_ACCEPTABLE_PPM = 1300;
/** Critique — catégorie IV, ventilation très insuffisante. */
export const CO2_CRITIQUE_PPM = 1500;

/* ============================================================ */
/*  Émissions CO₂ par profil + activité                          */
/* ============================================================ */

/**
 * Émissions de CO₂ par occupant (L/h) selon profil et niveau d'activité.
 *
 * Source : NF EN 16798-1:2019, Annexe C — production métabolique de CO₂.
 *
 *   - Adulte au repos / sédentaire : 20 L/h
 *   - Adulte activité légère : 25
 *   - Adulte activité modérée : 35
 *   - Adulte activité intense : 50
 *   - Enfant repos / sédentaire (école primaire) : 10
 *   - Enfant activité légère : 15
 *   - Enfant activité modérée : 20
 *   - Enfant activité intense : 25
 */
export const EMISSIONS_CO2_LH = {
	adulte: { repos: 20, leger: 25, modere: 35, intense: 50 },
	enfant: { repos: 10, leger: 15, modere: 20, intense: 25 }
} as const;

/* ============================================================ */
/*  Tolérance équilibre CTA                                      */
/* ============================================================ */

/** Au-delà de ±10 %, on alerte sur le déséquilibre insufflation/extraction. */
export const TOLERANCE_EQUILIBRE_PCT = 10;
