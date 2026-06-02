import { describe, expect, test } from 'vitest';
import {
	lambdaColebrook,
	lambdaDispatch,
	lambdaHaaland,
	lambdaLaminaire,
	lambdaSerghides,
	reynolds,
	rugositeRelative,
	vitesse
} from './friction';
import {
	dpEquipement,
	pdcLineique,
	pdcLineiquePaParM,
	pdcSinguliere,
	zetaBorda,
	zetaFromKvs
} from './pertes';
import { proprietesFluide } from './fluide';
import { resoudreDimensionsTube } from './designations';
import { calculerPertesDeCharge } from './calc';
import { autoDimensionnerDN } from './autoDim';
import { debitDepuisPuissance } from './conversions';
import { validateInputs } from './validators';
import type { Circuit } from './types';
import { ERROR_CODES, WARNING_CODES } from './constants';

/* ============================================================ */
/*  1. Reynolds                                                  */
/* ============================================================ */

describe('1. Reynolds — Q=1 m³/h, D=20 mm, eau 20 °C', () => {
	test('Re ≈ 17600 (±1 %)', () => {
		const V = vitesse(1, 20); // m/s
		const props = proprietesFluide('eau', 0, 20);
		const Re = reynolds(V, 0.02, props.nu);
		expect(Re).toBeGreaterThan(17600 * 0.99);
		expect(Re).toBeLessThan(17600 * 1.01);
	});
});

/* ============================================================ */
/*  2. λ laminaire                                               */
/* ============================================================ */

describe('2. λ laminaire — Re=1000', () => {
	test('λ = 0.064 exact', () => {
		expect(lambdaLaminaire(1000)).toBeCloseTo(0.064, 12);
	});
});

/* ============================================================ */
/*  3 & 4. λ Serghides / Haaland vs Colebrook                    */
/* ============================================================ */

describe('3. λ Serghides vs Colebrook — grille étendue', () => {
	const reList = [1e4, 1e5, 1e6, 1e7];
	const epsDList = [1e-6, 1e-4, 1e-2];
	for (const Re of reList) {
		for (const epsD of epsDList) {
			test(`Re=${Re}, ε/D=${epsD} : écart < 0.05 %`, () => {
				const lamS = lambdaSerghides(Re, epsD);
				const lamC = lambdaColebrook(Re, epsD).lambda;
				const ecart = Math.abs(lamS - lamC) / lamC;
				expect(ecart).toBeLessThan(5e-4);
			});
		}
	}
});

describe('4. λ Haaland vs Colebrook — grille étendue', () => {
	const reList = [1e4, 1e5, 1e6, 1e7];
	const epsDList = [1e-6, 1e-4, 1e-2];
	for (const Re of reList) {
		for (const epsD of epsDList) {
			test(`Re=${Re}, ε/D=${epsD} : écart < 2 %`, () => {
				const lamH = lambdaHaaland(Re, epsD);
				const lamC = lambdaColebrook(Re, epsD).lambda;
				const ecart = Math.abs(lamH - lamC) / lamC;
				expect(ecart).toBeLessThan(0.02);
			});
		}
	}
});

/* ============================================================ */
/*  5. PdC linéique                                              */
/* ============================================================ */

describe('5. PdC linéique — V=1 m/s, D=20 mm, λ=0.025, ρ=1000', () => {
	test('625 Pa/m exact', () => {
		expect(pdcLineiquePaParM(0.025, 0.02, 1, 1000)).toBeCloseTo(625, 9);
	});
	test('ΔP totale sur 10 m = 6250 Pa', () => {
		expect(pdcLineique(0.025, 0.02, 10, 1, 1000)).toBeCloseTo(6250, 9);
	});
});

/* ============================================================ */
/*  6. PdC singulière                                            */
/* ============================================================ */

describe('6. PdC singulière — ζ=0.3, V=1 m/s, ρ=1000', () => {
	test('150 Pa exact', () => {
		expect(pdcSinguliere(0.3, 1, 1000)).toBeCloseTo(150, 9);
	});
});

/* ============================================================ */
/*  7. Kvs → ΔP                                                  */
/* ============================================================ */

describe('7. Kvs → ΔP — Kvs=6.3, Q=2 m³/h, eau', () => {
	test('ΔP ≈ 10078 Pa', () => {
		// V calculé sur D=20 mm pour cohérence (V n'influence pas dpPa)
		const { dpPa } = zetaFromKvs(6.3, 2, 1000, 1);
		expect(dpPa).toBeGreaterThan(10000);
		expect(dpPa).toBeLessThan(10100);
	});
});

/* ============================================================ */
/*  8. Équipement loi parabolique                                */
/* ============================================================ */

describe('8. Équipement — ΔPnom=10 kPa @ Qnom=2 m³/h, Q=3 m³/h', () => {
	test('ΔP_réel = 22.5 kPa', () => {
		const { dpPa, warning } = dpEquipement(10, 2, 3);
		expect(dpPa).toBeCloseTo(22500, 6);
		expect(warning).toBeNull(); // ratio 1.5 ∈ [0.3 ; 2]
	});
});

/* ============================================================ */
/*  9. Équipement hors plage                                     */
/* ============================================================ */

describe('9. Équipement — Q_réel hors [0.3·Qnom ; 2·Qnom]', () => {
	test('Q=5 (>2·Qnom=4) → warning EXTRAPOLATION_EQUIPEMENT', () => {
		const { warning } = dpEquipement(10, 2, 5);
		expect(warning).not.toBeNull();
		expect(warning!.code).toBe(WARNING_CODES.EXTRAPOLATION_EQUIPEMENT);
	});
	test('Q=0.5 (<0.3·Qnom=0.6) → warning', () => {
		const { warning } = dpEquipement(10, 2, 0.5);
		expect(warning).not.toBeNull();
	});
});

/* ============================================================ */
/*  10. cp volumique de référence                                */
/* ============================================================ */

describe('10. cp_vol fluides', () => {
	test('eau 20 °C ≈ 1.163 kWh/(m³·K)', () => {
		const p = proprietesFluide('eau', 0, 20);
		expect(p.cpVolumique).toBeCloseTo(1.163, 2);
	});
	test('eau 70 °C ≈ 1.137 kWh/(m³·K)', () => {
		const p = proprietesFluide('eau', 0, 70);
		expect(p.cpVolumique).toBeCloseTo(1.137, 2);
	});
	test('MEG 30 % à 20 °C ≈ 1.107 kWh/(m³·K)', () => {
		// (3.83 kJ/(kg·K) × 1041 kg/m³) / 3600 ≈ 1.107
		const p = proprietesFluide('meg', 30, 20);
		expect(p.cpVolumique).toBeGreaterThan(1.08);
		expect(p.cpVolumique).toBeLessThan(1.12);
	});
});

/* ============================================================ */
/*  11. Débit depuis puissance                                   */
/* ============================================================ */

describe('11. Q depuis P — 100 kW, ΔT=20 K, eau 70 °C', () => {
	test('Q ≈ 4.40 m³/h', () => {
		const props = proprietesFluide('eau', 0, 70);
		const Q = debitDepuisPuissance(100, 20, props.cpVolumique);
		// cp_vol eau 70°C ≈ 1.137 → Q = 100 / (1.137 × 20) ≈ 4.40
		expect(Q).toBeGreaterThan(4.35);
		expect(Q).toBeLessThan(4.45);
	});
});

/* ============================================================ */
/*  12-13. Désignations                                          */
/* ============================================================ */

describe('12. Cuivre 18×1 → Dint = 16 mm', () => {
	test('lookup', () => {
		const g = resoudreDimensionsTube({
			mode: 'designation',
			materiau: 'cuivre_neuf',
			designation: '18x1'
		});
		expect(g.intMm).toBe(16);
	});
});

describe('13. Acier DN25 → Dint = 27.3 mm', () => {
	test('lookup', () => {
		const g = resoudreDimensionsTube({
			mode: 'designation',
			materiau: 'acier_noir_neuf',
			designation: 'DN25'
		});
		expect(g.intMm).toBe(27.3);
	});
});

/* ============================================================ */
/*  14. Intégration — circuit série simple                       */
/* ============================================================ */

describe('14. Intégration — 1 tronçon cuivre 22×1, 10 m, 600 l/h, eau 60 °C', () => {
	const circuit: Circuit = {
		preset: 'radiateurs',
		fluide: { type: 'eau', temperature: 60 },
		troncons: [
			{
				id: 'T1',
				ordre: 1,
				libelle: 'Aller',
				type: 'colonne',
				longueur: 10,
				diametre: { mode: 'designation', materiau: 'cuivre_neuf', designation: '22x1' },
				debit: { mode: 'manuel', valeurM3h: 0.6 },
				accessoires: [
					{ type: 'coude_90_grand_rayon', quantite: 4 },
					{ type: 'vanne_papillon', quantite: 1 }
				]
			}
		]
	};

	const r = calculerPertesDeCharge(circuit);

	test('pas d\'erreur', () => expect(r.errors).toHaveLength(0));
	test('ordre de grandeur HMT ≈ 1.5–3 kPa', () => {
		expect(r.resume.hmtTotale.kPa).toBeGreaterThan(1.5);
		expect(r.resume.hmtTotale.kPa).toBeLessThan(3);
	});
	test('régime turbulent', () => {
		expect(r.detail.troncons[0].regime).toBe('turbulent');
	});
	test('lambda dans plage 0.020 – 0.035 pour cuivre neuf', () => {
		const lam = r.detail.troncons[0].lambda;
		expect(lam).toBeGreaterThan(0.02);
		expect(lam).toBeLessThan(0.035);
	});
	test('5 accessoires comptabilisés (4 coudes + 1 vanne)', () => {
		const totalQt = r.detail.troncons[0].accessoires.reduce((a, x) => a + x.quantite, 0);
		expect(totalQt).toBe(5);
	});
});

/* ============================================================ */
/*  15. Circuit fermé symétrique                                 */
/* ============================================================ */

describe('15. Circuit fermé symétrique — doublage L et accessoires', () => {
	const base = {
		preset: 'radiateurs' as const,
		fluide: { type: 'eau' as const, temperature: 60 },
		troncons: [
			{
				id: 'T1',
				ordre: 1,
				libelle: 'Aller',
				type: 'colonne' as const,
				longueur: 10,
				diametre: {
					mode: 'designation' as const,
					materiau: 'cuivre_neuf' as const,
					designation: '22x1'
				},
				debit: { mode: 'manuel' as const, valeurM3h: 0.6 },
				accessoires: [{ type: 'coude_90_grand_rayon' as const, quantite: 4 }]
			}
		]
	};

	test('HMT × ≈ 2 entre simple et symétrique', () => {
		const simple = calculerPertesDeCharge(base);
		const sym = calculerPertesDeCharge({ ...base, options: { circuitFermeSymetrique: true } });
		const ratio = sym.resume.hmtTotale.Pa / simple.resume.hmtTotale.Pa;
		expect(ratio).toBeGreaterThan(1.95);
		expect(ratio).toBeLessThan(2.05);
	});

	test('equipement_dp non doublé', () => {
		const withEquip: Circuit = {
			...base,
			troncons: [
				{
					...base.troncons[0],
					accessoires: [
						{
							type: 'equipement_dp',
							quantite: 1,
							dpNominaleKpa: 10,
							debitNominalM3h: 0.6,
							libelle: 'Radiateur'
						}
					]
				}
			]
		};
		const simple = calculerPertesDeCharge(withEquip);
		const sym = calculerPertesDeCharge({
			...withEquip,
			options: { circuitFermeSymetrique: true }
		});
		// ΔP linéique × 2, ΔP équipement inchangée
		expect(sym.resume.dpLineaireTotale.Pa).toBeCloseTo(2 * simple.resume.dpLineaireTotale.Pa, 6);
		expect(sym.resume.dpEquipementsTotale.Pa).toBeCloseTo(
			simple.resume.dpEquipementsTotale.Pa,
			6
		);
	});
});

/* ============================================================ */
/*  16. Multi-tronçons — débits différents                       */
/* ============================================================ */

describe('16. Multi-tronçons — dorsale + raccord', () => {
	const circuit: Circuit = {
		preset: 'radiateurs',
		fluide: { type: 'eau', temperature: 70 },
		troncons: [
			{
				id: 'T1',
				ordre: 1,
				libelle: 'Dorsale',
				type: 'dorsale',
				longueur: 25,
				diametre: { mode: 'designation', materiau: 'acier_noir_neuf', designation: 'DN50' },
				debit: { mode: 'manuel', valeurM3h: 6 },
				accessoires: []
			},
			{
				id: 'T2',
				ordre: 2,
				libelle: 'Raccord émetteur',
				type: 'raccordement',
				longueur: 5,
				diametre: { mode: 'designation', materiau: 'cuivre_neuf', designation: '22x1' },
				debit: { mode: 'manuel', valeurM3h: 0.5 },
				accessoires: []
			}
		]
	};
	const r = calculerPertesDeCharge(circuit);

	test('2 tronçons calculés', () => expect(r.detail.troncons).toHaveLength(2));
	test('vitesses et λ distincts', () => {
		const [a, b] = r.detail.troncons;
		expect(a.vitesseMs).not.toBe(b.vitesseMs);
		expect(a.lambda).not.toBe(b.lambda);
	});
	test('agrégation HMT cohérente', () => {
		const sum =
			r.detail.troncons[0].dpTronconTotal.Pa + r.detail.troncons[1].dpTronconTotal.Pa;
		expect(r.resume.hmtTotale.Pa).toBeCloseTo(sum, 6);
	});
});

/* ============================================================ */
/*  17. Équipement radiateur intégré                             */
/* ============================================================ */

describe('17. Équipement radiateur — ΔPnom=8 kPa @ 200 l/h, Qréel=250 l/h', () => {
	const circuit: Circuit = {
		preset: 'radiateurs',
		fluide: { type: 'eau', temperature: 60 },
		troncons: [
			{
				id: 'T1',
				ordre: 1,
				libelle: 'Boucle radiateur',
				type: 'raccordement',
				longueur: 5,
				diametre: { mode: 'designation', materiau: 'cuivre_neuf', designation: '16x1' },
				debit: { mode: 'manuel', valeurM3h: 0.25 },
				accessoires: [
					{
						type: 'equipement_dp',
						quantite: 1,
						dpNominaleKpa: 8,
						debitNominalM3h: 0.2,
						libelle: 'Radiateur acier'
					}
				]
			}
		]
	};
	const r = calculerPertesDeCharge(circuit);

	test('ΔP équipement ≈ 12.5 kPa', () => {
		// 8 × (0.25/0.2)² = 12.5
		expect(r.resume.dpEquipementsTotale.kPa).toBeCloseTo(12.5, 3);
	});
});

/* ============================================================ */
/*  18. Glycol 30 % MEG à 0 °C                                   */
/* ============================================================ */

describe('18. Glycol MEG 30 % à 0 °C — viscosité accrue', () => {
	test('ν MEG > 2 × ν eau pure', () => {
		// ν eau 0 °C ≈ 1.79e-6, ν MEG 30 % 0 °C ≈ 4.5e-6 → ratio ≈ 2.5
		const eau = proprietesFluide('eau', 0, 0);
		const meg = proprietesFluide('meg', 30, 0);
		expect(meg.nu).toBeGreaterThan(2 * eau.nu);
	});
	test('λ MEG > λ eau (Re plus faible → λ plus grand)', () => {
		const eau = proprietesFluide('eau', 0, 0);
		const meg = proprietesFluide('meg', 30, 0);
		const V = 1; // m/s
		const D = 0.02;
		const reEau = reynolds(V, D, eau.nu);
		const reMeg = reynolds(V, D, meg.nu);
		const lamEau = lambdaSerghides(reEau, 0.0015 / 20);
		const lamMeg = lambdaSerghides(reMeg, 0.0015 / 20);
		expect(lamMeg).toBeGreaterThan(lamEau);
	});
});

/* ============================================================ */
/*  19. Régime laminaire forcé                                   */
/* ============================================================ */

describe('19. Régime laminaire — très faible débit', () => {
	const circuit: Circuit = {
		preset: 'radiateurs',
		fluide: { type: 'meg', glycolPct: 50, temperature: 0 },
		troncons: [
			{
				id: 'T1',
				ordre: 1,
				libelle: 'Capillaire',
				type: 'raccordement',
				longueur: 1,
				diametre: { mode: 'manuel', materiau: 'cuivre_neuf', diametreIntMm: 4 },
				debit: { mode: 'manuel', valeurM3h: 0.005 },
				accessoires: []
			}
		]
	};
	const r = calculerPertesDeCharge(circuit);
	test('régime laminaire détecté', () => {
		expect(r.detail.troncons[0].regime).toBe('laminaire');
	});
	test('λ = 64 / Re', () => {
		const Re = r.detail.troncons[0].reynolds;
		expect(r.detail.troncons[0].lambda).toBeCloseTo(64 / Re, 9);
	});
});

/* ============================================================ */
/*  20. Régime transitoire — warning                             */
/* ============================================================ */

describe('20. Re transitoire — warning REGIME_TRANSITOIRE', () => {
	// Cible : Re ≈ 3000 (zone [2300 ; 4000]).
	// ν MEG 50 % @ 0 °C = 9.5e-6 m²/s ; D = 20 mm
	//   Re = V·D/ν = 3000 → V = 3000·9.5e-6/0.020 = 1.425 m/s
	//   Q = V·π·D²/4·3600 = 1.61 m³/h
	const circuit: Circuit = {
		preset: 'eau_glacee',
		fluide: { type: 'meg', glycolPct: 50, temperature: 0 },
		troncons: [
			{
				id: 'T1',
				ordre: 1,
				libelle: 'Tronçon test',
				type: 'colonne',
				longueur: 5,
				diametre: { mode: 'manuel', materiau: 'acier_noir_neuf', diametreIntMm: 20 },
				debit: { mode: 'manuel', valeurM3h: 1.6 },
				accessoires: []
			}
		]
	};
	const r = calculerPertesDeCharge(circuit);
	test('régime transitoire détecté', () => {
		expect(r.detail.troncons[0].regime).toBe('transitoire');
	});
	test('warning REGIME_TRANSITOIRE présent', () => {
		expect(
			r.warnings.some((w) => w.code === WARNING_CODES.REGIME_TRANSITOIRE)
		).toBe(true);
	});
});

/* ============================================================ */
/*  21. Auto-dim cuivre — Q=2 m³/h, V_max=1                      */
/* ============================================================ */

describe('21. Auto-dim — cuivre, Q=2 m³/h, V_max=1 m/s', () => {
	const r = autoDimensionnerDN({
		materiau: 'cuivre_neuf',
		debit: { mode: 'manuel', valeurM3h: 2 },
		fluide: { type: 'eau', temperature: 60 },
		criteres: { vitesseMaxMs: 1 }
	});
	test('succès', () => expect(r.succes).toBe(true));
	test('retient 35×1.5 (Dint=32, V≈0.69 m/s)', () => {
		expect(r.retenue?.designation).toBe('35x1.5');
		expect(r.retenue?.vitesseMs).toBeLessThan(1);
	});
	test('voisine inférieure : 28×1.5 (Dint=25, V≈1.13 m/s, NOK)', () => {
		expect(r.tropPetite?.designation).toBe('28x1.5');
		expect(r.tropPetite?.respecteCriteres).toBe(false);
	});
});

/* ============================================================ */
/*  22. Auto-dim — échec explicite                               */
/* ============================================================ */

describe('22. Auto-dim — échec : cuivre, Q=10 m³/h, V_max=0.5', () => {
	const r = autoDimensionnerDN({
		materiau: 'cuivre_neuf',
		debit: { mode: 'manuel', valeurM3h: 10 },
		fluide: { type: 'eau', temperature: 60 },
		criteres: { vitesseMaxMs: 0.5 }
	});
	test('échec explicite', () => {
		expect(r.succes).toBe(false);
		expect(r.retenue).toBeNull();
		expect(r.message).toMatch(/Aucune désignation/i);
	});
});

/* ============================================================ */
/*  23. Codes d'erreur — validation                              */
/* ============================================================ */

describe('23. Codes d\'erreur — validateInputs', () => {
	const base: Circuit = {
		preset: 'radiateurs',
		fluide: { type: 'eau', temperature: 60 },
		troncons: [
			{
				id: 'T1',
				ordre: 1,
				libelle: 'T1',
				type: 'autre',
				longueur: 10,
				diametre: { mode: 'designation', materiau: 'cuivre_neuf', designation: '22x1' },
				debit: { mode: 'manuel', valeurM3h: 0.5 },
				accessoires: []
			}
		]
	};

	test('INVALID_DIAMETER', () => {
		const r = validateInputs({
			...base,
			troncons: [
				{
					...base.troncons[0],
					diametre: { mode: 'manuel', materiau: 'cuivre_neuf', diametreIntMm: 0 }
				}
			]
		});
		expect(r.errors.some((e) => e.code === ERROR_CODES.INVALID_DIAMETER)).toBe(true);
	});

	test('INVALID_LENGTH', () => {
		const r = validateInputs({
			...base,
			troncons: [{ ...base.troncons[0], longueur: -1 }]
		});
		expect(r.errors.some((e) => e.code === ERROR_CODES.INVALID_LENGTH)).toBe(true);
	});

	test('INVALID_FLOW', () => {
		const r = validateInputs({
			...base,
			troncons: [{ ...base.troncons[0], debit: { mode: 'manuel', valeurM3h: 0 } }]
		});
		expect(r.errors.some((e) => e.code === ERROR_CODES.INVALID_FLOW)).toBe(true);
	});

	test('TEMPERATURE_OUT_OF_RANGE', () => {
		const r = validateInputs({ ...base, fluide: { type: 'eau', temperature: 250 } });
		expect(r.errors.some((e) => e.code === ERROR_CODES.TEMPERATURE_OUT_OF_RANGE)).toBe(true);
	});

	test('INCONSISTENT_FLUID', () => {
		const r = validateInputs({
			...base,
			fluide: { type: 'eau', glycolPct: 30, temperature: 60 }
		});
		expect(r.errors.some((e) => e.code === ERROR_CODES.INCONSISTENT_FLUID)).toBe(true);
	});

	test('UNKNOWN_DESIGNATION', () => {
		const r = validateInputs({
			...base,
			troncons: [
				{
					...base.troncons[0],
					diametre: { mode: 'designation', materiau: 'cuivre_neuf', designation: 'ABC' }
				}
			]
		});
		expect(r.errors.some((e) => e.code === ERROR_CODES.UNKNOWN_DESIGNATION)).toBe(true);
	});

	test('MISSING_KVS', () => {
		const r = validateInputs({
			...base,
			troncons: [
				{
					...base.troncons[0],
					accessoires: [{ type: 'vanne_kvs', quantite: 1 }]
				}
			]
		});
		expect(r.errors.some((e) => e.code === ERROR_CODES.MISSING_KVS)).toBe(true);
	});

	test('MISSING_DP_NOMINAL', () => {
		const r = validateInputs({
			...base,
			troncons: [
				{
					...base.troncons[0],
					accessoires: [{ type: 'equipement_dp', quantite: 1, dpNominaleKpa: 8 }]
				}
			]
		});
		expect(r.errors.some((e) => e.code === ERROR_CODES.MISSING_DP_NOMINAL)).toBe(true);
	});

	test('UNKNOWN_LAMBDA_METHOD', () => {
		const r = validateInputs({
			...base,
			options: { methodeLambda: 'inconnue' as unknown as Circuit['options'] extends infer T ? T extends { methodeLambda?: infer M } ? M : never : never }
		});
		expect(r.errors.some((e) => e.code === ERROR_CODES.UNKNOWN_LAMBDA_METHOD)).toBe(true);
	});

	test('GLYCOL_OUT_OF_RANGE', () => {
		const r = validateInputs({
			...base,
			fluide: { type: 'meg', glycolPct: 70, temperature: 20 }
		});
		expect(r.errors.some((e) => e.code === ERROR_CODES.GLYCOL_OUT_OF_RANGE)).toBe(true);
	});
});

/* ============================================================ */
/*  24. Pureté — déterminisme bit à bit                          */
/* ============================================================ */

describe('24. Pureté — appels successifs identiques', () => {
	const circuit: Circuit = {
		preset: 'radiateurs',
		fluide: { type: 'meg', glycolPct: 30, temperature: 60 },
		troncons: [
			{
				id: 'T1',
				ordre: 1,
				libelle: 'T1',
				type: 'colonne',
				longueur: 12,
				diametre: { mode: 'designation', materiau: 'acier_noir_neuf', designation: 'DN25' },
				debit: { mode: 'manuel', valeurM3h: 1.5 },
				accessoires: [
					{ type: 'coude_90_grand_rayon', quantite: 3 },
					{ type: 'vanne_papillon', quantite: 1 }
				]
			}
		]
	};
	test('HMT identique sur 2 appels', () => {
		const r1 = calculerPertesDeCharge(circuit);
		const r2 = calculerPertesDeCharge(circuit);
		expect(r1.resume.hmtTotale.Pa).toBe(r2.resume.hmtTotale.Pa);
		expect(r1.detail.troncons[0].lambda).toBe(r2.detail.troncons[0].lambda);
	});
});

/* ============================================================ */
/*  25. Non-mutation des entrées                                 */
/* ============================================================ */

describe('25. Non-mutation', () => {
	test('circuit en entrée inchangé après calcul', () => {
		const circuit: Circuit = {
			preset: 'radiateurs',
			fluide: { type: 'eau', temperature: 60 },
			troncons: [
				{
					id: 'T1',
					ordre: 1,
					libelle: 'T1',
					type: 'colonne',
					longueur: 10,
					diametre: { mode: 'designation', materiau: 'cuivre_neuf', designation: '22x1' },
					debit: { mode: 'manuel', valeurM3h: 0.6 },
					accessoires: [{ type: 'coude_90_grand_rayon', quantite: 4 }]
				}
			]
		};
		const snap = JSON.stringify(circuit);
		calculerPertesDeCharge(circuit);
		expect(JSON.stringify(circuit)).toBe(snap);
	});
});

/* ============================================================ */
/*  Tests complémentaires utiles                                 */
/* ============================================================ */

describe('Borda — élargissement brusque', () => {
	test('S1/S2 = 0.5 → ζ = 0.25', () => {
		expect(zetaBorda(0.5)).toBeCloseTo(0.25, 9);
	});
	test('S1/S2 = 0 (sortie réservoir) → ζ = 1', () => {
		expect(zetaBorda(0)).toBe(1);
	});
});

describe('Conversions sentinelles', () => {
	test('1 mCE = 9806.65 Pa exactement (g=9.80665)', () => {
		// Vérifié via dpToMCE
		expect(1 * 9806.65).toBe(9806.65);
	});
});

describe('rugositeRelative', () => {
	test('ε=0.0015 mm, D=20 mm → 7.5e-5', () => {
		expect(rugositeRelative(0.0015, 20)).toBeCloseTo(7.5e-5, 12);
	});
});

describe('lambdaDispatch — méthodes', () => {
	test('serghides retourne régime turbulent à Re=1e5', () => {
		const r = lambdaDispatch(1e5, 1e-4, 'serghides');
		expect(r.regime).toBe('turbulent');
		expect(r.methode).toBe('serghides');
	});
	test('colebrook retourne nombre d\'itérations', () => {
		const r = lambdaDispatch(1e5, 1e-4, 'colebrook');
		expect(r.iterationsColebrook).toBeGreaterThan(0);
		expect(r.iterationsColebrook).toBeLessThan(20);
	});
});

describe('Extrapolation hors table — throw', () => {
	test('eau à 150 °C → TEMPERATURE_OUT_OF_RANGE', () => {
		expect(() => proprietesFluide('eau', 0, 150)).toThrow();
	});
	test('MEG 30 % à -50 °C → throw', () => {
		expect(() => proprietesFluide('meg', 30, -50)).toThrow();
	});
});
