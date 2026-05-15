import { describe, expect, test } from 'vitest';
import {
	calculerAutorite,
	calculerDebit,
	calculerDpvReelle,
	calculerKv,
	dimensionnerV3V,
	dpvCible,
	plageDN,
	proprietesFluide,
	selectKvs,
	verdictAutorite
} from './calc';
import { validateInputs } from './validators';
import type { V3VInputs } from './types';

// 1 mCE (mètre de colonne d'eau) = ρ·g·h = 1000·9.80665·1 Pa = 0.0980665 bar
const mCEtoBar = (m: number) => m * 0.0980665;

describe('1. cas canonique — P=100 kW, ΔT=20 K, eau', () => {
	test('Q ≈ 4.30 m³/h', () => {
		// Q = 100 / (1.163 × 20)
		const props = proprietesFluide('eau');
		const Q = calculerDebit(100, 20, props.coefVolumique);
		expect(Q).toBeCloseTo(4.299, 2);
	});
});

describe('2. Q → Kv — Q=2.8 m³/h, ΔPv=15 mCE', () => {
	test('Kv ≈ 2.31', () => {
		const dPv_bar = mCEtoBar(15); // ≈ 1.47 bar
		const kv = calculerKv(2.8, dPv_bar);
		expect(kv).toBeCloseTo(2.31, 1);
	});
});

describe('3. autorité de référence ABCclim — ΔPv=15 mCE, ΔPr=10 mCE', () => {
	test('a = 0.60', () => {
		const a = calculerAutorite(15, 10);
		expect(a).toBeCloseTo(0.6, 6);
	});
});

describe('4. sélection Kvs — Kv théorique 5.7', () => {
	test('retient 4.0, pas 6.3', () => {
		const { retenu, inferieur, superieur } = selectKvs(5.7);
		expect(retenu).toBe(4.0);
		expect(inferieur).toBe(2.5);
		expect(superieur).toBe(6.3);
	});
	test('Kv théorique pile sur une valeur série → retenue', () => {
		expect(selectKvs(6.3).retenu).toBe(6.3);
	});
	test('Kv théorique sous le minimum de la série → premier Kvs', () => {
		expect(selectKvs(0.05).retenu).toBe(0.1);
	});
});

describe('5. eau glycolée 30 % MEG', () => {
	test('débit ≈ +6.8 % vs eau pure (cp plus faible)', () => {
		const eau = proprietesFluide('eau');
		const meg30 = proprietesFluide('meg', 30);
		const Q_eau = calculerDebit(100, 20, eau.coefVolumique);
		const Q_meg = calculerDebit(100, 20, meg30.coefVolumique);
		const ratio = Q_meg / Q_eau;
		expect(ratio).toBeGreaterThan(1.06);
		expect(ratio).toBeLessThan(1.08);
	});
	test('coefficient volumique MEG 30 % ≈ 1.089 kWh/(m³·K)', () => {
		const meg30 = proprietesFluide('meg', 30);
		expect(meg30.coefVolumique).toBeCloseTo(1.089, 2);
	});
});

describe('6. cohérence P/Q/ΔT', () => {
	test('saisie incohérente > 5 % → warning, calcul utilise Q saisi', () => {
		const inputs: V3VInputs = {
			puissance: 100,
			debit: 10, // incohérent : Q théorique ≈ 4.3
			deltaT: 20,
			fluide: 'eau',
			dpr: 20,
			autoriteCible: 0.5,
			temperature: 70
		};
		const r = dimensionnerV3V(inputs);
		expect(r.warnings.some((w) => /Incohérence P\/Q\/ΔT/i.test(w))).toBe(true);
		expect(r.debitCalcule).toBe(10);
	});
	test('saisie cohérente → pas de warning incohérence', () => {
		const r = dimensionnerV3V({
			puissance: 100,
			debit: 4.299,
			deltaT: 20,
			fluide: 'eau',
			dpr: 20,
			autoriteCible: 0.5,
			temperature: 70
		});
		expect(r.warnings.some((w) => /Incohérence P\/Q\/ΔT/i.test(w))).toBe(false);
	});
});

describe('7. autorité hors plage', () => {
	test('verdictAutorite(0.15) → rejete', () => {
		expect(verdictAutorite(0.15).verdict).toBe('rejete');
	});
	test('verdictAutorite(0.4) → limite', () => {
		expect(verdictAutorite(0.4).verdict).toBe('limite');
	});
	test('verdictAutorite(0.6) → optimal', () => {
		expect(verdictAutorite(0.6).verdict).toBe('optimal');
	});
	test('verdictAutorite(0.85) → acceptable', () => {
		expect(verdictAutorite(0.85).verdict).toBe('acceptable');
	});
	test('verdictAutorite(0.95) → rejete', () => {
		expect(verdictAutorite(0.95).verdict).toBe('rejete');
	});
});

describe('8. plage DN — Kvs = 6.3', () => {
	test('renvoie l\'enveloppe des DN dont la plage couvre 6.3', () => {
		// D'après la table donnée (DN 20: 2.5–6.3, DN 25: 4–10, DN 32: 6.3–16),
		// Kvs = 6.3 est borderline : il appartient à DN 20 (sup), DN 25 (intérieur)
		// et DN 32 (inf). On accepte la plage [20, 32] et on vérifie au moins
		// que DN 25 est compatible (le cœur typique d'un V3V Kvs 6.3).
		const range = plageDN(6.3);
		expect(range).not.toBeNull();
		const [min, max] = range!;
		expect(min).toBeLessThanOrEqual(25);
		expect(max).toBeGreaterThanOrEqual(25);
	});
	test('Kvs = 4.0 → DN compatible inclut 15, 20, 25', () => {
		const range = plageDN(4.0);
		expect(range).not.toBeNull();
		expect(range![0]).toBe(15);
	});
});

describe('9. cavitation', () => {
	test('ΔPv > 1 bar et T° > 100 °C → warning cavitation', () => {
		// Construction : ΔPr modeste, autorité cible élevée → Kv théorique petit,
		// Kvs retenu petit → ΔPv réelle grande.
		const r = dimensionnerV3V({
			debit: 10,
			deltaT: 15,
			fluide: 'eau',
			dpr: 50,
			autoriteCible: 0.7,
			temperature: 110
		});
		expect(r.dpvReelle_bar).toBeGreaterThan(1);
		expect(r.warnings.some((w) => /cavitation/i.test(w))).toBe(true);
	});
});

describe('10. cas dégénéré ΔPr = 0', () => {
	test('validateInputs détecte ΔPr hors plage [0.1 ; 1000]', () => {
		const out = validateInputs({
			puissance: 100,
			deltaT: 20,
			fluide: 'eau',
			dpr: 0,
			autoriteCible: 0.5,
			temperature: 70
		});
		expect(out.valid).toBe(false);
		expect(out.errors.some((e) => /ΔPr/.test(e))).toBe(true);
	});
	test('dimensionnerV3V throw explicitement sur ΔPr = 0', () => {
		expect(() =>
			dimensionnerV3V({
				puissance: 100,
				deltaT: 20,
				fluide: 'eau',
				dpr: 0,
				autoriteCible: 0.5,
				temperature: 70
			})
		).toThrow(/ΔPr/);
	});
});

describe('intégration — scénario complet eau', () => {
	test('100 kW / 20 K / ΔPr=20 kPa / a_cible=0.5 → Kvs catalogue cohérent', () => {
		const r = dimensionnerV3V({
			puissance: 100,
			deltaT: 20,
			fluide: 'eau',
			dpr: 20,
			autoriteCible: 0.5,
			temperature: 70
		});
		// Q ≈ 4.30 m³/h ; ΔPv_cible = 20 kPa = 0.2 bar
		// Kv_theorique = 4.30 / sqrt(0.2) ≈ 9.61
		// Kvs retenu = 6.3 (immédiatement inférieur à 9.61)
		expect(r.debitCalcule).toBeCloseTo(4.299, 2);
		expect(r.kvTheorique).toBeCloseTo(9.61, 1);
		expect(r.kvsRetenu).toBe(6.3);
		// ΔPv réelle = (4.299/6.3)² × 100 = 46.56 kPa
		expect(r.dpvReelle_kPa).toBeCloseTo(46.56, 1);
		// Autorité = 46.56 / (46.56 + 20) = 0.70
		expect(r.autoriteReelle).toBeCloseTo(0.7, 2);
		expect(r.verdict).toBe('optimal');
	});
});

describe('dpvCible — règle de l\'art', () => {
	test('a_cible = 0.5 → ΔPv = ΔPr', () => {
		expect(dpvCible(0.5, 20)).toBeCloseTo(20, 9);
	});
	test('a_cible = 0.7 → ΔPv = (0.7/0.3) · ΔPr ≈ 2.33 · ΔPr', () => {
		expect(dpvCible(0.7, 20) / 20).toBeCloseTo(7 / 3, 6);
	});
});

describe('calculerDpvReelle — réciproque de Kv', () => {
	test('appliquer Kv puis Dpv ⇒ identité (eau)', () => {
		const Q = 5;
		const dpv0 = 0.4; // bar
		const kv = calculerKv(Q, dpv0);
		const dpv1 = calculerDpvReelle(Q, kv);
		expect(dpv1).toBeCloseTo(dpv0, 9);
	});
});

describe('validators — plages et cohérences', () => {
	test('glycol > 0 avec fluide eau → erreur', () => {
		const out = validateInputs({
			puissance: 100,
			deltaT: 20,
			fluide: 'eau',
			glycolPct: 30,
			dpr: 20,
			autoriteCible: 0.5,
			temperature: 70
		});
		expect(out.valid).toBe(false);
		expect(out.errors.some((e) => /glycol/i.test(e))).toBe(true);
	});
	test('1 seule valeur dans la triade → erreur', () => {
		const out = validateInputs({
			puissance: 100,
			fluide: 'eau',
			dpr: 20,
			autoriteCible: 0.5,
			temperature: 70
		});
		expect(out.valid).toBe(false);
		expect(out.errors.some((e) => /deux valeurs/i.test(e))).toBe(true);
	});
	test('ΔPr très faible → warning', () => {
		const out = validateInputs({
			puissance: 50,
			deltaT: 10,
			fluide: 'eau',
			dpr: 0.5,
			autoriteCible: 0.5,
			temperature: 70
		});
		expect(out.warnings.some((w) => /faible/i.test(w))).toBe(true);
	});
	test('ΔPr très élevé → warning', () => {
		const out = validateInputs({
			puissance: 50,
			deltaT: 10,
			fluide: 'eau',
			dpr: 200,
			autoriteCible: 0.5,
			temperature: 70
		});
		expect(out.warnings.some((w) => /élevé/i.test(w))).toBe(true);
	});
	test('autorité cible hors [0.3 ; 0.8] → erreur', () => {
		const out = validateInputs({
			puissance: 100,
			deltaT: 20,
			fluide: 'eau',
			dpr: 20,
			autoriteCible: 0.9,
			temperature: 70
		});
		expect(out.valid).toBe(false);
		expect(out.errors.some((e) => /Autorité/.test(e))).toBe(true);
	});
});
