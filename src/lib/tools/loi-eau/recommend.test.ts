import { describe, expect, it } from 'vitest';
import { recommend, effectiveUbat } from './recommend';

describe('recommend', () => {
	it('pente Rad HT en H1 ~ 2.2 pour bâti référence', () => {
		// (80-20)/(20 - (-7)) = 60/27 ≈ 2.22 × (0.85/0.85=1.0) = 2.2
		const r = recommend({ emitter: 'rad-ht', zone: 'H1', tPivot: 20, ubat: 0.85 });
		expect(r.pente).toBeCloseTo(2.2, 1);
	});

	it('pente plancher en H1 ~ 0.6 pour bâti référence', () => {
		// (35-20)/27 = 0.556
		const r = recommend({ emitter: 'plancher', zone: 'H1', tPivot: 20, ubat: 0.85 });
		expect(r.pente).toBeGreaterThan(0.4);
		expect(r.pente).toBeLessThan(0.8);
	});

	it("pente rad HT > pente plancher (cohérence métier)", () => {
		const ht = recommend({ emitter: 'rad-ht', zone: 'H1', tPivot: 20, ubat: 0.85 });
		const pc = recommend({ emitter: 'plancher', zone: 'H1', tPivot: 20, ubat: 0.85 });
		expect(ht.pente).toBeGreaterThan(pc.pente);
	});

	it('bâti mieux isolé → pente plus faible', () => {
		const passoire = recommend({ emitter: 'rad-bt', zone: 'H1', tPivot: 20, ubat: 2.0 });
		const bbc = recommend({ emitter: 'rad-bt', zone: 'H1', tPivot: 20, ubat: 0.3 });
		expect(bbc.pente).toBeLessThan(passoire.pente);
	});

	it('zone H3 (douce) → pente plus élevée que H1 à émetteur égal', () => {
		// En H3, T_pivot - T_ext_base = 20 - 3 = 17, donc dénominateur plus
		// petit → pente plus grande pour atteindre le même T_dep nominal.
		const h1 = recommend({ emitter: 'rad-ht', zone: 'H1', tPivot: 20, ubat: 0.85 });
		const h3 = recommend({ emitter: 'rad-ht', zone: 'H3', tPivot: 20, ubat: 0.85 });
		expect(h3.pente).toBeGreaterThan(h1.pente);
	});

	it('bornes par défaut viennent de l\'émetteur', () => {
		const r = recommend({ emitter: 'plancher', zone: 'H1', tPivot: 20, ubat: 0.5 });
		expect(r.tMax).toBe(45);
		expect(r.tMin).toBe(22);
	});
});

describe('effectiveUbat', () => {
	it('priorise ubat saisi', () => {
		expect(effectiveUbat({ ubat: 0.4, periodUbat: 1.2, isolationUbat: 0.85 })).toBe(0.4);
	});

	it('fallback période si ubat absent', () => {
		expect(effectiveUbat({ periodUbat: 1.2, isolationUbat: 0.85 })).toBe(1.2);
	});

	it('fallback isolation si année absente', () => {
		expect(effectiveUbat({ isolationUbat: 0.85 })).toBe(0.85);
	});

	it('valeur par défaut quand tout est absent', () => {
		expect(effectiveUbat({})).toBe(0.85);
	});
});
