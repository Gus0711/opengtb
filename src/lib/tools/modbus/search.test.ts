import { describe, expect, test } from 'vitest';
import {
	EMPTY_FILTERS,
	facetCounts,
	filterDevices,
	filtersFromQuery,
	filtersToQuery,
	matchesQuery
} from './search.ts';
import type { ModbusManifestDevice } from './types.ts';

function dev(p: Partial<ModbusManifestDevice>): ModbusManifestDevice {
	return {
		slug: 'x-y',
		vendor: 'X',
		vendorSlug: 'x',
		model: 'Y',
		modelSlug: 'y',
		name: 'X Y',
		equipmentType: 'autre',
		transport: ['rtu'],
		registerCount: 1,
		needsReview: false,
		...p
	};
}

const sample: ModbusManifestDevice[] = [
	dev({ vendor: 'Eastron', model: 'SDM630', name: 'Eastron SDM630', equipmentType: 'compteur-elec', transport: ['rtu'] }),
	dev({ vendor: 'Eastron', model: 'SDM230', name: 'Eastron SDM230', equipmentType: 'compteur-elec', transport: ['rtu'] }),
	dev({ vendor: 'Fronius', model: 'Symo', name: 'Fronius Symo', equipmentType: 'onduleur-pv', transport: ['tcp'] }),
	dev({ vendor: 'Dimplex', model: 'SI-11TU', name: 'Dimplex SI-11TU', equipmentType: 'pac', transport: ['rtu', 'tcp'] })
];

describe('matchesQuery', () => {
	test('empty query matches all', () => {
		expect(matchesQuery(sample[0], '')).toBe(true);
	});
	test('vendor match', () => {
		expect(matchesQuery(sample[0], 'eastron')).toBe(true);
	});
	test('case + diacritics insensitive', () => {
		expect(matchesQuery(sample[2], 'FRONIUS')).toBe(true);
	});
	test('AND across tokens', () => {
		expect(matchesQuery(sample[0], 'eastron 630')).toBe(true);
		expect(matchesQuery(sample[0], 'eastron 230')).toBe(false);
	});
});

describe('filterDevices', () => {
	test('aucun filtre = tout', () => {
		expect(filterDevices(sample, EMPTY_FILTERS)).toHaveLength(4);
	});
	test('filtre vendor', () => {
		const r = filterDevices(sample, { ...EMPTY_FILTERS, vendors: ['Eastron'] });
		expect(r).toHaveLength(2);
	});
	test('filtre type', () => {
		const r = filterDevices(sample, { ...EMPTY_FILTERS, equipmentTypes: ['onduleur-pv'] });
		expect(r).toHaveLength(1);
		expect(r[0].vendor).toBe('Fronius');
	});
	test('filtre transport (union OR)', () => {
		const r = filterDevices(sample, { ...EMPTY_FILTERS, transports: ['tcp'] });
		expect(r.map((d) => d.vendor)).toEqual(['Fronius', 'Dimplex']);
	});
	test('intersection des facettes', () => {
		const r = filterDevices(sample, {
			...EMPTY_FILTERS,
			equipmentTypes: ['compteur-elec'],
			transports: ['rtu']
		});
		expect(r).toHaveLength(2);
	});
});

describe('facetCounts', () => {
	test('vendor counts ignorent le filtre vendor courant', () => {
		const counts = facetCounts(sample, { ...EMPTY_FILTERS, vendors: ['Eastron'] }, 'vendor');
		expect(counts.get('Eastron')).toBe(2);
		expect(counts.get('Fronius')).toBe(1);
	});
	test('transport counts (array field)', () => {
		const counts = facetCounts(sample, EMPTY_FILTERS, 'transport');
		expect(counts.get('rtu')).toBe(3);
		expect(counts.get('tcp')).toBe(2);
	});
});

describe('filtersToQuery / fromQuery', () => {
	test('round-trip', () => {
		const f = {
			query: 'foo',
			vendors: ['Eastron'],
			equipmentTypes: ['compteur-elec' as const],
			transports: ['rtu' as const]
		};
		const qs = filtersToQuery(f);
		expect(qs).toContain('q=foo');
		const back = filtersFromQuery(new URLSearchParams(qs.replace('?', '')));
		expect(back).toEqual(f);
	});
	test('vide → chaîne vide', () => {
		expect(filtersToQuery(EMPTY_FILTERS)).toBe('');
	});
});
