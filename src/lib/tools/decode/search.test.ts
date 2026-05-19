import { describe, expect, test } from 'vitest';
import { searchDevices } from './search';
import type { Manifest, ManifestDevice } from './types';

function dev(slug: string, vendorName: string, name: string): ManifestDevice {
	return {
		slug,
		vendorId: slug.split('-')[0],
		vendorName,
		deviceId: slug.split('-').slice(1).join('-'),
		name,
		regions: [],
		fPorts: [],
		codecFile: `ttn-v3/${slug}.js`,
		examples: []
	};
}

const manifest: Manifest = {
	generatedAt: '',
	source: { repo: '', commit: '', commitDate: '' },
	vendors: [],
	devices: [
		dev('mclimate-vicki', 'MClimate', 'Vicki LoRaWAN Radiator Thermostat'),
		dev('milesight-iot-am102', 'Milesight IoT', 'AM102 2-in-1 IAQ Sensor'),
		dev('milesight-iot-am103', 'Milesight IoT', 'AM103 3-in-1 IAQ Sensor'),
		dev('milesight-iot-wt101', 'Milesight IoT', 'WT101 Smart Thermostat'),
		dev('enless-tx-pulse-600', 'Enless Wireless', '600 Pulse transmitter'),
		dev('dragino-lht65', 'Dragino', 'LHT65 Temperature & Humidity Sensor')
	],
	warnings: []
};

describe('searchDevices', () => {
	test('empty query returns first N devices', () => {
		const r = searchDevices(manifest, '');
		expect(r.length).toBe(manifest.devices.length);
	});

	test('matches on vendor name', () => {
		const r = searchDevices(manifest, 'milesight');
		expect(r).toHaveLength(3);
		expect(r.every((d) => d.vendorName.toLowerCase().includes('milesight'))).toBe(true);
	});

	test('matches on device name', () => {
		const r = searchDevices(manifest, 'vicki');
		expect(r).toHaveLength(1);
		expect(r[0].slug).toBe('mclimate-vicki');
	});

	test('AND across tokens', () => {
		const r = searchDevices(manifest, 'milesight thermostat');
		expect(r).toHaveLength(1);
		expect(r[0].slug).toBe('milesight-iot-wt101');
	});

	test('case insensitive', () => {
		const r1 = searchDevices(manifest, 'VICKI');
		const r2 = searchDevices(manifest, 'vicki');
		expect(r1).toEqual(r2);
	});

	test('returns no result when token does not match', () => {
		expect(searchDevices(manifest, 'xyz-unknown')).toEqual([]);
	});

	test('ranks early matches higher', () => {
		// "thermostat" matches in both Vicki name and WT101 name, but appears earlier in WT101
		// (after "Smart"). Sanity check: vicki has "thermostat" at the end, so WT101 wins.
		const r = searchDevices(manifest, 'thermostat');
		expect(r[0].slug).toBe('milesight-iot-wt101');
	});
});
