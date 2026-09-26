import { describe, expect, test } from 'vitest';
import {
	activeBits,
	applyScale,
	decode16,
	decode32,
	encodeValue,
	parseRegister,
	toBinary16,
	toHex16
} from './codec';

describe('parsing et affichage des registres', () => {
	test('accepte le décimal et l’hexadécimal sur 16 bits', () => {
		expect(parseRegister('16844')).toBe(16844);
		expect(parseRegister('0x41CC')).toBe(16844);
		expect(parseRegister('65536')).toBeNull();
		expect(parseRegister('-1')).toBeNull();
		expect(parseRegister('abc')).toBeNull();
	});

	test('formate et décompose un mot', () => {
		expect(toHex16(37)).toBe('0x0025');
		expect(toBinary16(37)).toBe('0000000000100101');
		expect(activeBits(37)).toEqual([0, 2, 5]);
	});
});

describe('décodage', () => {
	test('décode le float 25,5 en ABCD', () => {
		const result = decode32(0x41cc, 0x0000, 'ABCD');
		expect(result.float32).toBe(25.5);
		expect(result.uint32).toBe(0x41cc0000);
	});

	test('gère les quatre ordres d’octets', () => {
		expect(decode32(0x41cc, 0x0000, 'ABCD').float32).toBe(25.5);
		expect(decode32(0x0000, 0x41cc, 'CDAB').float32).toBe(25.5);
		expect(decode32(0xcc41, 0x0000, 'BADC').float32).toBe(25.5);
		expect(decode32(0x0000, 0xcc41, 'DCBA').float32).toBe(25.5);
	});

	test('décode un entier 16 bits signé', () => {
		expect(decode16(0xff9c)).toEqual({ uint16: 65436, int16: -100 });
	});

	test('applique facteur et offset', () => {
		expect(applyScale(253, { factor: 0.1, offset: -2 })).toBeCloseTo(23.3);
	});
});

describe('encodage', () => {
	test('encode puis redécode un float pour chaque ordre', () => {
		for (const order of ['ABCD', 'BADC', 'CDAB', 'DCBA'] as const) {
			const encoded = encodeValue(25.5, 'float32', order, { factor: 1, offset: 0 });
			expect(decode32(encoded.registers[0], encoded.registers[1]!, order).float32).toBe(25.5);
		}
	});

	test('retire la mise à l’échelle avant encodage', () => {
		const encoded = encodeValue(25.3, 'uint16', 'ABCD', { factor: 0.1, offset: 0 });
		expect(encoded.registers).toEqual([253]);
	});

	test('rejette un facteur nul et les dépassements', () => {
		expect(() => encodeValue(1, 'uint16', 'ABCD', { factor: 0, offset: 0 })).toThrow();
		expect(() => encodeValue(70000, 'uint16', 'ABCD', { factor: 1, offset: 0 })).toThrow();
	});
});
