import type { Manifest, ManifestDevice } from './types';

const HAYSTACK_CACHE = new WeakMap<Manifest, string[]>();

function haystackOf(manifest: Manifest): string[] {
	let arr = HAYSTACK_CACHE.get(manifest);
	if (arr) return arr;
	arr = manifest.devices.map((d) => `${d.vendorName} ${d.name} ${d.slug}`.toLowerCase());
	HAYSTACK_CACHE.set(manifest, arr);
	return arr;
}

/**
 * Recherche maison sur vendor + name + slug.
 * Comportement : tokenisation par espaces, tous les tokens doivent matcher
 * (AND, case-insensitive). Tri : somme des positions des matchs (proche du
 * début = mieux), puis longueur du nom.
 *
 * Pas de match approximatif ni de scoring sophistiqué — sur 913 entrées
 * indexées et 2-3 tokens, ça reste très rapide et lisible.
 */
export function searchDevices(
	manifest: Manifest,
	query: string,
	limit = 30
): ManifestDevice[] {
	const tokens = query.trim().toLowerCase().split(/\s+/).filter((t) => t.length > 0);
	const devices = manifest.devices;
	if (tokens.length === 0) return devices.slice(0, limit);

	const hay = haystackOf(manifest);
	const scored: { idx: number; score: number }[] = [];
	for (let i = 0; i < devices.length; i++) {
		const h = hay[i];
		let allMatch = true;
		let score = 0;
		for (const t of tokens) {
			const pos = h.indexOf(t);
			if (pos < 0) {
				allMatch = false;
				break;
			}
			score += pos;
		}
		if (allMatch) scored.push({ idx: i, score });
	}
	scored.sort((a, b) => a.score - b.score || devices[a.idx].name.length - devices[b.idx].name.length);
	return scored.slice(0, limit).map((s) => devices[s.idx]);
}
