import { describe, expect, test } from 'vitest';
import { bytesToBase64, bytesToHex, parseBase64, parseHex } from './formats';

describe('parseHex', () => {
	test('parses simple hex', () => {
		expect(parseHex('0a1f7d')).toEqual([0x0a, 0x1f, 0x7d]);
	});
	test('tolerates spaces', () => {
		expect(parseHex('0a 1f 7d')).toEqual([0x0a, 0x1f, 0x7d]);
	});
	test('tolerates 0x prefix and mixed separators', () => {
		expect(parseHex('0x0a, 0x1f; 7d')).toEqual([0x0a, 0x1f, 0x7d]);
	});
	test('uppercase and lowercase mix', () => {
		expect(parseHex('0A1f7D')).toEqual([0x0a, 0x1f, 0x7d]);
	});
	test('throws on odd length', () => {
		expect(() => parseHex('abc')).toThrow(/impaire/);
	});
	test('throws on non-hex chars', () => {
		expect(() => parseHex('zz')).toThrow(/non hexadécimal/);
	});
	test('throws on empty', () => {
		expect(() => parseHex('  ')).toThrow(/vide/);
	});
});

describe('parseBase64', () => {
	test('standard base64', () => {
		expect(parseBase64('Ch99')).toEqual([0x0a, 0x1f, 0x7d]);
	});
	test('url-safe variant', () => {
		// "?>?>" → 3f 3e 3f 3e → base64 standard = "Pz4_Pg" (url-safe) or "Pz4/Pg" (std)
		const bytes = [0x3f, 0x3e, 0x3f, 0x3e];
		const std = bytesToBase64(bytes); // "Pz4/Pg=="
		const urlSafe = std.replace(/\+/g, '-').replace(/\//g, '_');
		expect(parseBase64(urlSafe)).toEqual(bytes);
	});
	test('accepts missing padding', () => {
		// "Ch99" est déjà bien padded mais on teste sans le =
		expect(parseBase64('Ch99')).toEqual([0x0a, 0x1f, 0x7d]);
		// "Cg" → 0x0a (1 byte) — sans padding
		expect(parseBase64('Cg')).toEqual([0x0a]);
	});
	test('throws on invalid char', () => {
		expect(() => parseBase64('not valid !')).toThrow(/non base64/);
	});
	test('throws on empty', () => {
		expect(() => parseBase64('   ')).toThrow(/vide/);
	});
});

describe('round-trip', () => {
	test('hex → bytes → hex', () => {
		const bytes = parseHex('deadbeef');
		expect(bytesToHex(bytes, { separator: '' })).toBe('deadbeef');
	});
	test('bytes → base64 → bytes', () => {
		const bytes = [0xde, 0xad, 0xbe, 0xef];
		expect(parseBase64(bytesToBase64(bytes))).toEqual(bytes);
	});
});
