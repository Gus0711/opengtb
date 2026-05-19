import type { PayloadFormat } from './types';

/**
 * Parse un payload hex en tableau de bytes (0-255).
 * Tolère : espaces, virgules, points-virgules, préfixe "0x", retours ligne.
 * Erreurs explicites (jamais NaN).
 */
export function parseHex(input: string): number[] {
	const cleaned = input
		.trim()
		.replace(/0x/gi, '')
		.replace(/[\s,;:]+/g, '');
	if (cleaned.length === 0) throw new Error('Payload hex vide');
	if (cleaned.length % 2 !== 0) {
		throw new Error('Longueur hex impaire : il manque un caractère');
	}
	if (!/^[0-9a-f]+$/i.test(cleaned)) {
		throw new Error('Caractère non hexadécimal détecté');
	}
	const bytes: number[] = [];
	for (let i = 0; i < cleaned.length; i += 2) {
		bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
	}
	return bytes;
}

/**
 * Parse un payload base64 en tableau de bytes.
 * Strict : on accepte les variantes URL-safe (-/_) et le padding optionnel.
 */
export function parseBase64(input: string): number[] {
	const cleaned = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
	if (cleaned.length === 0) throw new Error('Payload base64 vide');
	if (!/^[A-Za-z0-9+/]+=*$/.test(cleaned)) {
		throw new Error('Caractère non base64 détecté');
	}
	// Re-pad si nécessaire
	const padding = cleaned.length % 4 === 0 ? '' : '='.repeat(4 - (cleaned.length % 4));
	try {
		const binary = atob(cleaned + padding);
		const bytes = new Array<number>(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return bytes;
	} catch {
		throw new Error('Payload base64 invalide');
	}
}

export function parsePayload(input: string, format: PayloadFormat): number[] {
	return format === 'hex' ? parseHex(input) : parseBase64(input);
}

/** Formate un tableau de bytes en hex lisible (groupé par octet, espaces). */
export function bytesToHex(bytes: number[], opts: { upper?: boolean; separator?: string } = {}): string {
	const sep = opts.separator ?? ' ';
	const fn = opts.upper ? (s: string) => s.toUpperCase() : (s: string) => s;
	return bytes.map((b) => fn(b.toString(16).padStart(2, '0'))).join(sep);
}

/** Formate un tableau de bytes en base64 (standard, avec padding). */
export function bytesToBase64(bytes: number[]): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin);
}
