import { beforeEach, describe, expect, test, vi } from 'vitest';
import { _clearCache, buildRows, decode } from './decoder';
import type { ManifestDevice } from './types';

const cayenneDevice: ManifestDevice = {
	slug: 'generic-cayenne-lpp',
	vendorId: 'generic',
	vendorName: 'Generic',
	deviceId: 'cayenne-lpp',
	name: 'Cayenne LPP',
	regions: [],
	fPorts: [],
	codecFile: 'internal:cayenne-lpp',
	examples: []
};

const ttnV3Device: ManifestDevice = {
	slug: 'test-v3',
	vendorId: 'test',
	vendorName: 'Test',
	deviceId: 'v3',
	name: 'Test V3 Codec',
	regions: [],
	fPorts: [],
	codecFile: 'ttn-v3/test-v3.js',
	downloads: { ttnV3: 'ttn-v3/test-v3.js', chirpstackV4: 'chirpstack-v4/test-v3.js' },
	examples: []
};

const ttnNamespacedDevice: ManifestDevice = {
	slug: 'test-namespaced',
	vendorId: 'test',
	vendorName: 'Test',
	deviceId: 'namespaced',
	name: 'Test Namespaced Codec',
	regions: [],
	fPorts: [],
	codecFile: 'ttn-v3/test-namespaced.js',
	downloads: { ttnV3: 'ttn-v3/test-namespaced.js', chirpstackV4: 'chirpstack-v4/test-namespaced.js' },
	examples: []
};

const brokenDevice: ManifestDevice = {
	slug: 'test-broken',
	vendorId: 'test',
	vendorName: 'Test',
	deviceId: 'broken',
	name: 'Broken codec',
	regions: [],
	fPorts: [],
	codecFile: 'ttn-v3/test-broken.js',
	downloads: { ttnV3: 'ttn-v3/test-broken.js', chirpstackV4: 'chirpstack-v4/test-broken.js' },
	examples: []
};

const SOURCES: Record<string, string> = {
	'ttn-v3/test-v3.js': `
		function decodeUplink(input) {
			if (input.fPort !== 1) {
				return { data: {}, warnings: [], errors: ['fPort non supporté'] };
			}
			return {
				data: { temperature: input.bytes[0], humidity: input.bytes[1] },
				warnings: [],
				errors: []
			};
		}
	`,
	'ttn-v3/test-namespaced.js': `
		var codec = {};
		codec.decodeUplink = function(input) {
			return { data: { count: input.bytes.length }, warnings: [], errors: [] };
		};
	`,
	'ttn-v3/test-broken.js': `
		// Aucune fonction decodeUplink ni codec.decodeUplink
		var x = 1 + 1;
	`
};

beforeEach(() => {
	_clearCache();
	global.fetch = vi.fn(async (url: RequestInfo | URL) => {
		const u = String(url);
		const key = u.replace('/data/lorawan-codecs/', '');
		const body = SOURCES[key];
		if (body === undefined) {
			return new Response(null, { status: 404 });
		}
		return new Response(body, { status: 200 });
	}) as unknown as typeof fetch;
});

describe('decode — cayenne lpp (internal)', () => {
	test('decodes a temperature sample', async () => {
		const r = await decode({
			device: cayenneDevice,
			bytes: [0x01, 0x67, 0x00, 0xeb],
			fPort: 1,
			format: 'hex'
		});
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.data.ch1_temperature).toEqual({ value: 23.5, unit: '°C' });
		expect(r.rows.find((row) => row.key === 'ch1_temperature')?.value).toBe('23.5 °C');
	});
});

describe('decode — ttn v3', () => {
	test('decodes via decodeUplink', async () => {
		const r = await decode({
			device: ttnV3Device,
			bytes: [22, 65],
			fPort: 1,
			format: 'hex'
		});
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.data).toEqual({ temperature: 22, humidity: 65 });
	});

	test('reports codec errors when data is empty', async () => {
		const r = await decode({
			device: ttnV3Device,
			bytes: [22, 65],
			fPort: 99,
			format: 'hex'
		});
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.stage).toBe('execute-codec');
		expect(r.codecErrors).toContain('fPort non supporté');
	});
});

describe('decode — ttn v3 namespaced', () => {
	test('finds decodeUplink exposed via codec namespace', async () => {
		const r = await decode({
			device: ttnNamespacedDevice,
			bytes: [1, 2, 3],
			fPort: 1,
			format: 'hex'
		});
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.data).toEqual({ count: 3 });
	});
});

describe('decode — error paths', () => {
	test('fails on empty payload', async () => {
		const r = await decode({
			device: cayenneDevice,
			bytes: [],
			fPort: 1,
			format: 'hex'
		});
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.stage).toBe('parse-payload');
	});

	test('fails on fPort out of range', async () => {
		const r = await decode({
			device: cayenneDevice,
			bytes: [1, 2],
			fPort: 0,
			format: 'hex'
		});
		expect(r.ok).toBe(false);
	});

	test('fails on payload too long', async () => {
		const r = await decode({
			device: cayenneDevice,
			bytes: new Array(300).fill(0),
			fPort: 1,
			format: 'hex'
		});
		expect(r.ok).toBe(false);
	});

	test('fails when codec defines no entry point', async () => {
		const r = await decode({
			device: brokenDevice,
			bytes: [1],
			fPort: 1,
			format: 'hex'
		});
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.stage).toBe('load-codec');
	});
});

describe('buildRows', () => {
	test('flattens { value, unit } pattern', () => {
		const rows = buildRows({ temperature: { value: 22.5, unit: '°C' } });
		expect(rows).toEqual([{ key: 'temperature', value: '22.5 °C', kind: 'number' }]);
	});

	test('descends into nested objects with dot notation', () => {
		const rows = buildRows({ gps: { latitude: 41.1493, longitude: -89.0358 } });
		expect(rows).toEqual([
			{ key: 'gps.latitude', value: '41.1493', kind: 'number' },
			{ key: 'gps.longitude', value: '-89.0358', kind: 'number' }
		]);
	});

	test('serialises arrays as JSON', () => {
		const rows = buildRows({ tags: ['a', 'b'] });
		expect(rows).toEqual([{ key: 'tags', value: '["a","b"]', kind: 'array' }]);
	});

	test('formats booleans', () => {
		const rows = buildRows({ on: true, off: false });
		expect(rows).toEqual([
			{ key: 'on', value: 'true', kind: 'boolean' },
			{ key: 'off', value: 'false', kind: 'boolean' }
		]);
	});
});
