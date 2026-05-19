import type { Manifest, ManifestDevice } from './types';

const MANIFEST_URL = '/data/lorawan-codecs/manifest.json';

let cache: Manifest | null = null;
let inflight: Promise<Manifest> | null = null;

/**
 * Charge le manifest des codecs LoRaWAN, lazy et mis en cache mémoire.
 * Côté SSR (prerender), retourne un manifest vide pour éviter un fetch
 * pendant la génération statique.
 */
export async function loadManifest(): Promise<Manifest> {
	if (cache) return cache;
	if (inflight) return inflight;
	if (typeof fetch === 'undefined') {
		return emptyManifest();
	}
	inflight = fetch(MANIFEST_URL)
		.then((r) => {
			if (!r.ok) throw new Error(`Manifest indisponible (HTTP ${r.status})`);
			return r.json() as Promise<Manifest>;
		})
		.then((m) => {
			cache = m;
			inflight = null;
			return m;
		})
		.catch((e) => {
			inflight = null;
			throw e;
		});
	return inflight;
}

export function getDevice(manifest: Manifest, slug: string): ManifestDevice | undefined {
	return manifest.devices.find((d) => d.slug === slug);
}

function emptyManifest(): Manifest {
	return {
		generatedAt: '',
		source: { repo: '', commit: '', commitDate: '' },
		vendors: [],
		devices: [],
		warnings: []
	};
}
