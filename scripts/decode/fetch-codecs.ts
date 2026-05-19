// scripts/decode/fetch-codecs.ts
//
// Récupère les codecs uplink LoRaWAN du repo public TheThingsNetwork/lorawan-devices,
// les normalise et écrit le manifest + un fichier par codec sous
// static/data/lorawan-codecs/.
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
const OUT_CODEC_DIR = resolve(OUT_DIR, 'codecs');

const PRIORITY_VENDORS = ['milesight-iot', 'mclimate', 'enless-wireless'];

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
	codecFile: string;
	codecFormat: 'ttn-v3' | 'ttn-v2';
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
		repo: 'https://github.com/TheThingsNetwork/lorawan-devices';
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

function buildCodecHeader(opts: {
	vendorName: string;
	deviceName: string;
	deviceId: string;
	codecFormat: 'ttn-v3' | 'ttn-v2';
	sourcePath: string;
	commit: string;
}): string {
	return [
		'// Auto-generated by scripts/decode/fetch-codecs.ts — DO NOT EDIT MANUALLY.',
		`// Vendor   : ${opts.vendorName}`,
		`// Device   : ${opts.deviceName} (${opts.deviceId})`,
		`// Format   : ${opts.codecFormat}`,
		`// Source   : TheThingsNetwork/lorawan-devices @ ${opts.commit}`,
		`// Path     : ${opts.sourcePath}`,
		'// License  : Apache-2.0 (per upstream repo)',
		'',
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

	const slug = `${vendor.id}-${deviceId}`;
	const outFileName = `${slug}.js`;
	const header = buildCodecHeader({
		vendorName: vendor.name,
		deviceName: device.name ?? deviceId,
		deviceId,
		codecFormat: format,
		sourcePath: `vendor/${vendor.id}/${upDec.fileName}`,
		commit: commitSha
	});
	await writeFile(resolve(OUT_CODEC_DIR, outFileName), header + jsSource, 'utf8');

	const examples = normalizeExamples(upDec.examples);

	return {
		slug,
		vendorId: vendor.id,
		vendorName: vendor.name,
		deviceId,
		name: device.name ?? deviceId,
		description: device.description,
		sensors: device.sensors,
		regions: [...regions].sort(),
		fPorts: uniq(examples.map((e) => e.fPort)).sort((a, b) => a - b),
		codecFile: `codecs/${outFileName}`,
		codecFormat: format,
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
			`✗ Repo TTN absent (${CACHE_DIR}).\n  git clone --depth=1 https://github.com/TheThingsNetwork/lorawan-devices ${CACHE_DIR}`
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

	// Purge complète des sorties existantes pour partir propre.
	await rm(OUT_CODEC_DIR, { recursive: true, force: true });
	await mkdir(OUT_CODEC_DIR, { recursive: true });

	const warnings: ManifestWarning[] = [];
	const devices: ManifestDevice[] = [];
	const vendorsAccumulator: { id: string; name: string; deviceCount: number }[] = [];

	for (const vendorId of selectedVendorIds) {
		const vendor = topIndex.get(vendorId);
		if (!vendor) {
			warnings.push({ vendor: vendorId, reason: 'vendor id not in top-level vendor/index.yaml' });
			continue;
		}
		const deviceIds = await listVendorDevices(vendorId);
		if (deviceIds.length === 0) {
			warnings.push({ vendor: vendorId, reason: 'no endDevices in vendor index' });
			continue;
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
		codecFormat: 'ttn-v3',
		examples: []
	});
	vendorsAccumulator.unshift({ id: 'generic', name: 'Generic', deviceCount: 1 });

	const manifest: Manifest = {
		generatedAt: new Date().toISOString(),
		source: {
			repo: 'https://github.com/TheThingsNetwork/lorawan-devices',
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
	console.log(`✓ Codecs écrits  : static/data/lorawan-codecs/codecs/*.js (${devices.length - 1} fichiers + 1 internal)`);
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
