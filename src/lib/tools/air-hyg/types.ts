/**
 * Types du module Débit d'air hygiénique — bâtiments tertiaires, ERP, santé,
 * enseignement, restauration, sport, industrie.
 *
 * Périmètre : France, hors logement (Arrêté 24 mars 1982 hors scope).
 *
 * Toutes les grandeurs sont en SI sauf indication explicite dans le nom de champ
 * (suffixe d'unité : `_m3h`, `_lps`, `_volh`, `_ppm`, `_m2`, `_m3`, `_lh`).
 */

/* ============================================================ */
/*  Référentiels et désignations                                 */
/* ============================================================ */

export type Referentiel =
	| 'code_travail'
	| 'rsdt_641'
	| 'rsdt_642'
	| 'creche'
	| 'sante_nfs90351';

/** Clé dans la table R4222-6 (Code du Travail — pollution non spécifique). */
export type DesignationCodeTravail =
	| 'bureau'
	| 'restauration_vente_reunion'
	| 'atelier_physique_leger'
	| 'atelier_autre';

/** Clé dans la table RSDT 64.1 (ERP — pollution non spécifique). */
export type DesignationRsdt641 =
	| 'enseignement_primaire_college'
	| 'enseignement_lycee_universite'
	| 'atelier_enseignement_laboratoire'
	| 'bureau'
	| 'reunion'
	| 'vente'
	| 'restauration'
	| 'sport_sportif'
	| 'sport_spectateur'
	| 'piscine_hall'
	| 'spectacle_cinema'
	| 'conference'
	| 'culte'
	| 'hebergement_chambre';

/** Clé dans la table arrêté 31/08/2021 — crèches. */
export type DesignationCreche = 'piece_vie' | 'dortoir' | 'change';

/** Profil émetteur de CO₂. */
export type ActivitePhysique = 'repos' | 'leger' | 'modere' | 'intense';
export type ProfilOccupant = 'adulte' | 'enfant';

/** Zone fonctionnelle du local (oriente la saisie UI + paramètres spécifiques). */
export type ZoneLocal =
	| 'tertiaire_bureau'
	| 'enseignement'
	| 'sante'
	| 'restauration'
	| 'commerce'
	| 'sport'
	| 'spectacle'
	| 'industrie'
	| 'hebergement'
	| 'creche'
	| 'sanitaire'
	| 'cuisine_collective'
	| 'circulation'
	| 'autre';

/** Classification NF S 90-351 — zones à risque infectieux santé. */
export type ClassementSante = 1 | 2 | 3 | 4;

/** Catégories qualité d'air intérieur NF EN 16798-1 méthode 1. */
export type CategorieQai = 'QAI1' | 'QAI2' | 'QAI3' | 'QAI4';

/** Catégories émissions matériaux NF EN 16798-1 méthode 1. */
export type CategorieBatiment = 'B1' | 'B2' | 'B3';

/* ============================================================ */
/*  Entrées                                                      */
/* ============================================================ */

export interface Population {
	libelle: string;
	nbOccupants: number;
	referentiel: Exclude<Referentiel, 'sante_nfs90351'>;
	/** Clé dans la table du référentiel choisi. */
	designationLocal: string;
	/** Optionnel : si non renseigné, dérivé du profil et de l'activité. L/h. */
	emissionCO2_lh?: number;
	profil?: ProfilOccupant;
	activite?: ActivitePhysique;
}

export interface ParametresSpecifiques {
	/** Cuisine collective — repas servis simultanément. */
	nbRepasSimultanes?: number;
	/** Sanitaires — nombre de cabinets d'aisances. */
	nbCabinets?: number;
	/** Sanitaires — nombre de lavabos groupés. */
	nbLavabos?: number;
	/** Sanitaires — nombre de douches. */
	nbDouches?: number;
	/** Sanitaires — collectif (true) vs individuel (false). Défaut : collectif. */
	collectif?: boolean;
	/** Crèche — nombre de postes de change. */
	nbPostesChange?: number;
	/** Santé — classement de la zone NF S 90-351. */
	classementZoneSante?: ClassementSante;
}

export interface InstallationExistante {
	/** Débit d'air neuf installé sur le local — pour vérification de conformité. */
	debitInstalle_m3h: number;
}

export interface Local {
	id: string;
	libelle: string;
	zone: ZoneLocal;
	/** m² */
	surface_m2: number;
	/** m — obligatoire (V1). */
	hauteurSousPlafond_m: number;
	populations: Population[];
	parametresSpecifiques?: ParametresSpecifiques;
	installationExistante?: InstallationExistante;
}

export interface ProjetOptions {
	methodeCalcul: 'reglementaire_fr' | 'nf_en_16798' | 'les_deux';
	categorieQaiCible: CategorieQai;
	categorieBatiment: CategorieBatiment;
	/** ppm — défaut 400. */
	co2Exterieur_ppm: number;
	afficherComparaisonEuropeenne: boolean;
}

export interface Projet {
	libelle: string;
	options: ProjetOptions;
	locaux: Local[];
}

/* ============================================================ */
/*  Sorties                                                      */
/* ============================================================ */

export type Verdict = 'conforme' | 'acceptable_avec_reserves' | 'non_conforme';
export type VerdictVerification = 'conforme' | 'limite' | 'non_conforme';

export interface DebitPopulation {
	libelle: string;
	referentiel: Referentiel;
	texteCite: string;
	nbOccupants: number;
	debitUnitaire_m3h_occupant: number;
	debitTotal_m3h: number;
}

export type BaseForfaitaire =
	| 'nb_repas'
	| 'nb_cabinets'
	| 'nb_lavabos'
	| 'nb_douches'
	| 'nb_postes_change'
	| 'taux_renouvellement'
	| 'surface';

export interface DebitForfaitaire {
	libelle: string;
	texteCite: string;
	base: BaseForfaitaire;
	quantite: number;
	debitTotal_m3h: number;
}

export interface ComparaisonNfEn16798 {
	debitQAI1_m3h: number;
	debitQAI2_m3h: number;
	debitQAI3_m3h: number;
	/** Ratio mini FR / QAI 2 — < 1 = en deçà du standard européen. */
	ratioMiniFrSurQAI2: number;
}

export interface VerificationExistante {
	debitInstalle_m3h: number;
	ecart_m3h: number;
	ecart_pct: number;
	verdict: VerdictVerification;
}

export type NiveauMessage = 'info' | 'warning' | 'error';

export interface Message {
	code: string;
	niveau: NiveauMessage;
	message: string;
	local: string | null;
	valeur: number | null;
	seuil: number | null;
}

export type Warning = Message & { niveau: 'info' | 'warning' };
export type ErrorEntry = Message & { niveau: 'error' };

export interface NatureLocal {
	/** Le local est-il à pollution spécifique (sanitaire, cuisine) ? */
	pollutionSpecifique: boolean;
	/** Sens du flux principal : insufflation (air neuf), extraction, ou mixte. */
	flux: 'insufflation' | 'extraction';
}

export interface ResultatLocal {
	id: string;
	libelle: string;
	zone: ZoneLocal;
	nature: NatureLocal;

	surface_m2: number;
	volume_m3: number;

	debitsParPopulation: DebitPopulation[];
	debitsForfaitaires: DebitForfaitaire[];

	debitTotalLocal_m3h: number;
	debitTotalLocal_lps: number;
	tauxRenouvellement_volh: number;
	co2Equilibre_ppm: number;

	comparaisonNfEn16798: ComparaisonNfEn16798;
	verification?: VerificationExistante;

	warnings: Warning[];
	sources: string[];

	verdict: Verdict;
}

export interface Resume {
	debitTotalAirNeuf_m3h: number;
	debitTotalExtraction_m3h: number;
	/** (insufflé - extrait) / insufflé × 100. Positif = surpression bâtiment. */
	equilibreAirAirExtrait_pct: number;
	nbLocaux: number;
	nbOccupantsTotal: number;
	verdictGlobal: Verdict;
	co2MoyenAttendu_ppm: number;
	nbWarnings: number;
	nbErrors: number;
}

export interface Resultat {
	projet: { libelle: string; dateCalcul: string; version: string; sources: string[] };
	resume: Resume;
	detail: { locaux: ResultatLocal[] };
	warnings: Warning[];
	errors: ErrorEntry[];
	textesLegauxAppliques: string[];
}

export interface ValidationOutcome {
	valid: boolean;
	errors: ErrorEntry[];
	warnings: Warning[];
}
