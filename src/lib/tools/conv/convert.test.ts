import { describe, expect, test } from 'vitest';
import { CATEGORIES, getCategory } from './data';
import { convert, convertById, formatResult } from './convert';

const cat = (slug: string) => {
	const c = getCategory(slug);
	if (!c) throw new Error(`category ${slug} not found`);
	return c;
};

const approx = (a: number, b: number, eps = 1e-6) =>
	Math.abs(a - b) < eps * Math.max(1, Math.abs(b));

describe('convert — énergie', () => {
	const energie = cat('energie');
	test('1 kWh = 3 600 000 J', () => {
		expect(convertById(1, 'kWh', 'J', energie)).toBeCloseTo(3_600_000, 6);
	});
	test('1 kWh = 3 600 kJ', () => {
		expect(convertById(1, 'kWh', 'kJ', energie)).toBeCloseTo(3600, 6);
	});
	test('1 kWh = 3.6 MJ', () => {
		expect(convertById(1, 'kWh', 'MJ', energie)).toBeCloseTo(3.6, 9);
	});
	test('1 thermie = 4.184 MJ', () => {
		expect(convertById(1, 'th', 'MJ', energie)).toBeCloseTo(4.184, 9);
	});
	test('1 BTU ≈ 1055.056 J', () => {
		expect(convertById(1, 'BTU', 'J', energie)).toBeCloseTo(1055.05585262, 6);
	});
});

describe('convert — température (affine)', () => {
	const temp = cat('temperature');
	test('100 °C = 212 °F', () => {
		expect(convertById(100, 'C', 'F', temp)).toBeCloseTo(212, 6);
	});
	test('100 °C = 373.15 K', () => {
		expect(convertById(100, 'C', 'K', temp)).toBeCloseTo(373.15, 6);
	});
	test('0 °C = 32 °F', () => {
		expect(convertById(0, 'C', 'F', temp)).toBeCloseTo(32, 6);
	});
	test('−40 °C = −40 °F', () => {
		expect(convertById(-40, 'C', 'F', temp)).toBeCloseTo(-40, 6);
	});
	test('0 K = −273.15 °C', () => {
		expect(convertById(0, 'K', 'C', temp)).toBeCloseTo(-273.15, 6);
	});
});

describe('convert — pression', () => {
	const p = cat('pression');
	test('1 bar = 100 000 Pa', () => {
		expect(convertById(1, 'bar', 'Pa', p)).toBeCloseTo(100_000, 6);
	});
	test('1 bar = 1000 hPa', () => {
		expect(convertById(1, 'bar', 'hPa', p)).toBeCloseTo(1000, 6);
	});
	test('1 bar ≈ 14.5038 psi', () => {
		expect(convertById(1, 'bar', 'psi', p)).toBeCloseTo(14.5037738, 4);
	});
	test('1 mmCE = 9.80665 Pa', () => {
		expect(convertById(1, 'mmCE', 'Pa', p)).toBeCloseTo(9.80665, 9);
	});
	test('100 mmCE = 980.665 Pa', () => {
		expect(convertById(100, 'mmCE', 'Pa', p)).toBeCloseTo(980.665, 6);
	});
});

describe('convert — débit', () => {
	const d = cat('debit');
	test('1 m³/h ≈ 0.2778 L/s', () => {
		expect(convertById(1, 'm3h', 'Ls', d)).toBeCloseTo(0.277778, 5);
	});
	test('1 m³/h ≈ 16.667 L/min', () => {
		expect(convertById(1, 'm3h', 'Lmin', d)).toBeCloseTo(16.6667, 4);
	});
	test('1 m³/h = 1000 L/h', () => {
		expect(convertById(1, 'm3h', 'Lh', d)).toBeCloseTo(1000, 6);
	});
});

describe('convert — vitesse air', () => {
	const v = cat('vitesse-air');
	test('1 m/s = 3.6 km/h', () => {
		expect(convertById(1, 'ms', 'kmh', v)).toBeCloseTo(3.6, 9);
	});
	test('1 m/s ≈ 196.85 ft/min', () => {
		expect(convertById(1, 'ms', 'ftmin', v)).toBeCloseTo(196.8504, 3);
	});
});

describe('convert — puissance', () => {
	const w = cat('puissance');
	test('1 kW = 1000 W', () => {
		expect(convertById(1, 'kW', 'W', w)).toBeCloseTo(1000, 6);
	});
	test('1 ch ≈ 735.5 W', () => {
		expect(convertById(1, 'ch', 'W', w)).toBeCloseTo(735.49875, 6);
	});
	test('1 kW ≈ 3412.14 BTU/h', () => {
		expect(convertById(1, 'kW', 'BTUh', w)).toBeCloseTo(3412.142, 2);
	});
});

describe('convert — volume', () => {
	const v = cat('volume');
	test('1 m³ = 1000 L', () => {
		expect(convertById(1, 'm3', 'L', v)).toBeCloseTo(1000, 6);
	});
	test('1 gal (US) ≈ 3.7854 L', () => {
		expect(convertById(1, 'galUS', 'L', v)).toBeCloseTo(3.785412, 5);
	});
	test('1 gal (UK) ≈ 4.5461 L', () => {
		expect(convertById(1, 'galUK', 'L', v)).toBeCloseTo(4.54609, 5);
	});
});

describe('bidirectionnalité', () => {
	// Pour chaque catégorie et chaque paire (A,B), convert(X, A, B) puis
	// convert(résultat, B, A) doit redonner X à epsilon près.
	for (const c of CATEGORIES) {
		for (const a of c.units) {
			for (const b of c.units) {
				if (a.id === b.id) continue;
				test(`${c.slug}: ${a.id} → ${b.id} → ${a.id}`, () => {
					const X = c.slug === 'temperature' ? 21.5 : 4.2;
					const round = convert(convert(X, a, b), b, a);
					expect(approx(round, X, 1e-9)).toBe(true);
				});
			}
		}
	}
});

describe('formatResult', () => {
	test('entiers gardés', () => {
		expect(formatResult(1000)).toBe('1000');
		expect(formatResult(0)).toBe('0');
		expect(formatResult(-42)).toBe('-42');
	});
	test('décimales nettoyées (6 chiffres sig)', () => {
		expect(formatResult(0.27777777777)).toBe('0.277778');
		expect(formatResult(3.6)).toBe('3.6');
		expect(formatResult(16.66667)).toBe('16.6667');
	});
	test('petits nombres en scientifique', () => {
		expect(formatResult(0.00001234)).toMatch(/e-/);
	});
	test('très grands en scientifique', () => {
		expect(formatResult(123_456_789)).toMatch(/e\+/);
	});
	test('NaN/null → ""', () => {
		expect(formatResult(NaN)).toBe('');
		expect(formatResult(null)).toBe('');
	});
});
