import type { Category, Unit } from './types';
import { isAffine } from './types';

/** Convertit `value` exprimée dans `from` vers `to` au sein d'une catégorie. */
export function convert(value: number, from: Unit, to: Unit): number {
	if (!Number.isFinite(value)) return NaN;
	const ref = isAffine(from) ? from.toReference(value) : value * from.factor;
	return isAffine(to) ? to.fromReference(ref) : ref / to.factor;
}

export function convertById(
	value: number,
	fromId: string,
	toId: string,
	category: Category
): number {
	const from = category.units.find((u) => u.id === fromId);
	const to = category.units.find((u) => u.id === toId);
	if (!from || !to) return NaN;
	return convert(value, from, to);
}

/**
 * Affichage intelligent : entiers gardés, max 6 chiffres significatifs,
 * notation scientifique uniquement hors de [1e-4, 1e7[.
 *   - `null`/NaN → ''
 *   - exact int dans la plage → écrit tel quel
 *   - sinon `toPrecision(6)` puis nettoyage des zéros traînants
 */
export function formatResult(v: number | null | undefined): string {
	if (v === null || v === undefined || Number.isNaN(v)) return '';
	if (v === 0) return '0';

	const abs = Math.abs(v);

	if (abs < 1e-4 || abs >= 1e7) {
		return trimExponent(v.toExponential(5));
	}

	if (Number.isInteger(v) && abs < 1e7) {
		return String(v);
	}

	const s = v.toPrecision(6);
	if (s.includes('e') || s.includes('E')) return trimExponent(s);
	return trimZeros(s);
}

function trimZeros(s: string): string {
	if (!s.includes('.')) return s;
	return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function trimExponent(s: string): string {
	const [mantStr, expStr] = s.split(/e/i);
	const mant = trimZeros(mantStr);
	const exp = parseInt(expStr, 10);
	return `${mant}e${exp >= 0 ? '+' : ''}${exp}`;
}
