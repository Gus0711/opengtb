/**
 * Tests d'intégration sur les artefacts générés par scripts/decode/fetch-codecs.ts.
 * Lit les fichiers depuis static/data/lorawan-codecs/ et vérifie :
 *   - structure du header (TTN v3 et ChirpStack v4)
 *   - structure de wrapping ChirpStack (IIFE + capture + decodeUplink top-level)
 *   - sanitisation : pas de module.exports / exports.X unguarded
 *   - équivalence fonctionnelle TTN ↔ ChirpStack sur un payload exemple
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const CODECS_DIR = resolve(process.cwd(), 'static/data/lorawan-codecs');

function readArtifact(target: 'ttn-v3' | 'chirpstack-v4', slug: string): string {
	return readFileSync(resolve(CODECS_DIR, target, `${slug}.js`), 'utf8');
}

/**
 * Compile et exécute un codec dans un sandbox `new Function()`. Retourne la
 * fonction `decodeUplink` exposée par le source. Émule le comportement de
 * TheThingsStack / ChirpStack (qui s'attendent à un `decodeUplink` top-level).
 */
function instantiate(source: string): (input: { bytes: number[]; fPort: number }) => unknown {
	const fn = new Function(
		`${source}\n;return (typeof decodeUplink === 'function') ? decodeUplink : null;`
	)();
	if (typeof fn !== 'function') {
		throw new Error('decodeUplink introuvable dans le codec');
	}
	return fn as (input: { bytes: number[]; fPort: number }) => unknown;
}

// On utilise un device connu présent dans le manifest. mclimate-vicki est court,
// stable, et l'un des golden tests cités dans SPEC.md.
const SLUG = 'mclimate-vicki';

// Payload exemple extrait du manifest TTN pour ce device (uplink périodique fPort 1).
const SAMPLE = { bytes: [1, 29, 90, 120, 250, 44, 1, 240, 128], fPort: 1 };

describe('codec artifacts — TTN v3', () => {
	const src = existsSync(resolve(CODECS_DIR, 'ttn-v3', `${SLUG}.js`))
		? readArtifact('ttn-v3', SLUG)
		: null;

	test.skipIf(!src)('contains French header with vendor + device + source', () => {
		expect(src).toMatch(/Codec LoRaWAN — TheThingsStack \(TTN v3\)/);
		expect(src).toMatch(/Vendor\s+:\s+MClimate/);
		expect(src).toMatch(/Device\s+:\s+Vicki/);
		expect(src).toMatch(/Source\s+:\s+TheThingsNetwork\/lorawan-devices/);
		expect(src).toMatch(/Apache-2\.0/);
	});

	test.skipIf(!src)('contains TTN-specific install instructions', () => {
		expect(src).toMatch(/Console TTN/);
		expect(src).toMatch(/Payload formatters/);
	});

	test.skipIf(!src)('decodeUplink is callable and returns TR013 shape', () => {
		const fn = instantiate(src!);
		const out = fn(SAMPLE) as Record<string, unknown>;
		expect(out).toHaveProperty('data');
	});
});

describe('codec artifacts — ChirpStack v4', () => {
	const src = existsSync(resolve(CODECS_DIR, 'chirpstack-v4', `${SLUG}.js`))
		? readArtifact('chirpstack-v4', SLUG)
		: null;

	test.skipIf(!src)('contains French header with ChirpStack-specific install path', () => {
		expect(src).toMatch(/Codec LoRaWAN — ChirpStack v4/);
		expect(src).toMatch(/Device Profile/);
		expect(src).toMatch(/JavaScript functions/);
		expect(src).toMatch(/TR013/);
	});

	test.skipIf(!src)('wraps TTN source in an IIFE and exposes top-level decodeUplink', () => {
		expect(src).toMatch(/var __opengtb_ttn_decode;/);
		expect(src).toMatch(/\(function \(\) \{/);
		// La fonction top-level decodeUplink doit apparaître APRÈS la fin de l'IIFE.
		const iifeEnd = src!.indexOf('})();');
		const topLevelDecode = src!.indexOf('function decodeUplink(input) {', iifeEnd);
		expect(iifeEnd).toBeGreaterThan(0);
		expect(topLevelDecode).toBeGreaterThan(iifeEnd);
	});

	test.skipIf(!src)('strips unguarded module.exports / exports.X lines', () => {
		// Ne doit plus apparaître en début de ligne (la regex de sanitize n'enlève
		// que les variantes one-liner sans garde).
		expect(src).not.toMatch(/^\s*module\.exports\s*=/m);
		expect(src).not.toMatch(/^\s*exports\.\w+\s*=/m);
	});

	test.skipIf(!src)('decodeUplink returns { data, warnings, errors } shape', () => {
		const fn = instantiate(src!);
		const out = fn(SAMPLE) as Record<string, unknown>;
		expect(out).toHaveProperty('data');
		expect(out).toHaveProperty('warnings');
		expect(out).toHaveProperty('errors');
		expect(Array.isArray(out.warnings)).toBe(true);
		expect(Array.isArray(out.errors)).toBe(true);
	});

	test.skipIf(!src)('produces the same decoded data as the TTN v3 file', () => {
		const ttnSrc = readArtifact('ttn-v3', SLUG);
		const ttnFn = instantiate(ttnSrc);
		const csFn = instantiate(src!);
		const ttnOut = ttnFn(SAMPLE) as { data: unknown };
		const csOut = csFn(SAMPLE) as { data: unknown };
		expect(csOut.data).toEqual(ttnOut.data);
	});
});

describe('manifest', () => {
	const manifestPath = resolve(CODECS_DIR, 'manifest.json');
	const manifest = existsSync(manifestPath)
		? (JSON.parse(readFileSync(manifestPath, 'utf8')) as {
				devices: Array<{
					slug: string;
					codecFile: string;
					downloads?: { ttnV3: string; chirpstackV4: string };
				}>;
			})
		: null;

	test.skipIf(!manifest)('every non-internal device has a downloads entry', () => {
		const offenders = manifest!.devices
			.filter((d) => !d.codecFile.startsWith('internal:'))
			.filter((d) => !d.downloads?.ttnV3 || !d.downloads?.chirpstackV4);
		expect(offenders).toEqual([]);
	});

	test.skipIf(!manifest)('Cayenne LPP internal entry has no downloads', () => {
		const cayenne = manifest!.devices.find((d) => d.slug === 'generic-cayenne-lpp');
		expect(cayenne).toBeDefined();
		expect(cayenne!.downloads).toBeUndefined();
	});
});
