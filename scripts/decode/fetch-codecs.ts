// scripts/decode/fetch-codecs.ts
//
// Récupère les codecs uplink LoRaWAN du repo public TheThingsNetwork/lorawan-devices,
// les normalise et écrit le manifest + un fichier par codec sous
// static/data/lorawan-codecs/.
//
// V1 — pas de legacy TTN v2. Pour chaque device retenu, génère DEUX artefacts
// prêts à coller :
//   - static/data/lorawan-codecs/ttn-v3/<slug>.js       (TheThingsStack)
//   - static/data/lorawan-codecs/chirpstack-v4/<slug>.js (ChirpStack v4, wrap IIFE)
//
// Pré-requis : repo cloné dans .cache/lorawan-devices/ (clone shallow recommandé).
//   git clone --depth=1 https://github.com/TheThingsNetwork/lorawan-devices .cache/lorawan-devices
//
// Lancement :
//   npm run fetch-codecs                     # vendors prioritaires (PRIORITY_VENDORS)
//   npm run fetch-codecs -- --all            # tous les vendors
//   npm run fetch-codecs -- --vendor mclimate --vendor milesight-iot
//
// Idempotent : on peut relancer, on régénère tout.
// Le manifest et les fichiers codecs générés sont commités dans git
// (cf. SPEC.md, stratégie "Script manuel + output committé").

import { readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

// ─────────────────────────────────────────────────────────────────────────────
// Chemins et constantes

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const CACHE_DIR = resolve(REPO_ROOT, '.cache/lorawan-devices');
const VENDOR_DIR = resolve(CACHE_DIR, 'vendor');
const OUT_DIR = resolve(REPO_ROOT, 'static/data/lorawan-codecs');
const OUT_TTN_DIR = resolve(OUT_DIR, 'ttn-v3');
const OUT_CS_DIR = resolve(OUT_DIR, 'chirpstack-v4');
const OUT_LEGACY_DIR = resolve(OUT_DIR, 'codecs'); // ancien layout — purgé au début

const PRIORITY_VENDORS = ['milesight-iot', 'mclimate', 'enless-wireless'];

const OPENGTB_URL = 'https://opengtb.fr/outils/decode';
const UPSTREAM_REPO = 'https://github.com/TheThingsNetwork/lorawan-devices';

// ─────────────────────────────────────────────────────────────────────────────
// Types

interface VendorEntry {
	id: string;
	name: string;
	vendorID?: number;
}

interface ManifestExample {
	description?: string;
	fPort: number;
	bytes: number[];
}

interface ManifestDevice {
	slug: string;
	vendorId: string;
	vendorName: string;
	deviceId: string;
	name: string;
	description?: string;
	sensors?: string[];
	regions: string[];
	fPorts: number[];
	/** Chemin du codec utilisé par le runtime web. "ttn-v3/<slug>.js" ou "internal:<key>". */
	codecFile: string;
	/** Fichiers téléchargeables prêts à coller dans le NS cible. Absent pour décodeur interne. */
	downloads?: {
		ttnV3: string;
		chirpstackV4: string;
	};
	productURL?: string;
	examples: ManifestExample[];
}

interface ManifestWarning {
	vendor: string;
	device?: string;
	reason: string;
}

interface Manifest {
	generatedAt: string;
	source: {
		repo: typeof UPSTREAM_REPO;
		commit: string;
		commitDate: string;
	};
	vendors: { id: string; name: string; deviceCount: number }[];
	devices: ManifestDevice[];
	warnings: ManifestWarning[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI

function parseArgs(argv: string[]): { vendors: string[]; all: boolean } {
	const out = { vendors: [] as string[], all: false };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--all') out.all = true;
		else if (a === '--vendor') {
			const v = argv[++i];
			if (v) out.vendors.push(v);
		}
	}
	return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers

async function readYaml<T = unknown>(path: string): Promise<T> {
	const raw = await readFile(path, 'utf8');
	return parseYaml(raw) as T;
}

function detectCodecFormat(source: string): 'ttn-v3' | 'ttn-v2' | null {
	// Heuristiques sur le source TTN. Couvre les formes :
	//   function decodeUplink(input) { ... }
	//   const|let|var decodeUplink = function(input) { ... }
	//   const|let|var decodeUplink = (input) => { ... }
	//   export function decodeUplink(input) { ... }
	// Idem pour Decoder (legacy v2).
	const v3 = /(?:\b(?:function|export\s+function)\s+decodeUplink\b)|(?:\b(?:const|let|var)\s+decodeUplink\s*=)/;
	if (v3.test(source)) return 'ttn-v3';
	const v2 = /(?:\b(?:function|export\s+function)\s+Decoder\b)|(?:\b(?:const|let|var)\s+Decoder\s*=)/;
	if (v2.test(source)) return 'ttn-v2';
	return null;
}

function getRepoCommit(): { sha: string; date: string } {
	try {
		const sha = execSync('git rev-parse HEAD', { cwd: CACHE_DIR, encoding: 'utf8' }).trim();
		const date = execSync('git log -1 --format=%cI', { cwd: CACHE_DIR, encoding: 'utf8' }).trim();
		return { sha, date };
	} catch {
		return { sha: 'unknown', date: 'unknown' };
	}
}

function normalizeExamples(rawExamples: unknown): ManifestExample[] {
	if (!Array.isArray(rawExamples)) return [];
	const out: ManifestExample[] = [];
	for (const ex of rawExamples) {
		if (!ex || typeof ex !== 'object') continue;
		const exObj = ex as Record<string, unknown>;
		const input = exObj.input as Record<string, unknown> | undefined;
		if (!input || typeof input.fPort !== 'number' || !Array.isArray(input.bytes)) continue;
		out.push({
			description: typeof exObj.description === 'string' ? exObj.description : undefined,
			fPort: input.fPort,
			bytes: (input.bytes as unknown[]).filter((b): b is number => typeof b === 'number')
		});
	}
	return out;
}

function uniq<T>(arr: T[]): T[] {
	return Array.from(new Set(arr));
}

function formatFPortsHint(fPorts: number[]): string {
	if (fPorts.length === 0) return 'non spécifié dans le profil';
	return fPorts.join(', ');
}

interface HeaderOpts {
	vendorName: string;
	deviceName: string;
	fPortsHint: string;
	sourcePath: string;
	commit: string;
}

const RULE = '─────────────────────────────────────────────────────────────────────';

function buildTtnV3Header(o: HeaderOpts): string {
	const url = `${UPSTREAM_REPO}/blob/${o.commit}/${o.sourcePath}`;
	return [
		`// ${RULE}`,
		`// Codec LoRaWAN — TheThingsStack (TTN v3)`,
		`// ${RULE}`,
		`// Vendor       : ${o.vendorName}`,
		`// Device       : ${o.deviceName}`,
		`// fPort(s)     : ${o.fPortsHint}`,
		`// Source       : TheThingsNetwork/lorawan-devices @ ${o.commit.slice(0, 12)}`,
		`//                ${url}`,
		`// Préparé par  : OpenGTB — ${OPENGTB_URL}`,
		`// Licence      : Apache-2.0 (per upstream repo)`,
		`//`,
		`// Installation :`,
		`//   1. Console TTN → Application → Payload formatters`,
		`//   2. Type : « Custom JavaScript formatter »`,
		`//   3. Onglet « Uplink » → coller ce fichier intégralement`,
		`// ${RULE}`,
		'',
		''
	].join('\n');
}

function buildChirpstackV4Header(o: HeaderOpts): string {
	const url = `${UPSTREAM_REPO}/blob/${o.commit}/${o.sourcePath}`;
	return [
		`// ${RULE}`,
		`// Codec LoRaWAN — ChirpStack v4`,
		`// ${RULE}`,
		`// Vendor       : ${o.vendorName}`,
		`// Device       : ${o.deviceName}`,
		`// fPort(s)     : ${o.fPortsHint}`,
		`// Source       : TheThingsNetwork/lorawan-devices @ ${o.commit.slice(0, 12)}`,
		`//                ${url}`,
		`// Adapté par   : OpenGTB — ${OPENGTB_URL}`,
		`// Licence      : Apache-2.0 (per upstream repo)`,
		`//`,
		`// Installation :`,
		`//   1. ChirpStack → Device Profiles → <votre profil>`,
		`//   2. Onglet « Codec » → « JavaScript functions »`,
		`//   3. Coller ce fichier intégralement dans « Codec functions »`,
		`//`,
		`// Note : le codec TTN d'origine est conservé intact dans un IIFE ;`,
		`// la fonction decodeUplink exposée à ChirpStack le réinvoque et normalise`,
		`// la sortie au format { data, warnings, errors } attendu par v4 (TR013).`,
		`// ${RULE}`,
		'',
		''
	].join('\n');
}

/**
 * Retire les `module.exports = X;` / `exports.X = ...;` non gardés (une ligne,
 * sans `if (typeof module !== 'undefined') { ... }` autour) — ces lignes
 * lèveraient dans le runtime goja de ChirpStack. Les blocs gardés sont
 * laissés intacts : `typeof module === 'undefined'` reste vrai et le bloc
 * ne s'exécute jamais.
 */
function sanitizeForChirpstack(src: string): string {
	return src
		.replace(/^[ \t]*module\.exports\s*=[^\n]*\n/gm, '')
		.replace(/^[ \t]*exports\.\w+\s*=[^\n]*\n/gm, '');
}

/**
 * Enrobe le source TTN dans un IIFE qui capture `decodeUplink` (top-level
 * ou via `codec.decodeUplink`) puis expose une fonction `decodeUplink`
 * top-level conforme au format ChirpStack v4 (TR013).
 */
function wrapForChirpstack(sanitizedSrc: string): string {
	return [
		'var __opengtb_ttn_decode;',
		'(function () {',
		'\t// ─── Source TTN v3 (intact) ─────────────────────────────────────────',
		sanitizedSrc.trimEnd(),
		'\t// ─── /Source TTN v3 ─────────────────────────────────────────────────',
		'',
		"\t__opengtb_ttn_decode = (typeof decodeUplink === 'function')",
		'\t\t? decodeUplink',
		"\t\t: (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function')",
		'\t\t\t? codec.decodeUplink',
		'\t\t\t: null;',
		'})();',
		'',
		'function decodeUplink(input) {',
		"\tif (typeof __opengtb_ttn_decode !== 'function') {",
		"\t\treturn { data: {}, warnings: [], errors: ['decodeUplink TTN introuvable dans le codec source'] };",
		'\t}',
		'\tvar r;',
		'\ttry {',
		'\t\tr = __opengtb_ttn_decode(input) || {};',
		'\t} catch (e) {',
		'\t\treturn { data: {}, warnings: [], errors: [(e && e.message) ? e.message : String(e)] };',
		'\t}',
		'\tvar data = (r && r.data !== undefined) ? r.data : r;',
		'\treturn {',
		'\t\tdata: data,',
		'\t\twarnings: Array.isArray(r.warnings) ? r.warnings : [],',
		'\t\terrors: Array.isArray(r.errors) ? r.errors : []',
		'\t};',
		'}',
		''
	].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecture du repo TTN

async function loadTopVendorIndex(): Promise<Map<string, VendorEntry>> {
	const index = await readYaml<{ vendors: VendorEntry[] }>(resolve(VENDOR_DIR, 'index.yaml'));
	const map = new Map<string, VendorEntry>();
	for (const v of index.vendors) map.set(v.id, v);
	return map;
}

async function listVendorDevices(vendorId: string): Promise<string[]> {
	const idxPath = resolve(VENDOR_DIR, vendorId, 'index.yaml');
	if (!existsSync(idxPath)) return [];
	const idx = await readYaml<{ endDevices?: string[] }>(idxPath);
	return idx.endDevices ?? [];
}

interface DeviceYaml {
	name?: string;
	description?: string;
	sensors?: string[];
	productURL?: string;
	firmwareVersions?: {
		version?: string;
		profiles?: Record<string, { codec?: string; id?: string }>;
	}[];
}

interface CodecYaml {
	uplinkDecoder?: {
		fileName?: string;
		examples?: unknown[];
	};
}

async function processDevice(
	vendor: VendorEntry,
	deviceId: string,
	commitSha: string,
	warnings: ManifestWarning[]
): Promise<ManifestDevice | null> {
	const vendorDir = resolve(VENDOR_DIR, vendor.id);
	const deviceYamlPath = resolve(vendorDir, `${deviceId}.yaml`);
	if (!existsSync(deviceYamlPath)) {
		warnings.push({ vendor: vendor.id, device: deviceId, reason: 'device yaml missing' });
		return null;
	}

	let device: DeviceYaml;
	try {
		device = await readYaml<DeviceYaml>(deviceYamlPath);
	} catch (e) {
		warnings.push({
			vendor: vendor.id,
			device: deviceId,
			reason: `device yaml parse error: ${(e as Error).message}`
		});
		return null;
	}

	// Trouver le codec ref via firmwareVersions[].profiles{region}.codec
	const regions = new Set<string>();
	let codecRef: string | undefined;
	for (const fw of device.firmwareVersions ?? []) {
		for (const [region, profile] of Object.entries(fw.profiles ?? {})) {
			regions.add(region);
			if (profile.codec && !codecRef) codecRef = profile.codec;
		}
	}
	if (!codecRef) {
		warnings.push({ vendor: vendor.id, device: deviceId, reason: 'no codec referenced in profiles' });
		return null;
	}

	const codecYamlPath = resolve(vendorDir, `${codecRef}.yaml`);
	if (!existsSync(codecYamlPath)) {
		warnings.push({
			vendor: vendor.id,
			device: deviceId,
			reason: `codec yaml missing: ${codecRef}.yaml`
		});
		return null;
	}

	let codecMeta: CodecYaml;
	try {
		codecMeta = await readYaml<CodecYaml>(codecYamlPath);
	} catch (e) {
		warnings.push({
			vendor: vendor.id,
			device: deviceId,
			reason: `codec yaml parse error: ${(e as Error).message}`
		});
		return null;
	}

	const upDec = codecMeta.uplinkDecoder;
	if (!upDec?.fileName) {
		warnings.push({ vendor: vendor.id, device: deviceId, reason: 'no uplinkDecoder.fileName' });
		return null;
	}

	const jsPath = resolve(vendorDir, upDec.fileName);
	if (!existsSync(jsPath)) {
		warnings.push({
			vendor: vendor.id,
			device: deviceId,
			reason: `codec js missing: ${upDec.fileName}`
		});
		return null;
	}

	const jsSource = await readFile(jsPath, 'utf8');
	const format = detectCodecFormat(jsSource);
	if (!format) {
		warnings.push({
			vendor: vendor.id,
			device: deviceId,
			reason: 'no decodeUplink or Decoder function detected in codec js'
		});
		return null;
	}
	if (format === 'ttn-v2') {
		warnings.push({
			vendor: vendor.id,
			device: deviceId,
			reason: 'legacy ttn-v2 codec (Decoder) — excluded per V1 scope (no legacy)'
		});
		return null;
	}

	// ttn-v3 : on génère les deux artefacts téléchargeables.
	const slug = `${vendor.id}-${deviceId}`;
	const sourcePath = `vendor/${vendor.id}/${upDec.fileName}`;
	const examples = normalizeExamples(upDec.examples);
	const fPorts = uniq(examples.map((e) => e.fPort)).sort((a, b) => a - b);
	const fPortsHint = formatFPortsHint(fPorts);
	const headerOpts: HeaderOpts = {
		vendorName: vendor.name,
		deviceName: device.name ?? deviceId,
		fPortsHint,
		sourcePath,
		commit: commitSha
	};

	const ttnContent = buildTtnV3Header(headerOpts) + jsSource;
	const csContent =
		buildChirpstackV4Header(headerOpts) + wrapForChirpstack(sanitizeForChirpstack(jsSource));

	const ttnFile = `ttn-v3/${slug}.js`;
	const csFile = `chirpstack-v4/${slug}.js`;
	await writeFile(resolve(OUT_DIR, ttnFile), ttnContent, 'utf8');
	await writeFile(resolve(OUT_DIR, csFile), csContent, 'utf8');

	return {
		slug,
		vendorId: vendor.id,
		vendorName: vendor.name,
		deviceId,
		name: device.name ?? deviceId,
		description: device.description,
		sensors: device.sensors,
		regions: [...regions].sort(),
		fPorts,
		codecFile: ttnFile,
		downloads: {
			ttnV3: ttnFile,
			chirpstackV4: csFile
		},
		productURL: device.productURL,
		examples
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Main

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	if (!existsSync(CACHE_DIR)) {
		console.error(
			`✗ Repo TTN absent (${CACHE_DIR}).\n  git clone --depth=1 ${UPSTREAM_REPO} ${CACHE_DIR}`
		);
		process.exit(1);
	}

	const commit = getRepoCommit();
	const topIndex = await loadTopVendorIndex();

	let selectedVendorIds: string[];
	if (args.all) {
		selectedVendorIds = [...topIndex.keys()].sort();
	} else if (args.vendors.length > 0) {
		selectedVendorIds = args.vendors;
	} else {
		selectedVendorIds = PRIORITY_VENDORS;
	}

	// Purge complète des sorties existantes (anciens et nouveaux layouts).
	await rm(OUT_TTN_DIR, { recursive: true, force: true });
	await rm(OUT_CS_DIR, { recursive: true, force: true });
	await rm(OUT_LEGACY_DIR, { recursive: true, force: true });
	await mkdir(OUT_TTN_DIR, { recursive: true });
	await mkdir(OUT_CS_DIR, { recursive: true });

	const warnings: ManifestWarning[] = [];
	const devices: ManifestDevice[] = [];
	const vendorsAccumulator: { id: string; name: string; deviceCount: number }[] = [];

	for (const vendorId of selectedVendorIds) {
		const vendor = topIndex.get(vendorId);
		if (!vendor) {
			warnings.push({ vendor: vendorId, reason: 'vendor id not in top-level vendor/index.yaml' });
			continue;
		}
		const rawDeviceIds = await listVendorDevices(vendorId);
		if (rawDeviceIds.length === 0) {
			warnings.push({ vendor: vendorId, reason: 'no endDevices in vendor index' });
			continue;
		}
		// Le repo TTN liste parfois le même deviceId plusieurs fois dans
		// endDevices (ex. Dragino lds01). On dedupe en gardant la première
		// occurrence pour éviter des slugs en doublon dans le manifest
		// (Svelte refuse les keys dupliquées dans les listbox).
		const seenDeviceIds = new Set<string>();
		const deviceIds: string[] = [];
		for (const id of rawDeviceIds) {
			if (seenDeviceIds.has(id)) {
				warnings.push({
					vendor: vendorId,
					device: id,
					reason: 'duplicate deviceId in endDevices — kept first occurrence'
				});
				continue;
			}
			seenDeviceIds.add(id);
			deviceIds.push(id);
		}
		let kept = 0;
		for (const deviceId of deviceIds) {
			const dev = await processDevice(vendor, deviceId, commit.sha, warnings);
			if (dev) {
				devices.push(dev);
				kept++;
			}
		}
		vendorsAccumulator.push({ id: vendor.id, name: vendor.name, deviceCount: kept });
	}

	// Cayenne LPP — entrée hard-codée, exécution via décodeur interne.
	// Pas de fichier téléchargeable : Cayenne LPP est un standard, l'utilisateur
	// utilise généralement le décodeur natif de son NS.
	devices.push({
		slug: 'generic-cayenne-lpp',
		vendorId: 'generic',
		vendorName: 'Generic',
		deviceId: 'cayenne-lpp',
		name: 'Cayenne LPP (générique)',
		description:
			"Décodeur générique Cayenne Low Power Payload (myDevices / LoRa Alliance). Utiliser pour les passerelles ou devices configurés en sortie Cayenne LPP.",
		sensors: undefined,
		regions: [],
		fPorts: [],
		codecFile: 'internal:cayenne-lpp',
		examples: []
	});
	vendorsAccumulator.unshift({ id: 'generic', name: 'Generic', deviceCount: 1 });

	const manifest: Manifest = {
		generatedAt: new Date().toISOString(),
		source: {
			repo: UPSTREAM_REPO,
			commit: commit.sha,
			commitDate: commit.date
		},
		vendors: vendorsAccumulator,
		devices: devices.sort((a, b) => a.slug.localeCompare(b.slug)),
		warnings
	};

	await writeFile(resolve(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

	// Stats console
	const byVendor = new Map<string, number>();
	for (const d of devices) byVendor.set(d.vendorId, (byVendor.get(d.vendorId) ?? 0) + 1);

	console.log('');
	console.log(`✓ Manifest écrit : static/data/lorawan-codecs/manifest.json`);
	console.log(`✓ TTN v3         : static/data/lorawan-codecs/ttn-v3/*.js (${devices.length - 1} fichiers)`);
	console.log(`✓ ChirpStack v4  : static/data/lorawan-codecs/chirpstack-v4/*.js (${devices.length - 1} fichiers)`);
	console.log(`✓ Cayenne LPP    : décodeur interne (pas de download)`);
	console.log(`✓ Source         : TTN @ ${commit.sha.slice(0, 12)} (${commit.date})`);
	console.log('');
	console.log('Devices retenus par vendor :');
	for (const [v, n] of [...byVendor.entries()].sort()) console.log(`  ${v.padEnd(24)} ${n}`);
	console.log('');
	if (warnings.length > 0) {
		console.log(`Warnings (${warnings.length}) :`);
		// Regroupe par raison
		const byReason = new Map<string, number>();
		for (const w of warnings) byReason.set(w.reason, (byReason.get(w.reason) ?? 0) + 1);
		for (const [r, n] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
			console.log(`  ${String(n).padStart(4)} × ${r}`);
		}
	} else {
		console.log('Aucun warning.');
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
