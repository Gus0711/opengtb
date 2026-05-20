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
					hasEncoder?: boolean;
					downlinkExamples?: Array<{
						description?: string;
						input: { data: unknown; fPort?: number };
						output?: { bytes: number[]; fPort?: number };
					}>;
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

	test.skipIf(!manifest)('a meaningful share of devices expose an encoder', () => {
		const withEncoder = manifest!.devices.filter((d) => d.hasEncoder);
		// Sanity check : on attend ~400+ encoders sur le catalogue complet.
		// On reste très conservateur (>100) pour éviter d'être trop fragile face
		// à l'évolution du repo upstream.
		expect(withEncoder.length).toBeGreaterThan(100);
	});

	test.skipIf(!manifest)('downlinkExamples shape is well-formed when present', () => {
		const withExamples = manifest!.devices.filter((d) => d.downlinkExamples?.length);
		expect(withExamples.length).toBeGreaterThan(100);
		for (const d of withExamples.slice(0, 20)) {
			for (const ex of d.downlinkExamples!) {
				expect(ex.input).toBeDefined();
				expect(ex.input.data).toBeDefined();
			}
		}
	});
});

describe('downlinkSchema — golden Milesight UC300', () => {
	const manifestPath = resolve(CODECS_DIR, 'manifest.json');
	const manifest = existsSync(manifestPath)
		? (JSON.parse(readFileSync(manifestPath, 'utf8')) as {
				devices: Array<{
					slug: string;
					downlinkSchema?: {
						source: string;
						fields: Array<{ name: string; type: string; enum?: unknown[]; fields?: unknown[] }>;
					};
				}>;
			})
		: null;

	const uc300 = manifest?.devices.find((d) => d.slug === 'milesight-iot-uc300');

	test.skipIf(!uc300)('exposes the 13 documented commands', () => {
		expect(uc300!.downlinkSchema?.source).toBe('milesight-if-in-payload');
		const names = uc300!.downlinkSchema!.fields.map((f) => f.name).sort();
		expect(names).toEqual([
			'collection_interval',
			'gpio_output_1',
			'gpio_output_1_control',
			'gpio_output_2',
			'gpio_output_2_control',
			'jitter_config',
			'reboot',
			'rejoin',
			'report_interval',
			'report_status',
			'sync_time',
			'time_zone',
			'timestamp'
		]);
	});

	test.skipIf(!uc300)('infers gpio_output_1 as enum off/on', () => {
		const f = uc300!.downlinkSchema!.fields.find((x) => x.name === 'gpio_output_1')!;
		expect(f.type).toBe('string');
		expect(f.enum).toEqual(['off', 'on']);
	});

	test.skipIf(!uc300)('infers gpio_output_1_control as object with duration + status', () => {
		const f = uc300!.downlinkSchema!.fields.find((x) => x.name === 'gpio_output_1_control')!;
		expect(f.type).toBe('object');
		const subs = (f.fields as Array<{ name: string }>).map((s) => s.name).sort();
		expect(subs).toEqual(['duration', 'status']);
	});

	test.skipIf(!uc300)('extracts the full time_zone enum from the UTC map', () => {
		const f = uc300!.downlinkSchema!.fields.find((x) => x.name === 'time_zone')!;
		expect(f.type).toBe('string');
		expect((f.enum as string[]).length).toBeGreaterThan(20);
		expect(f.enum).toContain('UTC');
		expect(f.enum).toContain('UTC+8');
	});

	test.skipIf(!manifest)('around 90+ devices have a schema (Milesight + switch-on-cmd)', () => {
		const withSchema = manifest!.devices.filter((d) => d.downlinkSchema);
		expect(withSchema.length).toBeGreaterThan(80);
	});
});

describe('overrides — MClimate Vicki', () => {
	const manifestPath = resolve(CODECS_DIR, 'manifest.json');
	const manifest = existsSync(manifestPath)
		? (JSON.parse(readFileSync(manifestPath, 'utf8')) as {
				devices: Array<{
					slug: string;
					hasEncoder?: boolean;
					downlinkExamples?: Array<{
						description?: string;
						input: { data: unknown; fPort?: number };
						output?: { bytes: number[]; fPort?: number };
					}>;
					downlinkSchema?: { source: string; fields: Array<{ name: string; type: string }> };
				}>;
			})
		: null;

	const vicki = manifest?.devices.find((d) => d.slug === 'mclimate-vicki');

	test.skipIf(!vicki)('Vicki gets hasEncoder=true from local override', () => {
		expect(vicki!.hasEncoder).toBe(true);
	});

	test.skipIf(!vicki)('Vicki ships the full command surface (~50 commands)', () => {
		expect(vicki!.downlinkSchema?.source).toBe('for-key-switch');
		expect(vicki!.downlinkSchema!.fields.length).toBeGreaterThan(40);
		const names = vicki!.downlinkSchema!.fields.map(
			(f: { name: string }) => f.name
		);
		// Quelques commandes clés présentes
		expect(names).toContain('recalibrateMotor');
		expect(names).toContain('setTargetTemperature');
		expect(names).toContain('setChildLock');
		expect(names).toContain('setOpenWindow');
		expect(names).toContain('setValveOpenness');
		expect(names).toContain('sendCustomHexCommand');
	});

	test.skipIf(!vicki)('Vicki no-param triggers are flagged correctly', () => {
		const recalibrate = vicki!.downlinkSchema!.fields.find(
			(f: { name: string }) => f.name === 'recalibrateMotor'
		)! as { noParam?: boolean };
		expect(recalibrate.noParam).toBe(true);
		const forceClose = vicki!.downlinkSchema!.fields.find(
			(f: { name: string }) => f.name === 'forceClose'
		)! as { noParam?: boolean };
		expect(forceClose.noParam).toBe(true);
	});

	test.skipIf(!vicki)('Vicki setOpenWindow detected as object with 4 sub-fields', () => {
		const sow = vicki!.downlinkSchema!.fields.find(
			(f: { name: string }) => f.name === 'setOpenWindow'
		)! as { type: string; fields?: Array<{ name: string; type: string }> };
		expect(sow.type).toBe('object');
		const subs = (sow.fields ?? []).map((s) => s.name).sort();
		expect(subs).toEqual(['closeTime', 'delta', 'enabled', 'motorPosition']);
	});

	test.skipIf(!vicki)('Vicki examples encode correctly via the override JS', () => {
		const src = readArtifact('ttn-v3', 'mclimate-vicki');
		const fn = new Function(
			`${src}\n;return (typeof encodeDownlink === 'function') ? encodeDownlink : null;`
		)() as (input: { data: unknown; fPort: number }) => { bytes: number[] };
		expect(typeof fn).toBe('function');
		for (const ex of vicki!.downlinkExamples!) {
			if (!ex.output) continue;
			const out = fn({ data: ex.input.data, fPort: ex.input.fPort ?? 1 });
			expect(out.bytes).toEqual(ex.output.bytes);
		}
	});
});

describe('codec artifacts — encoder execution', () => {
	const manifestPath = resolve(CODECS_DIR, 'manifest.json');
	const manifest = existsSync(manifestPath)
		? (JSON.parse(readFileSync(manifestPath, 'utf8')) as {
				devices: Array<{
					slug: string;
					hasEncoder?: boolean;
					downlinkExamples?: Array<{
						description?: string;
						input: { data: unknown; fPort?: number };
						output?: { bytes: number[]; fPort?: number };
					}>;
				}>;
			})
		: null;

	// On choisit aquascope-aqm comme golden encoder test : exemple bien défini
	// (« Turn Valve on » → [7, 255], fPort 1) et codec court.
	const SLUG_ENC = 'aquascope-aqm';
	const aqm = manifest?.devices.find((d) => d.slug === SLUG_ENC);

	const ttnSrc =
		aqm && existsSync(resolve(CODECS_DIR, 'ttn-v3', `${SLUG_ENC}.js`))
			? readArtifact('ttn-v3', SLUG_ENC)
			: null;
	const csSrc =
		aqm && existsSync(resolve(CODECS_DIR, 'chirpstack-v4', `${SLUG_ENC}.js`))
			? readArtifact('chirpstack-v4', SLUG_ENC)
			: null;

	function instantiateEncoder(
		source: string
	): (input: { data: unknown; fPort: number }) => unknown {
		const fn = new Function(
			`${source}\n;return (typeof encodeDownlink === 'function') ? encodeDownlink : null;`
		)();
		if (typeof fn !== 'function') {
			throw new Error('encodeDownlink introuvable dans le codec');
		}
		return fn as (input: { data: unknown; fPort: number }) => unknown;
	}

	test.skipIf(!ttnSrc)('TTN file exposes encodeDownlink and matches YAML example', () => {
		const fn = instantiateEncoder(ttnSrc!);
		const ex = aqm!.downlinkExamples![0];
		const out = fn({ data: ex.input.data, fPort: ex.input.fPort ?? 1 }) as {
			bytes: number[];
			fPort: number;
		};
		expect(out.bytes).toEqual(ex.output!.bytes);
	});

	test.skipIf(!csSrc)('ChirpStack file exposes encodeDownlink (top-level) and matches YAML example', () => {
		const fn = instantiateEncoder(csSrc!);
		const ex = aqm!.downlinkExamples![0];
		const out = fn({ data: ex.input.data, fPort: ex.input.fPort ?? 1 }) as {
			bytes: number[];
			fPort: number;
			warnings: string[];
			errors: string[];
		};
		expect(out.bytes).toEqual(ex.output!.bytes);
		expect(Array.isArray(out.warnings)).toBe(true);
		expect(Array.isArray(out.errors)).toBe(true);
	});

	test.skipIf(!ttnSrc || !csSrc)('TTN and ChirpStack agree on encoded bytes', () => {
		const ttnFn = instantiateEncoder(ttnSrc!);
		const csFn = instantiateEncoder(csSrc!);
		const ex = aqm!.downlinkExamples![0];
		const ttnOut = ttnFn({ data: ex.input.data, fPort: ex.input.fPort ?? 1 }) as { bytes: number[] };
		const csOut = csFn({ data: ex.input.data, fPort: ex.input.fPort ?? 1 }) as { bytes: number[] };
		expect(csOut.bytes).toEqual(ttnOut.bytes);
	});
});
