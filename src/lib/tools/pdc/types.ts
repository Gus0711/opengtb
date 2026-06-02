/**
 * Types du module Pertes de Charge hydrauliques.
 *
 * Toutes les grandeurs physiques sont en SI sauf indication explicite par
 * suffixe d'unité dans le nom de champ (ex : `kPa`, `mCE`, `m3h`, `Mm`,
 * `bar`).
 */

/* ============================================================ */
/*  Fluide                                                       */
/* ============================================================ */

export type FluidId = 'eau' | 'meg' | 'mpg';

export type LambdaMethod = 'serghides' | 'colebrook' | 'haaland';

export type PresetId =
	| 'radiateurs'
	| 'plancher'
	| 'pac'
	| 'ecs'
	| 'eau_glacee'
	| 'geothermie'
	| 'personnalise';

export interface FluideInput {
	type: FluidId;
	/** % volumique de glycol (0–50). Requis si type = 'meg' ou 'mpg'. */
	glycolPct?: number;
	/** °C */
	temperature: number;
}

export interface FluidProps {
	/** kg/m³ */
	rho: number;
	/** m²/s (viscosité cinématique) */
	nu: number;
	/** Pa·s (viscosité dynamique = ρ·ν) */
	mu: number;
	/** kWh/(m³·K) — `ρ · cp / 3600` */
	cpVolumique: number;
	/** Origine et précision de l'interpolation utilisée (traçabilité). */
	source: string;
}

/* ============================================================ */
/*  Tube — désignation et matériau                               */
/* ============================================================ */

export type MateriauId =
	| 'cuivre_neuf'
	| 'cuivre_vieilli'
	| 'acier_noir_neuf'
	| 'acier_noir_usage'
	| 'acier_galvanise'
	| 'acier_inox_poli'
	| 'fonte_neuve'
	| 'fonte_vieillie'
	| 'pvc'
	| 'per'
	| 'pehd'
	| 'multicouche';

export interface Designation {
	/** Identifiant unique au sein du matériau (ex : "28x1.5", "DN25"). */
	id: string;
	/** Libellé d'affichage (ex : "28×1.5", "DN 25 (1")"). */
	label: string;
	/** mm */
	extMm: number;
	/** mm */
	epMm: number;
	/** mm */
	intMm: number;
}

export interface DiametreInput {
	mode: 'designation' | 'manuel';
	materiau: MateriauId;
	/** Si mode = 'designation'. */
	designation?: string;
	/** Si mode = 'manuel', soit (ext + ep), soit (int direct). */
	diametreExtMm?: number;
	epaisseurMm?: number;
	diametreIntMm?: number;
	/** Optionnel — override de la rugosité absolue [mm]. */
	rugositeMm?: number;
}

/* ============================================================ */
/*  Tronçon et accessoires                                       */
/* ============================================================ */

export type TronconType = 'chaufferie' | 'dorsale' | 'colonne' | 'raccordement' | 'autre';

export interface DebitInput {
	mode: 'manuel' | 'puissance';
	/** m³/h, si mode = 'manuel'. */
	valeurM3h?: number;
	/** kW, si mode = 'puissance'. */
	puissanceKw?: number;
	/** K, si mode = 'puissance' (sinon hérité du préset). */
	deltaTk?: number;
}

export type AccessoireType =
	/** Clés de la table ζ par défaut. */
	| 'coude_90_grand_rayon'
	| 'coude_90_petit_rayon'
	| 'coude_90_angle_vif'
	| 'coude_45_standard'
	| 'coude_45_angle_vif'
	| 'te_passage_direct'
	| 'te_derivation_laterale'
	| 'te_convergent_passage'
	| 'te_convergent_derivation'
	| 'reduction_progressive'
	| 'elargissement_progressif'
	| 'reduction_brusque'
	| 'elargissement_brusque'
	| 'entree_arete_vive'
	| 'entree_arrondie'
	| 'sortie_vers_reservoir'
	| 'vanne_boisseau'
	| 'vanne_papillon'
	| 'vanne_droite'
	| 'vanne_equerre'
	| 'clapet_battant'
	| 'clapet_disque'
	| 'filtre_y'
	| 'crepine'
	/** Accessoire à ζ saisi manuellement. */
	| 'custom'
	/** Vanne caractérisée par son Kvs (NF EN 60534-2-1). */
	| 'vanne_kvs'
	/** Équipement terminal : ΔP fabricant + Q nominal → loi parabolique. */
	| 'equipement_dp';

export interface Accessoire {
	type: AccessoireType;
	/** Nombre d'occurrences (entier ≥ 1). */
	quantite: number;
	/** Libellé libre (ex : "Coude pied de colonne"). */
	libelle?: string;
	/** Requis si type = 'custom'. */
	zetaCustom?: number;
	/** Requis si type = 'vanne_kvs' (m³/h). */
	kvs?: number;
	/** Requis si type = 'equipement_dp' (kPa). */
	dpNominaleKpa?: number;
	/** Requis si type = 'equipement_dp' (m³/h). */
	debitNominalM3h?: number;
	/** Pour équilibrage Borda sur élargissement brusque : ratio S1/S2 = (D1/D2)². */
	sectionAvalRatio?: number;
}

export interface Troncon {
	id: string;
	/** Ordre de parcours (1, 2, 3...). */
	ordre: number;
	libelle: string;
	type: TronconType;
	/** m */
	longueur: number;
	diametre: DiametreInput;
	debit: DebitInput;
	accessoires: Accessoire[];
}

/* ============================================================ */
/*  Circuit (entrée principale)                                  */
/* ============================================================ */

export interface CircuitOptions {
	/** Défaut : 'serghides'. */
	methodeLambda?: LambdaMethod;
	/** Si vrai, longueurs et accessoires sont comptés ×2 (sauf equipement_dp). */
	circuitFermeSymetrique?: boolean;
	/** Tolérance Colebrook (défaut 1e-10). */
	toleranceColebrook?: number;
	/** Iterations max Colebrook (défaut 50). */
	maxIterColebrook?: number;
}

export interface Circuit {
	preset: PresetId;
	fluide: FluideInput;
	options?: CircuitOptions;
	troncons: Troncon[];
}

/* ============================================================ */
/*  Résultats                                                    */
/* ============================================================ */

export type Verdict = 'ok' | 'limite' | 'rejete';

export type Regime = 'laminaire' | 'transitoire' | 'turbulent';

export interface DpUnits {
	Pa: number;
	kPa: number;
	mCE: number;
}

export interface DpUnitsFull extends DpUnits {
	bar: number;
}

export interface ResultatAccessoire {
	type: AccessoireType;
	libelle: string | null;
	quantite: number;
	zetaUtilise: number;
	source: 'table' | 'custom' | 'kvs' | 'equipement_dp';
	dpUnitairePa: number;
	dpTotalPa: number;
	warning: string | null;
}

export interface ResultatTroncon {
	id: string;
	ordre: number;
	libelle: string;
	type: TronconType;

	diametreIntMm: number;
	rugositeMm: number;
	rugositeRelative: number;

	/** Longueur APRÈS doublement éventuel par circuitFermeSymetrique. */
	longueurReelleM: number;

	debitM3h: number;
	debitMs: number;
	vitesseMs: number;
	reynolds: number;
	regime: Regime;
	methodeLambda: LambdaMethod;
	lambda: number;

	dpLineiquePaParM: number;
	dpLineaire: DpUnits;

	accessoires: ResultatAccessoire[];
	dpSinguliereTotal: DpUnits;
	dpEquipementsTotal: DpUnits;

	dpTronconTotal: DpUnits;
	partDuTotalPct: number;

	verdictVitesse: Verdict;
	verdictDpLineique: Verdict;

	warnings: Warning[];

	suggestionDN?: string;
}

export interface ResumeResultat {
	hmtTotale: DpUnitsFull;
	dpLineaireTotale: DpUnits;
	dpSinguliereTotale: DpUnits;
	dpEquipementsTotale: DpUnits;
	vitesseMin: number;
	vitesseMax: number;
	dpLineiqueMoyennePaParM: number;
	tronconLePlusPenalisant: {
		id: string;
		libelle: string;
		partDuTotalPct: number;
	} | null;
	repartitionPct: {
		lineaire: number;
		singuliere: number;
		equipements: number;
	};
	verdictGlobal: Verdict;
	nbWarnings: number;
	nbErrors: number;
}

export interface AccessoireAggrege {
	type: AccessoireType;
	quantiteTotale: number;
	dpTotalePa: number;
}

export interface DetailResultat {
	troncons: ResultatTroncon[];
	accessoiresAgreges: AccessoireAggrege[];
}

export interface Warning {
	code: string;
	niveau: 'info' | 'warning';
	message: string;
	troncon: string | null;
	valeur: number | null;
	seuil: number | null;
}

export interface ErrorEntry {
	code: string;
	niveau: 'error';
	message: string;
	troncon: string | null;
	valeur: number | null;
	seuil: number | null;
}

export interface Resultat {
	fluide: FluidProps;
	resume: ResumeResultat;
	detail: DetailResultat;
	warnings: Warning[];
	errors: ErrorEntry[];
}

/* ============================================================ */
/*  Auto-dim                                                     */
/* ============================================================ */

export interface AutoDimInput {
	materiau: MateriauId;
	debit: DebitInput;
	fluide: FluideInput;
	criteres: {
		vitesseMaxMs?: number;
		dpLineiqueMaxPaParM?: number;
	};
}

export interface AutoDimTentative {
	designation: string;
	diametreIntMm: number;
	vitesseMs: number;
	reynolds: number;
	lambda: number;
	dpLineiquePaParM: number;
	respecteCriteres: boolean;
	echecsCriteres: string[];
}

export interface AutoDimResultat {
	succes: boolean;
	retenue: AutoDimTentative | null;
	tropPetite: AutoDimTentative | null;
	tropGrande: AutoDimTentative | null;
	debitUtiliseM3h: number;
	fluide: FluidProps;
	message: string;
}
