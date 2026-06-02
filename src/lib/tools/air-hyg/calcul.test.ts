import { describe, it, expect } from 'vitest';
import {
	calculerDebitsHygieniques,
	m3hVersLps,
	tauxRenouvellement,
	volumePuisSurface
} from './calcul';
import { calculerCO2Equilibre, calculerCO2EquilibreMixte } from './co2';
import {
	emissionCO2ParOccupant,
	getDebitCodeTravail,
	getDebitCreche,
	getDebitR4212_6,
	getDebitRsdt641,
	getDebitRsdt642Cuisine,
	getDebitRsdt642Sanitaire,
	getDebitSanteNfs90351,
	getQbNfEn16798,
	getQpNfEn16798
} from './referentiels';
import { validateProjet } from './validators';
import type { Projet } from './types';

const optionsDefaut: Projet['options'] = {
	methodeCalcul: 'les_deux',
	categorieQaiCible: 'QAI2',
	categorieBatiment: 'B2',
	co2Exterieur_ppm: 400,
	afficherComparaisonEuropeenne: true
};

/* ============================================================ */
/*  Tests unitaires — lookups réglementaires                     */
/* ============================================================ */

describe('lookups Code du Travail R4222-6', () => {
	it('bureau → 25 m³/h/occ', () => {
		expect(getDebitCodeTravail('bureau').debit).toBe(25);
	});
	it('atelier physique léger → 45', () => {
		expect(getDebitCodeTravail('atelier_physique_leger').debit).toBe(45);
	});
	it('autres ateliers → 60', () => {
		expect(getDebitCodeTravail('atelier_autre').debit).toBe(60);
	});
	it('texteCite contient référence article', () => {
		expect(getDebitCodeTravail('bureau').texteCite).toMatch(/R4222-6/);
	});
});

describe('lookups RSDT 64.1', () => {
	it('enseignement primaire → 15', () => {
		expect(getDebitRsdt641('enseignement_primaire_college').debit).toBe(15);
	});
	it('lycée/universitaire → 18', () => {
		expect(getDebitRsdt641('enseignement_lycee_universite').debit).toBe(18);
	});
	it('restauration → 22', () => {
		expect(getDebitRsdt641('restauration').debit).toBe(22);
	});
	it('cinéma → 30', () => {
		expect(getDebitRsdt641('spectacle_cinema').debit).toBe(30);
	});
});

describe('cuisines collectives RSDT 64.2', () => {
	it('100 repas → max(25·100, 500) = 2500', () => {
		expect(getDebitRsdt642Cuisine(100).debit).toBe(2500);
	});
	it('20 repas → plancher 500', () => {
		expect(getDebitRsdt642Cuisine(20).debit).toBe(500);
	});
	it('200 repas → 20·200 = 4000', () => {
		expect(getDebitRsdt642Cuisine(200).debit).toBe(4000);
	});
	it('1000 repas → 15·1000 = 15 000', () => {
		expect(getDebitRsdt642Cuisine(1000).debit).toBe(15000);
	});
	it('2000 repas → max(10·2000, 10 000) = 20 000', () => {
		// Arbitrage projet : interprétation « 10 par repas + 10 000 mini » = max(10·N, 10 000).
		expect(getDebitRsdt642Cuisine(2000).debit).toBe(20000);
	});
	it('500 repas (limite tranche basse) → 20·500 = 10 000', () => {
		expect(getDebitRsdt642Cuisine(500).debit).toBe(10000);
	});
	it('0 repas → erreur', () => {
		expect(() => getDebitRsdt642Cuisine(0)).toThrow();
	});
});

describe('sanitaires RSDT 64.2', () => {
	it('cabinet collectif → 30 m³/h par cabinet', () => {
		expect(getDebitRsdt642Sanitaire('cabinet_collectif').debit).toBe(30);
	});
	it('lavabo groupé → 10', () => {
		expect(getDebitRsdt642Sanitaire('lavabo_groupe').debit).toBe(10);
	});
});

describe('sanitaires R4212-6', () => {
	it('cabinet isolé → 30 par local', () => {
		expect(getDebitR4212_6('cabinet_isole').debit).toBe(30);
	});
	it('groupe bain+douche, 1 équipement → 30', () => {
		expect(getDebitR4212_6('groupe_bain_douche', 1).debit).toBe(30);
	});
	it('groupe bain+douche, 3 équipements → 30 + 2·15 = 60', () => {
		expect(getDebitR4212_6('groupe_bain_douche', 3).debit).toBe(60);
	});
});

describe('crèches arrêté 31/08/2021', () => {
	it('pièce de vie → 15 m³/h/enfant', () => {
		expect(getDebitCreche('piece_vie').debit).toBe(15);
	});
	it('change → 20 par poste', () => {
		expect(getDebitCreche('change').debit).toBe(20);
	});
});

describe('santé NF S 90-351', () => {
	it('risque 3, V = 180 m³ → 25·180 = 4500', () => {
		expect(getDebitSanteNfs90351(3, 180).debit).toBe(4500);
	});
	it('risque 4 → 50 vol/h', () => {
		expect(getDebitSanteNfs90351(4, 100).debit).toBe(5000);
	});
	it('risque 1 → 0 (RSDT/CT applicable)', () => {
		expect(getDebitSanteNfs90351(1, 100).debit).toBe(0);
	});
	it('surpression +15 Pa pour risque 2-4', () => {
		expect(getDebitSanteNfs90351(2, 100).surpressionMini_Pa).toBe(15);
	});
});

describe('NF EN 16798 méthode 1', () => {
	it('q_p QAI 2 = 25.2 m³/h/pers', () => {
		expect(getQpNfEn16798('QAI2')).toBeCloseTo(25.2, 4);
	});
	it('q_p QAI 1 = 36 m³/h/pers (10 L/s)', () => {
		expect(getQpNfEn16798('QAI1')).toBe(36);
	});
	it('q_B B2 QAI 2 = 3.6 m³/h/m²', () => {
		expect(getQbNfEn16798('QAI2', 'B2')).toBeCloseTo(3.6, 4);
	});
});

/* ============================================================ */
/*  Helpers                                                      */
/* ============================================================ */

describe('helpers', () => {
	it('volume = surface × hsp', () => {
		expect(volumePuisSurface(60, 3)).toBe(180);
	});
	it('taux renouvellement = Q / V', () => {
		expect(tauxRenouvellement(385, 180)).toBeCloseTo(2.14, 2);
	});
	it('m³/h → L/s', () => {
		expect(m3hVersLps(360)).toBe(100);
	});
});

/* ============================================================ */
/*  CO₂                                                          */
/* ============================================================ */

describe('CO₂ à l\'équilibre', () => {
	it('10 adultes × 20 L/h, 250 m³/h → 1200 ppm', () => {
		// C_eq = 400 + (20 · 10 · 1000) / 250 = 1200
		expect(calculerCO2Equilibre(10, 250, 20)).toBeCloseTo(1200, 1);
	});
	it('Q = 0 → Infinity', () => {
		expect(calculerCO2Equilibre(10, 0, 20)).toBe(Infinity);
	});
	it('mixte : 1 adulte repos + 24 enfants repos, 385 m³/h', () => {
		// G_tot = 20 + 24·10 = 260 L/h
		// C_eq = 400 + 260000 / 385 ≈ 1075 ppm
		const c = calculerCO2EquilibreMixte(
			[
				{ nb: 1, G_lh: 20 },
				{ nb: 24, G_lh: 10 }
			],
			385
		);
		expect(c).toBeCloseTo(1075, 0);
	});
	it('émissions par profil/activité', () => {
		expect(emissionCO2ParOccupant('adulte', 'repos')).toBe(20);
		expect(emissionCO2ParOccupant('enfant', 'repos')).toBe(10);
		expect(emissionCO2ParOccupant('adulte', 'intense')).toBe(50);
	});
});

/* ============================================================ */
/*  Tests d'intégration                                          */
/* ============================================================ */

describe('intégration — bureau open-space', () => {
	const projet: Projet = {
		libelle: 'Bureau seul',
		options: optionsDefaut,
		locaux: [
			{
				id: 'L1',
				libelle: 'Bureau',
				zone: 'tertiaire_bureau',
				surface_m2: 50,
				hauteurSousPlafond_m: 2.7,
				populations: [
					{
						libelle: 'Salariés',
						nbOccupants: 10,
						referentiel: 'code_travail',
						designationLocal: 'bureau',
						profil: 'adulte',
						activite: 'repos'
					}
				]
			}
		]
	};

	it('10 × 25 = 250 m³/h', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.resume.debitTotalAirNeuf_m3h).toBe(250);
		expect(r.detail.locaux[0].debitTotalLocal_m3h).toBe(250);
	});
	it('taux renouvellement ≈ 1.85 vol/h', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.detail.locaux[0].tauxRenouvellement_volh).toBeCloseTo(1.85, 2);
	});
	it('CO₂ équilibre ≈ 1200 ppm', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.detail.locaux[0].co2Equilibre_ppm).toBeCloseTo(1200, 0);
	});
	it('textes légaux : Code du Travail R4222-6', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.textesLegauxAppliques).toContain('Code du Travail R4222-6');
	});
});

describe('intégration — salle de classe primaire (cumul CT + RSDT)', () => {
	const projet: Projet = {
		libelle: 'École',
		options: optionsDefaut,
		locaux: [
			{
				id: 'L1',
				libelle: 'Classe CP',
				zone: 'enseignement',
				surface_m2: 60,
				hauteurSousPlafond_m: 3.0,
				populations: [
					{
						libelle: 'Enseignant',
						nbOccupants: 1,
						referentiel: 'code_travail',
						designationLocal: 'bureau',
						profil: 'adulte',
						activite: 'repos'
					},
					{
						libelle: 'Élèves',
						nbOccupants: 24,
						referentiel: 'rsdt_641',
						designationLocal: 'enseignement_primaire_college',
						profil: 'enfant',
						activite: 'repos'
					}
				]
			}
		]
	};

	it('cumul = 25 + 360 = 385 m³/h', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.detail.locaux[0].debitTotalLocal_m3h).toBe(385);
	});
	it('deux lignes de débit avec textes cités distincts', () => {
		const r = calculerDebitsHygieniques(projet);
		const l = r.detail.locaux[0];
		expect(l.debitsParPopulation).toHaveLength(2);
		expect(l.debitsParPopulation[0].texteCite).toMatch(/R4222-6/);
		expect(l.debitsParPopulation[1].texteCite).toMatch(/64\.1/);
	});
	it('textes appliqués : CT R4222-6 + RSDT 64.1', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.textesLegauxAppliques).toContain('Code du Travail R4222-6');
		expect(r.textesLegauxAppliques).toContain('RSDT 64.1');
	});
	it('CO₂ équilibre ≈ 1075 ppm', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.detail.locaux[0].co2Equilibre_ppm).toBeCloseTo(1075, 0);
	});
});

describe('intégration — salle de réunion entreprise', () => {
	it('12 × 30 = 360 m³/h (CT — locaux de réunion)', () => {
		const r = calculerDebitsHygieniques({
			libelle: 'Réunion',
			options: optionsDefaut,
			locaux: [
				{
					id: 'L1',
					libelle: 'Salle réunion',
					zone: 'tertiaire_bureau',
					surface_m2: 30,
					hauteurSousPlafond_m: 2.7,
					populations: [
						{
							libelle: 'Salariés',
							nbOccupants: 12,
							referentiel: 'code_travail',
							designationLocal: 'restauration_vente_reunion'
						}
					]
				}
			]
		});
		expect(r.detail.locaux[0].debitTotalLocal_m3h).toBe(360);
	});
});

describe('intégration — restaurant scolaire (salle + cuisine séparées)', () => {
	const projet: Projet = {
		libelle: 'Restaurant scolaire',
		options: optionsDefaut,
		locaux: [
			{
				id: 'L_salle',
				libelle: 'Salle restaurant',
				zone: 'restauration',
				surface_m2: 200,
				hauteurSousPlafond_m: 3,
				populations: [
					{
						libelle: 'Personnel cantine',
						nbOccupants: 5,
						referentiel: 'code_travail',
						designationLocal: 'restauration_vente_reunion'
					},
					{
						libelle: 'Élèves',
						nbOccupants: 200,
						referentiel: 'rsdt_641',
						designationLocal: 'restauration'
					}
				]
			},
			{
				id: 'L_cuisine',
				libelle: 'Cuisine',
				zone: 'cuisine_collective',
				surface_m2: 50,
				hauteurSousPlafond_m: 3,
				populations: [],
				parametresSpecifiques: { nbRepasSimultanes: 200 }
			}
		]
	};

	it('salle = 150 + 4400 = 4550 m³/h', () => {
		const r = calculerDebitsHygieniques(projet);
		const salle = r.detail.locaux.find((l) => l.id === 'L_salle')!;
		expect(salle.debitTotalLocal_m3h).toBe(4550);
		expect(salle.debitsParPopulation).toHaveLength(2);
	});
	it('cuisine = 200 × 20 = 4000 m³/h', () => {
		const r = calculerDebitsHygieniques(projet);
		const cuisine = r.detail.locaux.find((l) => l.id === 'L_cuisine')!;
		expect(cuisine.debitTotalLocal_m3h).toBe(4000);
		expect(cuisine.nature.flux).toBe('extraction');
	});
	it('air neuf salle 4550 vs extraction cuisine 4000', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.resume.debitTotalAirNeuf_m3h).toBe(4550);
		expect(r.resume.debitTotalExtraction_m3h).toBe(4000);
	});
});

describe('intégration — bloc op risque 3 (taux renouvellement)', () => {
	const projet: Projet = {
		libelle: 'Bloc',
		options: optionsDefaut,
		locaux: [
			{
				id: 'L1',
				libelle: 'Bloc op',
				zone: 'sante',
				surface_m2: 60,
				hauteurSousPlafond_m: 3,
				populations: [
					{
						libelle: 'Personnel chirurgical',
						nbOccupants: 6,
						referentiel: 'code_travail',
						designationLocal: 'bureau'
					}
				],
				parametresSpecifiques: { classementZoneSante: 3 }
			}
		]
	};

	it('Q = 25 · 180 = 4500 m³/h (max entre par-occupant et vol/h)', () => {
		const r = calculerDebitsHygieniques(projet);
		const l = r.detail.locaux[0];
		// par-occupant = 6 × 25 = 150 ; forfait santé = 4500 ; max = 4500
		expect(l.debitTotalLocal_m3h).toBe(4500);
		expect(l.debitsForfaitaires[0].base).toBe('taux_renouvellement');
	});
	it('warning surpression +15 Pa', () => {
		const r = calculerDebitsHygieniques(projet);
		const surpression = r.warnings.find((w) => w.code === 'SURPRESSION_REQUISE');
		expect(surpression).toBeDefined();
	});
});

describe('intégration — crèche multi-locaux', () => {
	const projet: Projet = {
		libelle: 'Crèche',
		options: optionsDefaut,
		locaux: [
			{
				id: 'L_vie',
				libelle: 'Pièce de vie',
				zone: 'creche',
				surface_m2: 40,
				hauteurSousPlafond_m: 2.7,
				populations: [
					{
						libelle: 'Enfants',
						nbOccupants: 12,
						referentiel: 'creche',
						designationLocal: 'piece_vie',
						profil: 'enfant'
					}
				]
			},
			{
				id: 'L_change',
				libelle: 'Local de change',
				zone: 'creche',
				surface_m2: 10,
				hauteurSousPlafond_m: 2.5,
				populations: [],
				parametresSpecifiques: { nbPostesChange: 2 }
			},
			{
				id: 'L_sani',
				libelle: 'Sanitaires enfants',
				zone: 'sanitaire',
				surface_m2: 8,
				hauteurSousPlafond_m: 2.5,
				populations: [],
				parametresSpecifiques: { nbCabinets: 2, collectif: true }
			}
		]
	};

	it('pièce de vie = 12 × 15 = 180', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.detail.locaux[0].debitTotalLocal_m3h).toBe(180);
	});
	it('change = 2 × 20 = 40', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.detail.locaux[1].debitTotalLocal_m3h).toBe(40);
	});
	it('sanitaires = 2 × 30 = 60', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.detail.locaux[2].debitTotalLocal_m3h).toBe(60);
	});
	it('total air neuf (vie + change) = 220, extraction (sanitaire) = 60', () => {
		const r = calculerDebitsHygieniques(projet);
		expect(r.resume.debitTotalAirNeuf_m3h).toBe(220);
		expect(r.resume.debitTotalExtraction_m3h).toBe(60);
	});
});

describe('intégration — vérification conformité', () => {
	it('installé 200 / requis 250 → écart -20 %, non conforme', () => {
		const r = calculerDebitsHygieniques({
			libelle: 'Vérif',
			options: optionsDefaut,
			locaux: [
				{
					id: 'L1',
					libelle: 'Bureau',
					zone: 'tertiaire_bureau',
					surface_m2: 50,
					hauteurSousPlafond_m: 2.7,
					populations: [
						{
							libelle: 'Salariés',
							nbOccupants: 10,
							referentiel: 'code_travail',
							designationLocal: 'bureau'
						}
					],
					installationExistante: { debitInstalle_m3h: 200 }
				}
			]
		});
		const v = r.detail.locaux[0].verification!;
		expect(v.ecart_pct).toBeCloseTo(-20, 0);
		expect(v.verdict).toBe('non_conforme');
	});
	it('installé 240 / requis 250 → écart -4 %, limite', () => {
		const r = calculerDebitsHygieniques({
			libelle: 'Vérif',
			options: optionsDefaut,
			locaux: [
				{
					id: 'L1',
					libelle: 'Bureau',
					zone: 'tertiaire_bureau',
					surface_m2: 50,
					hauteurSousPlafond_m: 2.7,
					populations: [
						{
							libelle: 'Salariés',
							nbOccupants: 10,
							referentiel: 'code_travail',
							designationLocal: 'bureau'
						}
					],
					installationExistante: { debitInstalle_m3h: 240 }
				}
			]
		});
		const v = r.detail.locaux[0].verification!;
		expect(v.verdict).toBe('limite');
	});
});

describe('intégration — comparaison NF EN 16798', () => {
	it('classe primaire 25 occ / 60 m² B2 QAI 2 → 630 + 216 = 846', () => {
		const r = calculerDebitsHygieniques({
			libelle: 'Comparaison',
			options: optionsDefaut,
			locaux: [
				{
					id: 'L1',
					libelle: 'Classe',
					zone: 'enseignement',
					surface_m2: 60,
					hauteurSousPlafond_m: 3,
					populations: [
						{
							libelle: 'Enseignant',
							nbOccupants: 1,
							referentiel: 'code_travail',
							designationLocal: 'bureau'
						},
						{
							libelle: 'Élèves',
							nbOccupants: 24,
							referentiel: 'rsdt_641',
							designationLocal: 'enseignement_primaire_college'
						}
					]
				}
			]
		});
		const c = r.detail.locaux[0].comparaisonNfEn16798;
		expect(c.debitQAI2_m3h).toBeCloseTo(846, 1);
		expect(c.ratioMiniFrSurQAI2).toBeCloseTo(385 / 846, 3);
	});
});

/* ============================================================ */
/*  Validation                                                   */
/* ============================================================ */

describe('validation', () => {
	it('surface 0 → erreur INVALID_AREA', () => {
		const v = validateProjet({
			libelle: 'X',
			options: optionsDefaut,
			locaux: [
				{
					id: 'L1',
					libelle: 'Bureau',
					zone: 'tertiaire_bureau',
					surface_m2: 0,
					hauteurSousPlafond_m: 2.7,
					populations: []
				}
			]
		});
		expect(v.valid).toBe(false);
		expect(v.errors.some((e) => e.code === 'INVALID_AREA')).toBe(true);
	});
	it('cuisine sans nbRepasSimultanes → erreur', () => {
		const v = validateProjet({
			libelle: 'X',
			options: optionsDefaut,
			locaux: [
				{
					id: 'L1',
					libelle: 'Cuisine',
					zone: 'cuisine_collective',
					surface_m2: 50,
					hauteurSousPlafond_m: 3,
					populations: []
				}
			]
		});
		expect(v.errors.some((e) => e.code === 'MISSING_REQUIRED_PARAM')).toBe(true);
	});
	it('population à 0 occupant → warning, pas erreur', () => {
		const v = validateProjet({
			libelle: 'X',
			options: optionsDefaut,
			locaux: [
				{
					id: 'L1',
					libelle: 'Bureau',
					zone: 'tertiaire_bureau',
					surface_m2: 50,
					hauteurSousPlafond_m: 2.7,
					populations: [
						{
							libelle: 'Salariés',
							nbOccupants: 0,
							referentiel: 'code_travail',
							designationLocal: 'bureau'
						}
					]
				}
			]
		});
		expect(v.valid).toBe(true);
		expect(v.warnings.some((w) => w.code === 'POPULATION_VIDE')).toBe(true);
	});
	it('désignation inconnue → erreur', () => {
		const v = validateProjet({
			libelle: 'X',
			options: optionsDefaut,
			locaux: [
				{
					id: 'L1',
					libelle: 'Bureau',
					zone: 'tertiaire_bureau',
					surface_m2: 50,
					hauteurSousPlafond_m: 2.7,
					populations: [
						{
							libelle: 'Salariés',
							nbOccupants: 10,
							referentiel: 'code_travail',
							designationLocal: 'inexistant'
						}
					]
				}
			]
		});
		expect(v.errors.some((e) => e.code === 'UNKNOWN_DESIGNATION')).toBe(true);
	});
	it('densité élevée → warning VOLUME_INSUFFISANT_PER_OCCUPANT', () => {
		const v = validateProjet({
			libelle: 'X',
			options: optionsDefaut,
			locaux: [
				{
					id: 'L1',
					libelle: 'Salle dense',
					zone: 'tertiaire_bureau',
					surface_m2: 10,
					hauteurSousPlafond_m: 2.5,
					populations: [
						{
							libelle: 'Salariés',
							nbOccupants: 10,
							referentiel: 'code_travail',
							designationLocal: 'bureau'
						}
					]
				}
			]
		});
		// V = 25 m³ / 10 occ = 2.5 m³/occ < 15
		expect(v.warnings.some((w) => w.code === 'VOLUME_INSUFFISANT_PER_OCCUPANT')).toBe(true);
	});
});

describe('pureté et déterminisme', () => {
	it('2 appels identiques → même résultat (hors dateCalcul)', () => {
		const projet: Projet = {
			libelle: 'P',
			options: optionsDefaut,
			locaux: [
				{
					id: 'L1',
					libelle: 'Bureau',
					zone: 'tertiaire_bureau',
					surface_m2: 50,
					hauteurSousPlafond_m: 2.7,
					populations: [
						{
							libelle: 'Salariés',
							nbOccupants: 10,
							referentiel: 'code_travail',
							designationLocal: 'bureau'
						}
					]
				}
			]
		};
		const r1 = calculerDebitsHygieniques(projet);
		const r2 = calculerDebitsHygieniques(projet);
		expect(r1.resume).toEqual(r2.resume);
		expect(r1.detail.locaux[0].debitTotalLocal_m3h).toBe(r2.detail.locaux[0].debitTotalLocal_m3h);
	});
});
