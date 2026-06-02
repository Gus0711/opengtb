/**
 * Constantes physiques, table ζ par défaut, rugosités absolues, présets de
 * circuit, seuils par type de tronçon.
 *
 * Toute valeur "magique" qui ressort dans un calcul doit être ici.
 */

import type {
	AccessoireType,
	MateriauId,
	PresetId,
	FluidId,
	TronconType
} from './types';

/* ============================================================ */
/*  Constantes physiques                                         */
/* ============================================================ */

/**
 * Accélération normale de la pesanteur (CIPM 1901, valeur conventionnelle
 * exacte). À utiliser systématiquement à la place de 9.81 pour garantir
 * la cohérence avec la définition du mètre de colonne d'eau :
 *   1 mCE = ρ_eau · g · 1 m = 1000 · 9.80665 = 9806.65 Pa exact.
 */
export const G = 9.80665;

/** Conversion Pa → mCE quand ρ_eau = 1000 kg/m³. */
export const PA_PAR_MCE = 1000 * G; // 9806.65

/** Conversion bar ↔ Pa. */
export const PA_PAR_BAR = 100_000;

/** Conversion m³/h ↔ m³/s. */
export const SEC_PAR_HEURE = 3600;

/* ============================================================ */
/*  Table ζ par défaut                                           */
/* ============================================================ */

/**
 * Coefficients de pertes singulières par défaut.
 *
 * Sources :
 *   - I.E. Idel'cik, *Mémento des pertes de charge*, Eyrolles
 *   - Crane Co. Technical Paper TP-410, *Flow of Fluids through Valves,
 *     Fittings, and Pipe*
 *   - Suez Water Handbook — chapitre "Pertes de charge singulières"
 *   - ABCclim — Tables de coefficients ζ pour CVC
 *
 * Vitesse de référence : vitesse dans le tronçon où l'accessoire est posé,
 * sauf "elargissement_brusque" où la formule de Borda `ζ = (1 - S1/S2)²` est
 * utilisée (S1 amont, S2 aval) — voir `pertes.ts`.
 */
export const ZETA_TABLE: Record<Exclude<AccessoireType, 'custom' | 'vanne_kvs' | 'equipement_dp'>, number> = {
	coude_90_grand_rayon: 0.2,
	coude_90_petit_rayon: 0.3,
	coude_90_angle_vif: 1.1,
	coude_45_standard: 0.18,
	coude_45_angle_vif: 0.4,
	te_passage_direct: 0.2,
	te_derivation_laterale: 1.0,
	te_convergent_passage: 0.5,
	te_convergent_derivation: 1.5,
	reduction_progressive: 0.1,
	elargissement_progressif: 0.2,
	reduction_brusque: 0.5,
	elargissement_brusque: 0, // calculé via formule de Borda (sectionAvalRatio)
	entree_arete_vive: 0.5,
	entree_arrondie: 0.05,
	sortie_vers_reservoir: 1.0,
	vanne_boisseau: 0.05,
	vanne_papillon: 0.3,
	vanne_droite: 5.0,
	vanne_equerre: 3.0,
	clapet_battant: 2.5,
	clapet_disque: 10.0,
	filtre_y: 2.0,
	crepine: 2.5
};

/** Libellés français pour l'UI. */
export const ACCESSOIRES_LABELS: Record<AccessoireType, string> = {
	coude_90_grand_rayon: 'Coude 90° grand rayon (R/D ≥ 1.5)',
	coude_90_petit_rayon: 'Coude 90° petit rayon (R/D = 1)',
	coude_90_angle_vif: 'Coude 90° angle vif',
	coude_45_standard: 'Coude 45° standard',
	coude_45_angle_vif: 'Coude 45° angle vif',
	te_passage_direct: 'Té passage direct',
	te_derivation_laterale: 'Té dérivation latérale',
	te_convergent_passage: 'Té convergent — passage',
	te_convergent_derivation: 'Té convergent — dérivation',
	reduction_progressive: 'Réduction progressive',
	elargissement_progressif: 'Élargissement progressif',
	reduction_brusque: 'Réduction brusque',
	elargissement_brusque: 'Élargissement brusque (Borda)',
	entree_arete_vive: 'Entrée arête vive',
	entree_arrondie: 'Entrée arrondie',
	sortie_vers_reservoir: 'Sortie vers réservoir',
	vanne_boisseau: 'Vanne à boisseau, pleine ouverte',
	vanne_papillon: 'Vanne papillon, pleine ouverte',
	vanne_droite: 'Vanne droite, pleine ouverte',
	vanne_equerre: 'Vanne équerre, pleine ouverte',
	clapet_battant: 'Clapet anti-retour à battant',
	clapet_disque: 'Clapet anti-retour à disque',
	filtre_y: 'Filtre Y standard',
	crepine: 'Crépine',
	custom: 'Accessoire personnalisé (ζ saisi)',
	vanne_kvs: 'Vanne caractérisée par Kvs',
	equipement_dp: 'Équipement terminal (ΔP fabricant)'
};

/* ============================================================ */
/*  Rugosités absolues                                           */
/* ============================================================ */

/**
 * Rugosité absolue ε [mm] par matériau.
 *
 * Sources :
 *   - Crane Co. TP-410 (édition 2013), Appendix A "Pipe roughness values"
 *   - Pump Fundamentals — pipe roughness reference table
 *   - F. White, *Fluid Mechanics* 7e édition, table 6.1
 *   - Constructeurs PER/multicouche : Rehau, Comap (≈ 0.007 mm)
 *
 * Les "neuf" et "vieilli" couvrent l'évolution typique en exploitation :
 *   - acier noir : ε passe de 0.046 (neuf) à 0.2 mm en 10-20 ans (boues)
 *   - cuivre : 0.0015 (neuf laminé) à 0.03 mm après dépôt entartrage
 *   - fonte : 0.25 (neuve) à 1.0 mm (incrustations)
 */
export const RUGOSITE_TABLE: Record<MateriauId, number> = {
	cuivre_neuf: 0.0015,
	cuivre_vieilli: 0.03,
	acier_noir_neuf: 0.046,
	acier_noir_usage: 0.2,
	acier_galvanise: 0.15,
	acier_inox_poli: 0.015,
	fonte_neuve: 0.25,
	fonte_vieillie: 1.0,
	pvc: 0.0015,
	per: 0.0015,
	pehd: 0.0015,
	multicouche: 0.007
};

export const MATERIAU_LABELS: Record<MateriauId, string> = {
	cuivre_neuf: 'Cuivre neuf',
	cuivre_vieilli: 'Cuivre vieilli',
	acier_noir_neuf: 'Acier noir neuf',
	acier_noir_usage: 'Acier noir usagé',
	acier_galvanise: 'Acier galvanisé',
	acier_inox_poli: 'Acier inox poli',
	fonte_neuve: 'Fonte neuve',
	fonte_vieillie: 'Fonte vieillie',
	pvc: 'PVC pression',
	per: 'PER',
	pehd: 'PEHD',
	multicouche: 'Multicouche (PE-Al-PE)'
};

/* ============================================================ */
/*  Présets                                                      */
/* ============================================================ */

export interface Preset {
	id: PresetId;
	label: string;
	fluide: FluidId;
	glycolPct: number;
	/** °C */
	temperature: number;
	/** K — ΔT par défaut, propagé aux tronçons en mode débit=puissance. */
	deltaTk: number;
}

export const PRESETS: Preset[] = [
	{
		id: 'radiateurs',
		label: 'Chauffage radiateurs',
		fluide: 'eau',
		glycolPct: 0,
		temperature: 70,
		deltaTk: 20
	},
	{
		id: 'plancher',
		label: 'Chauffage plancher chauffant',
		fluide: 'eau',
		glycolPct: 0,
		temperature: 40,
		deltaTk: 7
	},
	{
		id: 'pac',
		label: 'Chauffage PAC',
		fluide: 'eau',
		glycolPct: 0,
		temperature: 45,
		deltaTk: 7
	},
	{
		id: 'ecs',
		label: 'ECS bouclage',
		fluide: 'eau',
		glycolPct: 0,
		temperature: 55,
		deltaTk: 5
	},
	{
		id: 'eau_glacee',
		label: 'Eau glacée',
		fluide: 'meg',
		glycolPct: 30,
		temperature: 7,
		deltaTk: 5
	},
	{
		id: 'geothermie',
		label: 'Géothermie',
		fluide: 'meg',
		glycolPct: 30,
		temperature: 5,
		deltaTk: 4
	},
	{
		id: 'personnalise',
		label: 'Personnalisé',
		fluide: 'eau',
		glycolPct: 0,
		temperature: 70,
		deltaTk: 20
	}
];

export const getPreset = (id: PresetId): Preset =>
	PRESETS.find((p) => p.id === id) ?? PRESETS[0];

/* ============================================================ */
/*  Seuils par type de tronçon                                   */
/* ============================================================ */

/**
 * Plages "règles de l'art" pour vitesse [m/s] et ΔP linéique [Pa/m] selon
 * le type de tronçon.
 *
 * Sources :
 *   - NF EN 12828+A1:2014 — Systèmes de chauffage — Conception
 *   - XPair — guide de dimensionnement réseaux chauffage
 *   - Guide Bâtiment Durable Bruxelles (Bruxelles Environnement)
 *
 * Ces seuils n'influencent **pas** le calcul de λ ou ΔP : ils déterminent
 * uniquement les verdicts par tronçon ("ok" / "limite" / "rejeté").
 */
export interface SeuilsTroncon {
	vitesseOkMin: number;
	vitesseOkMax: number;
	dpLineiqueOkMin: number;
	dpLineiqueOkMax: number;
}

export const SEUILS_PAR_TYPE: Record<TronconType, SeuilsTroncon> = {
	chaufferie: { vitesseOkMin: 0.8, vitesseOkMax: 2.0, dpLineiqueOkMin: 150, dpLineiqueOkMax: 400 },
	dorsale: { vitesseOkMin: 0.8, vitesseOkMax: 1.5, dpLineiqueOkMin: 150, dpLineiqueOkMax: 300 },
	colonne: { vitesseOkMin: 0.5, vitesseOkMax: 1.2, dpLineiqueOkMin: 100, dpLineiqueOkMax: 250 },
	raccordement: {
		vitesseOkMin: 0.3,
		vitesseOkMax: 0.8,
		dpLineiqueOkMin: 50,
		dpLineiqueOkMax: 200
	},
	autre: { vitesseOkMin: 0.5, vitesseOkMax: 1.5, dpLineiqueOkMin: 100, dpLineiqueOkMax: 250 }
};

export const TRONCON_TYPE_LABELS: Record<TronconType, string> = {
	chaufferie: 'Chaufferie / primaire',
	dorsale: 'Dorsale principale',
	colonne: 'Colonne montante',
	raccordement: 'Raccordement émetteur',
	autre: 'Autre / non spécifié'
};

/**
 * Limites absolues (warnings forts), indépendantes du type de tronçon.
 *
 *   - V > 2.0 m/s sur cuivre → érosion-corrosion (Eurovent, CSTB)
 *   - V > 3.0 m/s tous matériaux → bruit, vibration (NF EN 12828)
 *   - V < 0.2 m/s → embouage, désaérage difficile (Guide AICVF)
 */
export const VITESSE_LIMITE_CUIVRE = 2.0;
export const VITESSE_LIMITE_ABSOLUE = 3.0;
export const VITESSE_LIMITE_BAS = 0.2;

/* ============================================================ */
/*  Régimes d'écoulement                                         */
/* ============================================================ */

export const RE_LAMINAIRE_MAX = 2300;
export const RE_TURBULENT_MIN = 4000;

/* ============================================================ */
/*  Bornes équipement_dp                                         */
/* ============================================================ */

/** Plage de validité de la loi parabolique ΔP_réel = ΔP_nom · (Q/Q_nom)². */
export const EQUIPEMENT_DP_Q_MIN_RATIO = 0.3;
export const EQUIPEMENT_DP_Q_MAX_RATIO = 2.0;

/* ============================================================ */
/*  Codes d'erreurs et warnings                                  */
/* ============================================================ */

export const ERROR_CODES = {
	INVALID_DIAMETER: 'INVALID_DIAMETER',
	INVALID_LENGTH: 'INVALID_LENGTH',
	INVALID_FLOW: 'INVALID_FLOW',
	TEMPERATURE_OUT_OF_RANGE: 'TEMPERATURE_OUT_OF_RANGE',
	INCONSISTENT_FLUID: 'INCONSISTENT_FLUID',
	UNKNOWN_MATERIAL: 'UNKNOWN_MATERIAL',
	UNKNOWN_DESIGNATION: 'UNKNOWN_DESIGNATION',
	MISSING_ZETA: 'MISSING_ZETA',
	MISSING_KVS: 'MISSING_KVS',
	MISSING_DP_NOMINAL: 'MISSING_DP_NOMINAL',
	UNKNOWN_LAMBDA_METHOD: 'UNKNOWN_LAMBDA_METHOD',
	COLEBROOK_NO_CONVERGENCE: 'COLEBROOK_NO_CONVERGENCE',
	MISSING_DESIGNATION: 'MISSING_DESIGNATION',
	MISSING_GLYCOL_PCT: 'MISSING_GLYCOL_PCT',
	GLYCOL_OUT_OF_RANGE: 'GLYCOL_OUT_OF_RANGE'
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const WARNING_CODES = {
	VITESSE_TROP_ELEVEE: 'VITESSE_TROP_ELEVEE',
	VITESSE_TROP_FAIBLE: 'VITESSE_TROP_FAIBLE',
	REGIME_TRANSITOIRE: 'REGIME_TRANSITOIRE',
	DP_LINEIQUE_TROP_ELEVEE: 'DP_LINEIQUE_TROP_ELEVEE',
	DP_LINEIQUE_TROP_FAIBLE: 'DP_LINEIQUE_TROP_FAIBLE',
	EXTRAPOLATION_EQUIPEMENT: 'EXTRAPOLATION_EQUIPEMENT',
	RUGOSITE_INHABITUELLE: 'RUGOSITE_INHABITUELLE',
	EXTRAPOLATION_FLUIDE: 'EXTRAPOLATION_FLUIDE',
	GLYCOL_ABSENT: 'GLYCOL_ABSENT',
	VITESSE_CUIVRE_EROSION: 'VITESSE_CUIVRE_EROSION'
} as const;

export type WarningCode = (typeof WARNING_CODES)[keyof typeof WARNING_CODES];

/* ============================================================ */
/*  Libellés fluide                                              */
/* ============================================================ */

export const FLUIDES_LABELS: Record<FluidId, string> = {
	eau: 'Eau pure',
	meg: 'Eau + mono-éthylène glycol (MEG)',
	mpg: 'Eau + mono-propylène glycol (MPG)'
};

export const METHODES_LABELS: Record<'serghides' | 'colebrook' | 'haaland', string> = {
	serghides: 'Serghides (explicite, défaut)',
	colebrook: 'Colebrook-White (itératif, référence)',
	haaland: 'Haaland (explicite, pédagogique)'
};
