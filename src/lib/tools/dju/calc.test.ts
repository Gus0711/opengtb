import { describe, expect, it } from 'vitest';
import {
	buildBaseline,
	buildCsv,
	completeYears,
	linearRegression,
	parseConsoInput,
	recomputeWithBases
} from './calc';
import { parseDeptInput, postalCodeToDept } from './postal';
import type { BaselinePoint, StationData } from './types';

describe('postalCodeToDept', () => {
	it('extrait le département standard depuis un CP', () => {
		expect(postalCodeToDept('75001')).toBe('75');
		expect(postalCodeToDept('13013')).toBe('13');
		expect(postalCodeToDept('01000')).toBe('01');
	});

	it('distingue 2A et 2B', () => {
		expect(postalCodeToDept('20000')).toBe('2A'); // Ajaccio
		expect(postalCodeToDept('20100')).toBe('2A'); // Sartène
		expect(postalCodeToDept('20200')).toBe('2B'); // Bastia
		expect(postalCodeToDept('20290')).toBe('2B');
	});

	it('rejette les entrées invalides', () => {
		expect(postalCodeToDept('1234')).toBeNull();
		expect(postalCodeToDept('abcde')).toBeNull();
		expect(postalCodeToDept('98000')).toBeNull(); // Monaco
	});

	it('gère les DROM en 3 chiffres', () => {
		expect(postalCodeToDept('97400')).toBe('974');
		expect(postalCodeToDept('97100')).toBe('971');
	});
});

describe('parseDeptInput', () => {
	it('accepte un CP', () => {
		expect(parseDeptInput('75001')).toBe('75');
	});
	it('accepte un code dept 2 chars', () => {
		expect(parseDeptInput('13')).toBe('13');
	});
	it('zéro-pad un code dept 1 char', () => {
		expect(parseDeptInput('1')).toBe('01');
	});
	it('accepte 2A / 2B', () => {
		expect(parseDeptInput('2a')).toBe('2A');
		expect(parseDeptInput('2B')).toBe('2B');
	});
	it('rejette une chaîne vide', () => {
		expect(parseDeptInput('')).toBeNull();
		expect(parseDeptInput('   ')).toBeNull();
	});
});

const fixture: StationData = {
	id: 'TEST',
	name: 'TEST',
	dept: '99',
	deptName: 'Test',
	lat: 0,
	lon: 0,
	alt: 0,
	typePoste: 1,
	period: { start: '2020-01-01T00:00:00Z', end: '2022-01-01T00:00:00Z' },
	baseHeating: 18,
	baseCooling: 24,
	updatedAt: '2026-01-01T00:00:00Z',
	monthly: [
		{ date: '2020-01', tMean: 4, nbDays: 31, djuH: 434, djuC: 0 },
		{ date: '2020-02', tMean: 6, nbDays: 29, djuH: 348, djuC: 0 },
		{ date: '2021-01', tMean: 3, nbDays: 31, djuH: 465, djuC: 0 }
	],
	yearly: [
		{ year: 2020, tMean: 5, djuH: 2500, djuC: 0, monthsCovered: 12, complete: true },
		{ year: 2021, tMean: 6, djuH: 2300, djuC: 50, monthsCovered: 12, complete: true },
		{ year: 2022, tMean: 7, djuH: 1000, djuC: 0, monthsCovered: 5, complete: false }
	],
	averages: {
		yearly: { djuH: 2400, djuC: 25, tMean: 5.5, yearsCount: 2 },
		monthly: []
	}
};

describe('completeYears', () => {
	it('renvoie les années complètes uniquement', () => {
		expect(completeYears(fixture)).toEqual([2020, 2021]);
	});
});

describe('recomputeWithBases', () => {
	it('recalcule les DJU avec une nouvelle base chauffage', () => {
		// fixture.monthly[0] : tMean=4, nbDays=31 → base 18 ⇒ (18-4)*31 = 434
		// base 16 ⇒ (16-4)*31 = 372
		const r = recomputeWithBases(fixture, 16, 24);
		expect(r.monthly[0].djuH).toBe(372);
		expect(r.baseHeating).toBe(16);
	});
	it('met djuH à 0 quand tMean ≥ base', () => {
		// fixture.monthly[0] : tMean=4 → base 3 ⇒ max(0, 3-4) = 0
		const r = recomputeWithBases(fixture, 3, 24);
		expect(r.monthly[0].djuH).toBe(0);
	});
	it('recalcule clim avec base 20 (frigorifique courant)', () => {
		// tMean=6 < 20 → djuC = 0
		const r = recomputeWithBases(fixture, 18, 20);
		expect(r.monthly[1].djuC).toBe(0);
		expect(r.baseCooling).toBe(20);
	});
	it('agrège les annuels cohérents avec les mensuels', () => {
		const r = recomputeWithBases(fixture, 16, 24);
		const y2020 = r.yearly.find((y) => y.year === 2020)!;
		// Les 2 mois 2020 du fixture : (16-4)*31 + (16-6)*29 = 372 + 290 = 662
		// mais la 3e ligne (2021-01) n'est pas dans 2020 → 662
		expect(y2020.djuH).toBe(662);
	});
});

describe('buildCsv', () => {
	it('produit un CSV ; avec en-tête', () => {
		const csv = buildCsv(fixture);
		const lines = csv.trim().split('\n');
		expect(lines[0]).toBe('date;tMean_C;nbDays;djuH_base18;djuC_base24');
		expect(lines).toHaveLength(4);
		expect(lines[1]).toBe('2020-01;4;31;434;0');
	});
	it('filtre par années si demandé', () => {
		const csv = buildCsv(fixture, [2021]);
		const lines = csv.trim().split('\n');
		expect(lines).toHaveLength(2);
		expect(lines[1].startsWith('2021-01')).toBe(true);
	});
});

describe('linearRegression', () => {
	it('retrouve a et b sur des points alignés exactement', () => {
		// y = 2.5·x + 100
		const points: BaselinePoint[] = [];
		for (let x = 0; x < 12; x++) {
			points.push({ yearMonth: `2023-${String(x + 1).padStart(2, '0')}`, dju: x * 100, conso: 2.5 * x * 100 + 100 });
		}
		const r = linearRegression(points);
		expect(r).not.toBeNull();
		expect(r!.a).toBeCloseTo(2.5, 4);
		expect(r!.b).toBeCloseTo(100, 4);
		expect(r!.r2).toBeCloseTo(1, 6);
		expect(r!.n).toBe(12);
	});

	it('renvoie un R² < 1 sur des points bruités', () => {
		const points: BaselinePoint[] = [
			{ yearMonth: '2023-01', dju: 400, conso: 1100 },
			{ yearMonth: '2023-02', dju: 300, conso: 880 },
			{ yearMonth: '2023-03', dju: 200, conso: 620 },
			{ yearMonth: '2023-04', dju: 100, conso: 360 },
			{ yearMonth: '2023-05', dju: 50, conso: 250 }
		];
		const r = linearRegression(points);
		expect(r).not.toBeNull();
		expect(r!.a).toBeGreaterThan(1);
		expect(r!.r2).toBeGreaterThan(0.9);
	});

	it('renvoie null si < 3 points', () => {
		expect(linearRegression([])).toBeNull();
		expect(
			linearRegression([{ yearMonth: '2023-01', dju: 100, conso: 500 }])
		).toBeNull();
	});
});

describe('buildBaseline', () => {
	it('associe les consos aux DJU disponibles et liste les mois manquants', () => {
		const consos = [
			{ yearMonth: '2020-01', conso: 12000 },
			{ yearMonth: '2020-02', conso: 9000 },
			{ yearMonth: '1999-12', conso: 5000 } // hors période → missing
		];
		const r = buildBaseline(fixture, consos);
		expect(r.points).toHaveLength(2);
		expect(r.points[0]).toEqual({ yearMonth: '2020-01', dju: 434, conso: 12000 });
		expect(r.missing).toEqual(['1999-12']);
	});
});

describe('parseConsoInput', () => {
	it('parse un format standard YYYY-MM;kWh', () => {
		const r = parseConsoInput('2023-01;12000\n2023-02;9500\n2023-03;7000');
		expect(r.points).toEqual([
			{ yearMonth: '2023-01', conso: 12000 },
			{ yearMonth: '2023-02', conso: 9500 },
			{ yearMonth: '2023-03', conso: 7000 }
		]);
		expect(r.errors).toEqual([]);
	});

	it('tolère plusieurs séparateurs et la virgule décimale', () => {
		const r = parseConsoInput('2023-01,12000\n2023/02\t9500,5\n2023-03    7000');
		expect(r.points).toHaveLength(3);
		expect(r.points[1].conso).toBeCloseTo(9500.5);
	});

	it('accepte plusieurs formats de date', () => {
		const r = parseConsoInput('202301;100\n01/2023;200\n2023-03;300');
		expect(r.points.map((p) => p.yearMonth)).toEqual(['2023-01', '2023-01', '2023-03']);
	});

	it('ignore lignes vides et commentaires #', () => {
		const r = parseConsoInput('# baseline 2023\n\n2023-01;100\n\n# trou\n2023-03;200');
		expect(r.points).toHaveLength(2);
		expect(r.errors).toEqual([]);
	});

	it('rapporte les lignes invalides sans bloquer le reste', () => {
		const r = parseConsoInput('2023-01;100\nfoo;bar\n2023-02;200');
		expect(r.points).toHaveLength(2);
		expect(r.errors).toHaveLength(1);
		expect(r.errors[0]).toContain('Ligne 2');
	});
});
