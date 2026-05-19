import { describe, expect, test } from 'vitest';
import { decodeCayenneLPP } from './cayenne-lpp';

const lpp = (bytes: number[], fPort = 1) => decodeCayenneLPP({ bytes, fPort });

describe('decodeCayenneLPP', () => {
	test('decodes 4 temperature channels (positive)', () => {
		// 01 67 00 EB → ch1 temp 23.5°C
		// 02 67 00 D3 → ch2 temp 21.1°C
		const out = lpp([0x01, 0x67, 0x00, 0xeb, 0x02, 0x67, 0x00, 0xd3]);
		expect(out.errors).toEqual([]);
		expect(out.data.ch1_temperature).toEqual({ value: 23.5, unit: '°C' });
		expect(out.data.ch2_temperature).toEqual({ value: 21.1, unit: '°C' });
	});

	test('decodes negative temperature (signed int16)', () => {
		// 0xFFD7 = -41 → -4.1°C
		const out = lpp([0x01, 0x67, 0xff, 0xd7]);
		expect(out.errors).toEqual([]);
		expect(out.data.ch1_temperature).toEqual({ value: -4.1, unit: '°C' });
	});

	test('decodes humidity (uint8 / 2)', () => {
		// 0x64 = 100 → 50%
		const out = lpp([0x04, 0x68, 0x64]);
		expect(out.errors).toEqual([]);
		expect(out.data.ch4_humidity).toEqual({ value: 50, unit: '%' });
	});

	test('decodes barometer (uint16 / 10)', () => {
		// 0x27 0x6E = 10094 → 1009.4 hPa
		const out = lpp([0x05, 0x73, 0x27, 0x6e]);
		expect(out.data.ch5_barometer).toEqual({ value: 1009.4, unit: 'hPa' });
	});

	test('decodes GPS (3 × int24)', () => {
		// ch1 GPS — int24 signed BE, scaled /10000 for lat/lon, /100 for alt
		// lat 0x064765 = 411493 → 41.1493°
		// lon 0xF2960A = -879094 → -87.9094° (signed int24)
		// alt 0x000ED9 = 3801 → 38.01 m
		const out = lpp([0x01, 0x88, 0x06, 0x47, 0x65, 0xf2, 0x96, 0x0a, 0x00, 0x0e, 0xd9]);
		expect(out.errors).toEqual([]);
		const gps = out.data.ch1_gps as Record<string, number>;
		expect(gps.latitude).toBeCloseTo(41.1493, 4);
		expect(gps.longitude).toBeCloseTo(-87.9094, 4);
		expect(gps.altitude_m).toBeCloseTo(38.01, 2);
	});

	test('decodes accelerometer (3 × int16 mG)', () => {
		// ch6 accelerometer: x=4 mG, y=-101 mG, z=1014 mG
		const out = lpp([
			0x06, 0x71, 0x00, 0x04, 0xff, 0x9b, 0x03, 0xf6
		]);
		const acc = out.data.ch6_accelerometer as Record<string, number>;
		expect(acc.x).toBeCloseTo(0.004, 4);
		expect(acc.y).toBeCloseTo(-0.101, 4);
		expect(acc.z).toBeCloseTo(1.014, 4);
	});

	test('reports unknown type', () => {
		const out = lpp([0x01, 0xee, 0x00, 0x01]);
		expect(out.errors?.[0]).toMatch(/inconnu/);
	});

	test('reports truncated frame', () => {
		const out = lpp([0x01, 0x67, 0x00]); // temperature needs 2 bytes, only 1 available
		expect(out.errors?.[0]).toMatch(/tronqu/);
	});

	test('reports missing type byte', () => {
		const out = lpp([0x01]);
		expect(out.errors?.[0]).toMatch(/tronqu/);
	});

	test('returns empty result on empty input', () => {
		const out = lpp([]);
		expect(out.errors).toEqual([]);
		expect(out.data).toEqual({});
	});
});
