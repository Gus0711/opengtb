/**
 * Données métier pour l'outil Loi d'eau.
 *
 * Sources principales :
 * - DTU 65.11 (régulation des installations de chauffage à eau chaude)
 * - DTU 65.14 (planchers chauffants à eau chaude)
 * - NF EN 442 (radiateurs et convecteurs)
 * - NF EN 1264 (planchers chauffants)
 * - RT 1974 / 1982 / 1988 / 2000 / 2005 / 2012 et RE 2020 (Légifrance)
 * - ADEME — guides de l'audit énergétique et caractérisation du parc bâti
 * - CEREMA — typologies du bâti et performances thermiques
 * - Manuels constructeurs régulation : Siemens RVL, Honeywell Smile,
 *   Vaillant ATMOS, Viessmann Vitotronic
 *
 * Les valeurs de Ubât sont des ordres de grandeur du parc résidentiel
 * français. Pour un calcul précis bâtiment par bâtiment, se référer à
 * l'étude thermique / audit énergétique.
 */

import type {
	ClimateZoneSpec,
	EmitterSpec,
	IsolationSpec,
	PeriodSpec
} from './types';

/**
 * Émetteurs hydrauliques et leur régime nominal de dimensionnement.
 *
 * Régimes nominaux (départ / retour) :
 * - Radiateur haute température : 80/60 °C — héritage RT 1974/1982,
 *   reste la référence des installations anciennes (NF EN 442 §
 *   conditions standard).
 * - Radiateur basse température : 60/40 °C (parfois 55/45) — usage
 *   condensation et RT 2005+.
 * - Plancher chauffant : 35/30 °C (chape épaisse) à 40/30 °C (chape
 *   mince) — NF EN 1264 / DTU 65.14, T° surface plafonnée à 28 °C
 *   en zone d'occupation (29 °C en salle de bain).
 * - Ventilo-convecteur eau chaude : 70/50 °C ou 80/60 °C selon
 *   constructeur — pris ici 70/50 (cas le plus courant en tertiaire
 *   moderne).
 * - Aérotherme : 80/60 °C — installations industrielles et grands
 *   volumes, régime calé sur radiateurs HT.
 *
 * `typicalSlopeRange` : ordres de grandeur de pente Siemens/Honeywell
 * pour T° pivot 20 °C en zone H1 (T_ext_base −7 °C). Sert d'indicateur
 * pour le diagnostic ; la recommandation calculée prime.
 */
export const EMITTERS: EmitterSpec[] = [
	{
		id: 'rad-ht',
		name: 'Radiateur haute température',
		short: 'Rad HT',
		regime: { departure: 80, return: 60 },
		defaultMinT: 30,
		defaultMaxT: 85,
		typicalSlopeRange: { min: 1.6, max: 2.4 },
		description:
			'Radiateurs acier/fonte dimensionnés sur régime 80/60 °C — typique du bâti antérieur RT 2005.',
		source: 'DTU 65.11, NF EN 442'
	},
	{
		id: 'rad-bt',
		name: 'Radiateur basse température',
		short: 'Rad BT',
		regime: { departure: 60, return: 40 },
		defaultMinT: 25,
		defaultMaxT: 65,
		typicalSlopeRange: { min: 1.0, max: 1.6 },
		description:
			'Radiateurs surdimensionnés pour régime 60/40 — compatibles condensation et pompes à chaleur HT.',
		source: 'DTU 65.11, manuels Viessmann/Vaillant'
	},
	{
		id: 'plancher',
		name: 'Plancher chauffant',
		short: 'PCBT',
		regime: { departure: 35, return: 30 },
		defaultMinT: 22,
		defaultMaxT: 45,
		typicalSlopeRange: { min: 0.4, max: 0.9 },
		description:
			'Plancher chauffant basse température — T° surface limitée 28 °C en zone d\'occupation (NF EN 1264).',
		source: 'NF EN 1264, DTU 65.14'
	},
	{
		id: 'vcv',
		name: 'Ventilo-convecteur eau chaude',
		short: 'VCV',
		regime: { departure: 70, return: 50 },
		defaultMinT: 35,
		defaultMaxT: 75,
		typicalSlopeRange: { min: 1.2, max: 1.8 },
		description:
			'Ventilo-convecteur 4 tubes — régime fréquent 70/50, parfois 80/60 sur installations anciennes.',
		source: 'Catalogues Carrier / Daikin / Aermec'
	},
	{
		id: 'aero',
		name: 'Aérotherme',
		short: 'Aérotherme',
		regime: { departure: 80, return: 60 },
		defaultMinT: 40,
		defaultMaxT: 85,
		typicalSlopeRange: { min: 1.6, max: 2.4 },
		description:
			'Aérotherme à eau chaude — grands volumes industriels, régime 80/60 standard.',
		source: 'DTU 65.11, catalogues Sabiana/Galletti'
	}
];

/**
 * Fourchettes qualitatives d'isolation, alignées sur les classes DPE
 * (arrêté du 31 mars 2021 modifié, méthode 3CL-2021).
 *
 * Le Ubât (coefficient moyen de transmission thermique de l'enveloppe)
 * dépend du bâtiment ; les plages données ici sont des ordres de
 * grandeur typiques du parc résidentiel français, à utiliser comme
 * proxy pour estimer la pente quand l'utilisateur n'a pas la valeur
 * exacte.
 *
 * Sources :
 * - ADEME — Bilan du parc des bâtiments résidentiels
 * - CEREMA — Études typologiques du parc bâti
 * - Observatoire DPE (statistiques publiques)
 *
 * TODO : affiner les plages avec données ADEME 2024 (mise à jour DPE
 * post-2021 et bornes par étiquette).
 */
export const ISOLATIONS: IsolationSpec[] = [
	{
		id: 'passoire',
		name: 'Passoire thermique',
		dpeEquivalent: 'DPE F / G',
		description:
			'Bâti ancien sans isolation systématique (avant 1974, non rénové), simple vitrage, ponts thermiques forts.',
		ubatRange: { min: 1.5, max: 3.0 },
		ubatTypical: 2.0
	},
	{
		id: 'mauvaise',
		name: 'Mal isolée',
		dpeEquivalent: 'DPE D / E',
		description:
			'Bâti RT 1974/1982 ou ancien partiellement rénové — double vitrage simple, isolation murs/toiture inégale.',
		ubatRange: { min: 1.0, max: 1.5 },
		ubatTypical: 1.2
	},
	{
		id: 'moyenne',
		name: 'Isolation moyenne',
		dpeEquivalent: 'DPE C',
		description:
			'RT 1988 à RT 2005, ou rénovation cohérente avec double vitrage et isolation thermique complète.',
		ubatRange: { min: 0.7, max: 1.0 },
		ubatTypical: 0.85
	},
	{
		id: 'bonne',
		name: 'Bien isolée',
		dpeEquivalent: 'DPE B',
		description:
			'RT 2012 ou rénovation BBC — isolation renforcée, menuiseries performantes, ventilation contrôlée.',
		ubatRange: { min: 0.4, max: 0.7 },
		ubatTypical: 0.55
	},
	{
		id: 'tres-bonne',
		name: 'Très bien isolée',
		dpeEquivalent: 'DPE A',
		description:
			'RE 2020, passif ou équivalent — enveloppe très performante, étanchéité à l\'air mesurée.',
		ubatRange: { min: 0.2, max: 0.4 },
		ubatTypical: 0.3
	}
];

/**
 * Périodes constructives et ordres de grandeur Ubât associés.
 *
 * Sources : RT successives (Légifrance), ADEME, CEREMA. Les valeurs
 * sont des moyennes du parc résidentiel ; pour le tertiaire ou
 * l'industriel, l'écart-type est plus important.
 *
 * TODO : ajouter une courbe distincte pour le tertiaire si demandé en
 * V2 (RT 2005 tertiaire vs résidentiel diffèrent).
 */
export const PERIODS: PeriodSpec[] = [
	{
		id: 'pre-1948',
		name: 'Avant 1948',
		yearStart: 1900,
		yearEnd: 1947,
		ubatRange: { min: 1.8, max: 3.0 },
		ubatTypical: 2.2,
		note: 'Bâti d\'avant-guerre, murs épais souvent en pierre, sans isolation thermique.'
	},
	{
		id: '1948-1974',
		name: 'Reconstruction (1948–1974)',
		yearStart: 1948,
		yearEnd: 1973,
		ubatRange: { min: 1.4, max: 2.2 },
		ubatTypical: 1.7,
		note: 'Reconstruction massive, parpaings béton, simple vitrage, isolation rare.'
	},
	{
		id: 'rt-1974',
		name: 'RT 1974 (1974–1982)',
		yearStart: 1974,
		yearEnd: 1981,
		ubatRange: { min: 1.0, max: 1.5 },
		ubatTypical: 1.2,
		note: 'Premier choc pétrolier, première réglementation thermique. G1 / G2 selon zone.'
	},
	{
		id: 'rt-1982',
		name: 'RT 1982 (1982–1988)',
		yearStart: 1982,
		yearEnd: 1987,
		ubatRange: { min: 0.9, max: 1.2 },
		ubatTypical: 1.0,
		note: 'Coefficient B (consommation d\'énergie pour chauffage). Renforcement isolation.'
	},
	{
		id: 'rt-1988',
		name: 'RT 1988 (1988–2000)',
		yearStart: 1988,
		yearEnd: 1999,
		ubatRange: { min: 0.7, max: 1.0 },
		ubatTypical: 0.85,
		note: 'Coefficient BV puis Bbio. Élargissement aux pertes par renouvellement d\'air.'
	},
	{
		id: 'rt-2000',
		name: 'RT 2000 (2000–2005)',
		yearStart: 2000,
		yearEnd: 2004,
		ubatRange: { min: 0.6, max: 0.85 },
		ubatTypical: 0.7,
		note: 'Garde-fous sur Ubât, exigence Cep par zone climatique.'
	},
	{
		id: 'rt-2005',
		name: 'RT 2005 (2005–2012)',
		yearStart: 2005,
		yearEnd: 2011,
		ubatRange: { min: 0.5, max: 0.75 },
		ubatTypical: 0.6,
		note: 'Référence Cep_ref. Premières exigences sur ponts thermiques.'
	},
	{
		id: 'rt-2012',
		name: 'RT 2012 / BBC (2012–2020)',
		yearStart: 2012,
		yearEnd: 2020,
		ubatRange: { min: 0.35, max: 0.6 },
		ubatTypical: 0.45,
		note: 'Cep < 50 kWhep/m²/an modulé. Étanchéité à l\'air mesurée (Q4Pasurf).'
	},
	{
		id: 're-2020',
		name: 'RE 2020 (2020+)',
		yearStart: 2021,
		yearEnd: 2099,
		ubatRange: { min: 0.25, max: 0.4 },
		ubatTypical: 0.3,
		note: 'Bbio renforcé, prise en compte du carbone et confort d\'été.'
	}
];

/**
 * Rénovations modificatrices : si l'utilisateur déclare une rénovation
 * après une date donnée, on prend la fourchette Ubât de cette période
 * en remplacement de la période d'origine.
 */
export const RENOVATIONS: { yearMin: number; periodId: string }[] = [
	{ yearMin: 2021, periodId: 're-2020' },
	{ yearMin: 2012, periodId: 'rt-2012' },
	{ yearMin: 2005, periodId: 'rt-2005' },
	{ yearMin: 2000, periodId: 'rt-2000' }
];

/**
 * Zones climatiques de la RT/RE — températures extérieures de base
 * du résidentiel, en °C.
 *
 * Source : RT 2012 Annexe VIII / RE 2020 (températures extérieures
 * de base par département). Pour le tertiaire, valeurs plus sévères
 * dans certaines zones — non couvert en V1.
 *
 * Les sous-zones (H1a/b/c, H2a–d, H3) ne sont pas distinguées en V1 ;
 * on prend la valeur représentative.
 */
export const CLIMATE_ZONES: ClimateZoneSpec[] = [
	{
		id: 'H1',
		name: 'Zone H1 — Nord, Est, Massif Central',
		baseTemp: -7,
		description:
			'Paris, Lille, Strasbourg, Lyon, Reims, Clermont-Ferrand. T° ext de base −7 °C (résidentiel).'
	},
	{
		id: 'H2',
		name: 'Zone H2 — Façade atlantique, Sud-Ouest',
		baseTemp: -4,
		description: 'Nantes, Bordeaux, Brest, La Rochelle, Toulouse. T° ext de base −4 °C.'
	},
	{
		id: 'H3',
		name: 'Zone H3 — Méditerranée',
		baseTemp: 3,
		description: 'Marseille, Nice, Montpellier, Perpignan, Ajaccio. T° ext de base +3 °C.'
	}
];

/**
 * Helpers de recherche.
 */
export const getEmitter = (id: string): EmitterSpec | undefined =>
	EMITTERS.find((e) => e.id === id);

export const getIsolation = (id: string): IsolationSpec | undefined =>
	ISOLATIONS.find((i) => i.id === id);

export const getZone = (id: string): ClimateZoneSpec | undefined =>
	CLIMATE_ZONES.find((z) => z.id === id);

export const getPeriod = (id: string): PeriodSpec | undefined =>
	PERIODS.find((p) => p.id === id);

/**
 * Convertit une année de construction (et éventuelle année de
 * rénovation) en une période réglementaire et donc en une plage Ubât.
 *
 * Si année de rénovation ≥ seuil RT 2000, on prend la période la plus
 * récente atteinte ; sinon on garde la période de construction.
 */
export function periodForYear(year: number, renovationYear?: number): PeriodSpec {
	if (renovationYear !== undefined) {
		const reno = RENOVATIONS.find((r) => renovationYear >= r.yearMin);
		if (reno) {
			const p = getPeriod(reno.periodId);
			if (p) return p;
		}
	}
	return PERIODS.find((p) => year >= p.yearStart && year <= p.yearEnd) ?? PERIODS[0];
}
