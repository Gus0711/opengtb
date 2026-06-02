// scripts/modbus/build.ts
//
// Pipeline modbus :
//   1. clone shallow jibrilsharafi/modbus-database + timlaing/modbus_local_gateway dans .cache/
//      (skippé si déjà présents — passe --refresh pour re-cloner)
//   2. normalise vers le schéma opengtb (cf. src/lib/tools/modbus/types.ts)
//   3. applique les overrides locaux (scripts/modbus/overrides/<vendor>/<model>.json)
//   4. écrit static/data/modbus/manifest.json + static/data/modbus/<vendor>/<model>.json
//
// Lancement :
//   npm run build-modbus               # incrémental, utilise le cache
//   npm run build-modbus -- --refresh  # re-clone tout et reconstruit
//
// Idempotent : on peut relancer, on régénère tout. Les outputs sont
// commités dans git (cf. modèle decode/fetch-codecs).

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import type {
	EquipmentType,
	ModbusDevice,
	ModbusManifest,
	ModbusManifestDevice
} from '../../src/lib/tools/modbus/types.ts';
import {
	applyOverride,
	createDeviceFromOverride,
	normalizeHa,
	normalizeJibri,
	type DeviceOverride
} from './lib/normalize.ts';
import { parseMbmdDriver, MBMD_DRIVERS } from './lib/normalize-mbmd.ts';
import { parseHaModbusManager } from './lib/normalize-modbus-manager.ts';
import { parsePyStiebelEltron } from './lib/normalize-pystiebel.ts';
import { parseEvccTemplate } from './lib/normalize-evcc.ts';
import { parseIobrokerDevice, type IobrokerTsvFile } from './lib/normalize-iobroker.ts';

// ─────────────────────────────────────────────────────────────────────────
// Chemins

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const CACHE_DIR = resolve(REPO_ROOT, '.cache');
const OVERRIDES_DIR = resolve(__dirname, 'overrides');
const OUT_DIR = resolve(REPO_ROOT, 'static/data/modbus');
const LIB_MANIFEST_PATH = resolve(REPO_ROOT, 'src/lib/tools/modbus/manifest.generated.json');

const JIBRI_REPO = 'https://github.com/jibrilsharafi/modbus-database.git';
const JIBRI_CACHE = resolve(CACHE_DIR, 'modbus-database');
const JIBRI_TABLES = resolve(JIBRI_CACHE, 'modbus-tables');

const HA_REPO = 'https://github.com/timlaing/modbus_local_gateway.git';
const HA_CACHE = resolve(CACHE_DIR, 'modbus_local_gateway');
const HA_CONFIGS = resolve(HA_CACHE, 'custom_components/modbus_local_gateway/device_configs');

const MBMD_REPO = 'https://github.com/volkszaehler/mbmd.git';
const MBMD_CACHE = resolve(CACHE_DIR, 'mbmd');
const MBMD_DRIVERS_DIR = resolve(MBMD_CACHE, 'meters/rs485');

const HAMM_REPO = 'https://github.com/TCzerny/ha-modbus-manager.git';
const HAMM_CACHE = resolve(CACHE_DIR, 'ha-modbus-manager');
const HAMM_TEMPLATES = resolve(HAMM_CACHE, 'custom_components/modbus_manager/device_templates');

const STIEBEL_REPO = 'https://github.com/fucm/python-stiebel-eltron.git';
const STIEBEL_CACHE = resolve(CACHE_DIR, 'python-stiebel-eltron');
const STIEBEL_FILE = resolve(STIEBEL_CACHE, 'pystiebeleltron/pystiebeleltron.py');

const EVCC_REPO = 'https://github.com/evcc-io/evcc.git';
const EVCC_CACHE = resolve(CACHE_DIR, 'evcc');
const EVCC_METER_DIR = resolve(EVCC_CACHE, 'templates/definition/meter');
const EVCC_CHARGER_DIR = resolve(EVCC_CACHE, 'templates/definition/charger');

const IOBROKER_REPO = 'https://github.com/ioBroker/modbus-templates.git';
const IOBROKER_CACHE = resolve(CACHE_DIR, 'modbus-templates');

// ─────────────────────────────────────────────────────────────────────────
// Helpers I/O

async function ensureClone(repo: string, dest: string, refresh: boolean) {
	if (refresh && existsSync(dest)) {
		console.log(`[clone] purge ${dest}`);
		await rm(dest, { recursive: true, force: true });
	}
	if (!existsSync(dest)) {
		console.log(`[clone] ${repo} → ${dest}`);
		await mkdir(dirname(dest), { recursive: true });
		execSync(`git clone --depth=1 ${repo} ${dest}`, { stdio: 'inherit' });
	}
}

function gitSha(repoDir: string): string {
	return execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();
}

async function readJson<T>(path: string): Promise<T> {
	return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function listSubdirs(parent: string): Promise<string[]> {
	const entries = await readdir(parent, { withFileTypes: true });
	return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

// ─────────────────────────────────────────────────────────────────────────
// Lecture des sources

async function collectJibrisharafiDevices(sha: string): Promise<ModbusDevice[]> {
	const out: ModbusDevice[] = [];
	const vendors = await listSubdirs(JIBRI_TABLES);
	for (const vendor of vendors) {
		const vendorDir = join(JIBRI_TABLES, vendor);
		const models = await listSubdirs(vendorDir).catch(() => []);
		for (const model of models) {
			const latestDir = join(vendorDir, model, 'latest');
			const metaPath = join(latestDir, 'metadata.json');
			const regsPath = join(latestDir, 'registers.json');
			if (!existsSync(metaPath) || !existsSync(regsPath)) continue;
			try {
				const metadata = await readJson<Parameters<typeof normalizeJibri>[0]['metadata']>(metaPath);
				const registers = await readJson<Parameters<typeof normalizeJibri>[0]['registers']>(regsPath);
				const dev = normalizeJibri({ metadata, registers, upstreamSha: sha });
				if (dev.registers.length === 0) continue;
				out.push(dev);
			} catch (err) {
				console.warn(`[jibri] skip ${vendor}/${model} :`, (err as Error).message);
			}
		}
	}
	return out;
}

async function collectHaDevices(sha: string): Promise<ModbusDevice[]> {
	const out: ModbusDevice[] = [];
	const files = (await readdir(HA_CONFIGS)).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'));
	for (const filename of files) {
		try {
			const raw = await readFile(join(HA_CONFIGS, filename), 'utf8');
			const yaml = parseYaml(raw) as Parameters<typeof normalizeHa>[0]['yaml'];
			const dev = normalizeHa({ yaml, upstreamSha: sha, filename });
			if (dev) out.push(dev);
		} catch (err) {
			console.warn(`[ha] skip ${filename} :`, (err as Error).message);
		}
	}
	return out;
}

async function collectMbmdDevices(sha: string): Promise<ModbusDevice[]> {
	const out: ModbusDevice[] = [];
	for (const filename of Object.keys(MBMD_DRIVERS)) {
		const path = join(MBMD_DRIVERS_DIR, filename);
		if (!existsSync(path)) continue;
		try {
			const source = await readFile(path, 'utf8');
			const dev = parseMbmdDriver({ filename, source }, sha);
			if (dev) out.push(dev);
		} catch (err) {
			console.warn(`[mbmd] skip ${filename} :`, (err as Error).message);
		}
	}
	return out;
}

async function collectHaModbusManagerDevices(sha: string): Promise<ModbusDevice[]> {
	const out: ModbusDevice[] = [];
	if (!existsSync(HAMM_TEMPLATES)) return out;
	const files = (await readdir(HAMM_TEMPLATES)).filter((f) => f.endsWith('.yaml'));
	for (const filename of files) {
		try {
			const raw = await readFile(join(HAMM_TEMPLATES, filename), 'utf8');
			const yaml = parseYaml(raw) as Parameters<typeof parseHaModbusManager>[0];
			const dev = parseHaModbusManager(yaml, sha);
			if (dev) out.push(dev);
		} catch (err) {
			console.warn(`[ha-modbus-manager] skip ${filename} :`, (err as Error).message);
		}
	}
	return out;
}

async function collectPyStiebel(sha: string): Promise<ModbusDevice[]> {
	if (!existsSync(STIEBEL_FILE)) return [];
	try {
		const source = await readFile(STIEBEL_FILE, 'utf8');
		const dev = parsePyStiebelEltron(source, sha);
		return dev ? [dev] : [];
	} catch (err) {
		console.warn('[pystiebel] skip :', (err as Error).message);
		return [];
	}
}

async function collectEvccDevices(sha: string): Promise<ModbusDevice[]> {
	const out: ModbusDevice[] = [];
	for (const [dir, source] of [
		[EVCC_METER_DIR, 'meter' as const],
		[EVCC_CHARGER_DIR, 'charger' as const]
	]) {
		if (!existsSync(dir)) continue;
		const files = (await readdir(dir)).filter((f) => f.endsWith('.yaml'));
		for (const filename of files) {
			try {
				const raw = await readFile(join(dir, filename), 'utf8');
				const yaml = parseYaml(raw) as Parameters<typeof parseEvccTemplate>[0];
				const dev = parseEvccTemplate(yaml, source, sha);
				if (dev) out.push(dev);
			} catch (err) {
				console.warn(`[evcc] skip ${source}/${filename} :`, (err as Error).message);
			}
		}
	}
	return out;
}

/** Walk récursif pour trouver tous les TSV ioBroker. */
async function walkTsv(dir: string, root: string): Promise<{ path: string; rel: string[] }[]> {
	const out: { path: string; rel: string[] }[] = [];
	const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
	for (const e of entries) {
		const full = join(dir, e.name);
		if (e.isDirectory()) {
			out.push(...(await walkTsv(full, root)));
		} else if (e.isFile() && e.name.toLowerCase().endsWith('.tsv')) {
			const rel = full.slice(root.length + 1).split('/');
			out.push({ path: full, rel });
		}
	}
	return out;
}

/** True si le filename est générique (holding/input/coils-registers) plutôt qu'un nom de modèle. */
function isGenericRegisterFilename(name: string): boolean {
	const low = name.toLowerCase().replace(/\.tsv$/, '');
	return /^(holding|input|eingang|coil|discrete)([-_]registers?)?$/.test(low);
}

async function collectIobrokerDevices(sha: string): Promise<ModbusDevice[]> {
	if (!existsSync(IOBROKER_CACHE)) return [];
	const tsvFiles = await walkTsv(IOBROKER_CACHE, IOBROKER_CACHE);
	// Groupe par (category, vendor, model). Règles :
	//   - cat/vendor/Model/file.tsv         → model = Model
	//   - cat/vendor/file.tsv (générique)   → model = vendor (1 device par vendor, fichiers mergés)
	//   - cat/vendor/file.tsv (spécifique)  → model = filename (cas Meltem variants)
	const groups = new Map<string, IobrokerTsvFile[]>();
	for (const { path, rel } of tsvFiles) {
		if (rel.length < 3) continue;
		const [category, vendor, ...rest] = rel;
		const filename = rest[rest.length - 1];
		let model: string;
		if (rest.length >= 2) {
			model = rest[0];
		} else if (isGenericRegisterFilename(filename)) {
			model = vendor;
		} else {
			model = filename.replace(/\.tsv$/i, '');
		}
		const key = `${category}::${vendor}::${model}`;
		const content = await readFile(path, 'utf8');
		const entry: IobrokerTsvFile = { category, vendor, model, filename, content };
		const list = groups.get(key);
		if (list) list.push(entry);
		else groups.set(key, [entry]);
	}
	const out: ModbusDevice[] = [];
	for (const files of groups.values()) {
		const dev = parseIobrokerDevice(files, sha);
		if (dev) out.push(dev);
	}
	return out;
}

async function collectOverrides(): Promise<DeviceOverride[]> {
	if (!existsSync(OVERRIDES_DIR)) return [];
	const out: DeviceOverride[] = [];
	const vendors = await listSubdirs(OVERRIDES_DIR);
	for (const vendor of vendors) {
		const vendorDir = join(OVERRIDES_DIR, vendor);
		const files = (await readdir(vendorDir)).filter((f) => f.endsWith('.json'));
		for (const f of files) {
			try {
				const data = await readJson<DeviceOverride>(join(vendorDir, f));
				if (!data.slug) {
					console.warn(`[override] ${vendor}/${f} : champ "slug" manquant, ignoré`);
					continue;
				}
				out.push(data);
			} catch (err) {
				console.warn(`[override] skip ${vendor}/${f} :`, (err as Error).message);
			}
		}
	}
	return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Merge sources : précédence overrides > HA (souvent enrichi FR/PAC) > jibrilsharafi

function mergeBySlug(...sources: ModbusDevice[][]): Map<string, ModbusDevice> {
	const byKey = new Map<string, ModbusDevice>();
	for (const src of sources) {
		for (const dev of src) {
			byKey.set(dev.slug, dev);
		}
	}
	return byKey;
}

// ─────────────────────────────────────────────────────────────────────────
// Sortie

function toManifestEntry(dev: ModbusDevice): ModbusManifestDevice {
	return {
		slug: dev.slug,
		vendor: dev.vendor,
		vendorSlug: dev.vendorSlug,
		model: dev.model,
		modelSlug: dev.modelSlug,
		name: dev.name,
		equipmentType: dev.equipmentType,
		transport: dev.transport,
		registerCount: dev.registers.length,
		needsReview: dev.upstream.needsReview,
		tags: dev.tags
	};
}

async function writeOutputs(devices: ModbusDevice[], manifest: ModbusManifest) {
	// Purge le dossier de sortie pour rester reproductible (pas de devices stale).
	if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true, force: true });
	await mkdir(OUT_DIR, { recursive: true });

	for (const dev of devices) {
		const dir = join(OUT_DIR, dev.vendorSlug);
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, `${dev.modelSlug}.json`), JSON.stringify(dev, null, 2), 'utf8');
	}

	const manifestJson = JSON.stringify(manifest, null, 2);
	await writeFile(join(OUT_DIR, 'manifest.json'), manifestJson, 'utf8');
	// Duplique le manifest dans src/lib pour qu'il soit importable au build
	// (entries() du prerender, page index). Évite un fetch + parse à chaque visite.
	await writeFile(LIB_MANIFEST_PATH, manifestJson, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────
// Main

async function main() {
	const refresh = process.argv.includes('--refresh');

	await ensureClone(JIBRI_REPO, JIBRI_CACHE, refresh);
	await ensureClone(HA_REPO, HA_CACHE, refresh);
	await ensureClone(MBMD_REPO, MBMD_CACHE, refresh);
	await ensureClone(HAMM_REPO, HAMM_CACHE, refresh);
	await ensureClone(STIEBEL_REPO, STIEBEL_CACHE, refresh);
	await ensureClone(EVCC_REPO, EVCC_CACHE, refresh);
	await ensureClone(IOBROKER_REPO, IOBROKER_CACHE, refresh);

	const jibriSha = gitSha(JIBRI_CACHE);
	const haSha = gitSha(HA_CACHE);
	const mbmdSha = gitSha(MBMD_CACHE);
	const hammSha = gitSha(HAMM_CACHE);
	const stiebelSha = gitSha(STIEBEL_CACHE);
	const evccSha = gitSha(EVCC_CACHE);
	const iobrokerSha = gitSha(IOBROKER_CACHE);
	console.log(
		`[sha] jibri=${jibriSha.slice(0, 7)} ha=${haSha.slice(0, 7)} mbmd=${mbmdSha.slice(0, 7)} hamm=${hammSha.slice(0, 7)} stiebel=${stiebelSha.slice(0, 7)} evcc=${evccSha.slice(0, 7)} iobroker=${iobrokerSha.slice(0, 7)}`
	);

	console.log('[jibri] lecture des devices…');
	const jibriDevices = await collectJibrisharafiDevices(jibriSha);
	console.log(`[jibri] ${jibriDevices.length} devices`);

	console.log('[ha] lecture des devices…');
	const haDevices = await collectHaDevices(haSha);
	console.log(`[ha] ${haDevices.length} devices`);

	console.log('[mbmd] lecture des drivers…');
	const mbmdDevices = await collectMbmdDevices(mbmdSha);
	console.log(`[mbmd] ${mbmdDevices.length} devices`);

	console.log('[ha-modbus-manager] lecture des templates…');
	const hammDevices = await collectHaModbusManagerDevices(hammSha);
	console.log(`[ha-modbus-manager] ${hammDevices.length} devices`);

	console.log('[pystiebel] lecture du regmap…');
	const stiebelDevices = await collectPyStiebel(stiebelSha);
	console.log(`[pystiebel] ${stiebelDevices.length} devices`);

	console.log('[evcc] lecture des templates…');
	const evccDevices = await collectEvccDevices(evccSha);
	console.log(`[evcc] ${evccDevices.length} devices`);

	console.log('[iobroker] lecture des TSV…');
	const iobrokerDevices = await collectIobrokerDevices(iobrokerSha);
	console.log(`[iobroker] ${iobrokerDevices.length} devices`);

	console.log('[overrides] lecture…');
	const overrides = await collectOverrides();
	console.log(`[overrides] ${overrides.length} entrées`);

	// Précédence (du plus faible au plus fort) : jibri < HA timlaing < evcc < iobroker < mbmd
	// < ha-modbus-manager < stiebel. Les sources les plus précises (formats riches,
	// métadonnées sourcées, sectorielles GTB) écrasent les sources tabulaires généralistes.
	const merged = mergeBySlug(
		jibriDevices,
		haDevices,
		evccDevices,
		iobrokerDevices,
		mbmdDevices,
		hammDevices,
		stiebelDevices
	);

	// Application des overrides.
	for (const o of overrides) {
		const target = merged.get(o.slug);
		if (target) {
			merged.set(o.slug, applyOverride(target, o));
		} else if (o._create) {
			// Création ex-nihilo : device entièrement défini par l'override (Viessmann, Kamstrup…).
			try {
				merged.set(o.slug, createDeviceFromOverride(o));
				console.log(`[overrides] device créé ex-nihilo : ${o.slug}`);
			} catch (err) {
				console.warn(`[overrides] échec création "${o.slug}" :`, (err as Error).message);
			}
		} else {
			console.warn(
				`[overrides] slug "${o.slug}" ne match aucun device upstream — ajoutez "_create": true pour créer ex-nihilo, sinon override ignoré`
			);
		}
	}

	const devices = [...merged.values()].sort((a, b) => a.slug.localeCompare(b.slug));

	const vendors = [...new Set(devices.map((d) => d.vendor))].sort((a, b) => a.localeCompare(b));
	const equipmentTypes = [...new Set(devices.map((d) => d.equipmentType))].sort() as EquipmentType[];

	const manifest: ModbusManifest = {
		generatedAt: new Date().toISOString(),
		sources: {
			jibrilsharafi: { sha: jibriSha, deviceCount: jibriDevices.length },
			ha: { sha: haSha, deviceCount: haDevices.length },
			mbmd: { sha: mbmdSha, deviceCount: mbmdDevices.length },
			haModbusManager: { sha: hammSha, deviceCount: hammDevices.length },
			stiebel: { sha: stiebelSha, deviceCount: stiebelDevices.length },
			evcc: { sha: evccSha, deviceCount: evccDevices.length },
			iobroker: { sha: iobrokerSha, deviceCount: iobrokerDevices.length },
			overrides: { deviceCount: overrides.length }
		},
		devices: devices.map(toManifestEntry),
		vendors,
		equipmentTypes
	};

	await writeOutputs(devices, manifest);

	console.log(
		`[done] ${devices.length} devices écrits dans static/data/modbus/ (${vendors.length} marques)`
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
