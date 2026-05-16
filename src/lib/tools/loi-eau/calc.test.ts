import { describe, expect, it } from 'vitest';
import { tDeparture, tDepartureRaw, sampleCurve, clampPoints } from './calc';

const base = { pente: 1.5, parallele: 0, tMin: 25, tMax: 75, tPivot: 20 };

describe('tDepartureRaw', () => {
	it('vaut T_pivot quand T_ext = T_pivot', () => {
		expect(tDepartureRaw(20, base)).toBeCloseTo(20, 6);
	});

	it("applique pente × ΔT", () => {
		// 20 + 1.5 × (20 - (-7)) = 20 + 40.5 = 60.5
		expect(tDepartureRaw(-7, base)).toBeCloseTo(60.5, 6);
	});

	it('translate avec parallèle', () => {
		expect(tDepartureRaw(-7, { ...base, parallele: 5 })).toBeCloseTo(65.5, 6);
	});

	it('descend en-dessous de T_pivot pour T_ext > T_pivot (sans clamp)', () => {
		expect(tDepartureRaw(25, base)).toBeCloseTo(20 + 1.5 * -5, 6);
	});
});

describe('tDeparture (avec clamp)', () => {
	it('clampe au T_max', () => {
		const cold = { ...base, pente: 3.0 };
		// raw à -15 = 20 + 3 × 35 = 125 → clampé à 75
		expect(tDeparture(-15, cold)).toBe(75);
	});

	it('clampe au T_min', () => {
		// raw à 30 = 20 + 1.5 × -10 = 5 → clampé à 25
		expect(tDeparture(30, base)).toBe(25);
	});

	it('ne clampe pas dans la plage utile', () => {
		const v = tDeparture(0, base);
		expect(v).toBeGreaterThan(25);
		expect(v).toBeLessThan(75);
	});
});

describe('sampleCurve', () => {
	it('produit (steps+1) points entre les bornes', () => {
		const out = sampleCurve(base, -15, 20, 35);
		expect(out.xs).toHaveLength(36);
		expect(out.ys).toHaveLength(36);
		expect(out.xs[0]).toBe(-15);
		expect(out.xs[35]).toBe(20);
	});

	it('ys est croissant quand T_ext décroît', () => {
		const out = sampleCurve(base, -15, 20, 10);
		for (let i = 1; i < out.ys.length; i++) {
			expect(out.ys[i]).toBeLessThanOrEqual(out.ys[i - 1]);
		}
	});
});

describe('clampPoints', () => {
	it('retourne (null, null) si pente nulle', () => {
		const p = clampPoints({ ...base, pente: 0 });
		expect(p.tExtAtMax).toBeNull();
		expect(p.tExtAtMin).toBeNull();
	});

	it('tExtAtMax correspond bien à T_départ = T_max', () => {
		const p = clampPoints({ ...base, pente: 2.0 });
		// raw = 75 → T_pivot + 2(T_pivot - T_ext) = 75
		// T_ext = T_pivot - (75 - T_pivot)/2 = 20 - 27.5 = -7.5
		expect(p.tExtAtMax!).toBeCloseTo(-7.5, 6);
	});
});
