// Helpers purs (sans I/O) de normalisation des sources upstream
// vers le schéma opengtb (cf. src/lib/tools/modbus/types.ts).
//
// La séparation pure / I/O permet de tester ces conversions sans
// avoir à monter de fixtures sur disque.

import type {
	EquipmentType,
	ModbusAccess,
	ModbusDataType,
	ModbusDevice,
	ModbusFunction,
	ModbusRegister,
	ModbusTransport,
	UpstreamInfo
} from '../../../src/lib/tools/modbus/types.ts';

// ─────────────────────────────────────────────────────────────────────────
// Helpers Python — pour parser les sources sous forme de literal dict.

/**
 * Convertit un literal Python (simple) en JSON parsable.
 * Limites : ne gère pas les f-strings, comprehensions, ou expressions dynamiques.
 * Suffisant pour les fichiers REGMAP plats de pystiebeleltron, pas pour
 * lambdatronic (qui contient des `f"..."` et des boucles).
 */
export function pythonLiteralToJson(src: string): string {
	return src
		.replace(/#[^\n]*/g, '') // line comments
		.replace(/,(\s*[}\]])/g, '$1') // trailing commas
		.replace(/'([^'\\]*)'/g, '"$1"') // single-quoted strings → double
		.replace(/\bTrue\b/g, 'true')
		.replace(/\bFalse\b/g, 'false')
		.replace(/\bNone\b/g, 'null');
}

/** Extrait le bloc `{ ... }` balanced qui suit un identifiant donné. */
export function extractBalancedBlock(src: string, after: RegExp): string | null {
	const match = after.exec(src);
	if (!match) return null;
	const start = match.index + match[0].length;
	let depth = 0;
	for (let i = start; i < src.length; i++) {
		const c = src[i];
		if (c === '{') depth++;
		else if (c === '}') {
			depth--;
			if (depth === 0) return src.slice(start, i + 1);
		}
	}
	return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Slugs et identifiants

/** Kebab-case ASCII sûr pour URL (et clé de manifest). */
export function slugify(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

// ─────────────────────────────────────────────────────────────────────────
// jibrilsharafi → opengtb

/** function_codes Modbus standard. */
const FN_CODE_TO_FUNCTION: Record<number, ModbusFunction> = {
	1: 'coil',
	5: 'coil',
	15: 'coil',
	2: 'discrete',
	3: 'holding',
	6: 'holding',
	16: 'holding',
	4: 'input'
};

const FN_CODE_WRITE = new Set([5, 6, 15, 16]);
const FN_CODE_READ = new Set([1, 2, 3, 4]);

export function functionFromCodes(codes: number[]): ModbusFunction {
	// Privilégie la fonction de lecture si présente, sinon la première mappée.
	for (const c of codes) {
		if (FN_CODE_READ.has(c)) return FN_CODE_TO_FUNCTION[c];
	}
	for (const c of codes) {
		if (FN_CODE_TO_FUNCTION[c]) return FN_CODE_TO_FUNCTION[c];
	}
	return 'holding';
}

export function accessFromCodes(codes: number[], jibriAccess?: string): ModbusAccess {
	const upstream = (jibriAccess ?? '').toLowerCase().trim();
	if (upstream === 'write') return 'w';
	if (upstream === 'read/write' || upstream === 'readwrite' || upstream === 'rw') return 'rw';
	const canRead = codes.some((c) => FN_CODE_READ.has(c));
	const canWrite = codes.some((c) => FN_CODE_WRITE.has(c));
	if (canRead && canWrite) return 'rw';
	if (canWrite) return 'w';
	return 'r';
}

const JIBRI_TYPE_MAP: Record<string, { dataType: ModbusDataType; size: number }> = {
	int16: { dataType: 'int16', size: 1 },
	uint16: { dataType: 'uint16', size: 1 },
	int32: { dataType: 'int32', size: 2 },
	uint32: { dataType: 'uint32', size: 2 },
	int64: { dataType: 'int64', size: 4 },
	uint64: { dataType: 'uint64', size: 4 },
	float: { dataType: 'float32', size: 2 },
	double: { dataType: 'float64', size: 4 },
	string: { dataType: 'string', size: 1 },
	boolean: { dataType: 'bool', size: 1 }
};

export function dataTypeFromJibri(
	raw: string | undefined,
	sizeHint?: number
): { dataType: ModbusDataType; size: number } {
	const key = (raw ?? '').toLowerCase();
	const mapped = JIBRI_TYPE_MAP[key];
	if (mapped) {
		// Si l'upstream précise une size cohérente, on la respecte.
		const size = typeof sizeHint === 'number' && sizeHint > 0 ? sizeHint : mapped.size;
		return { dataType: mapped.dataType, size };
	}
	// Fallback : on ne perd pas le device entier pour un type exotique.
	return { dataType: 'uint16', size: sizeHint ?? 1 };
}

/** Une URL est "douteuse" si elle pointe vers un site de tuto plutôt qu'une datasheet constructeur. */
const SUSPECT_URL_PATTERNS = [
	/aggsoft\.com/i,
	/instructables\.com/i,
	/stackoverflow\.com/i,
	/forum\./i,
	/blog\./i
];

export function isSuspectSourceUrl(url?: string): boolean {
	if (!url) return false;
	return SUSPECT_URL_PATTERNS.some((re) => re.test(url));
}

// Heuristique simple equipmentType — purement indicative.
// Le pattern matching est case-insensitive sur (vendor, model, description, registers names).
const EQUIPMENT_HEURISTICS: Array<{ type: EquipmentType; needles: RegExp[] }> = [
	{
		type: 'compteur-th',
		needles: [/calorim/i, /kamstrup/i, /multical/i, /sontex/i, /supercal/i, /sharky/i, /sensostar/i, /landis.*gyr.*uh/i, /\bbtu\b/i, /thermal.?meter/i, /heat.?meter/i, /compteur.?(thermique|d.energie.?th|calorim)/i]
	},
	{
		type: 'chaudiere',
		needles: [/\bboiler\b/i, /\bchauffe?-?eau\b/i, /\bchaudi[èe]re\b/i, /vitodens/i, /vitocrossal/i, /vitorondens/i, /viessmann/i, /buderus/i, /logamatic/i, /vaillant/i, /froling/i, /\bfröling\b/i, /lambdatronic/i, /okofen/i, /\b[öo]kofen\b/i, /\bhargassner\b/i, /\bkwb\b/i, /\beta\s/i, /\bsolvis\b/i, /pellet/i, /condensation/i]
	},
	{
		type: 'onduleur-pv',
		needles: [/inverter/i, /solar/i, /pv\b/i, /sunspec/i, /fronius/i, /sma\b/i, /sungrow/i, /huawei/i, /solaredge/i, /kostal/i, /growatt/i]
	},
	{
		type: 'compteur-elec',
		needles: [/meter/i, /sdm\d/i, /em\d{2,}/i, /pm\d{2,}/i, /\bkwh\b/i, /energy.*meter/i, /power.*meter/i, /watt.?(node|sense)/i]
	},
	{
		type: 'pac',
		needles: [/heat[- ]?pump/i, /\bpac\b/i, /dimplex/i, /nibe/i, /atlantic/i, /altherma/i, /ecodan/i, /aquarea/i, /yutaki/i, /\btherma\s?v\b/i, /stiebel/i, /tecalor/i, /husdata/i]
	},
	{ type: 'vmc', needles: [/vmc/i, /ventilation/i, /pichler/i, /aldes/i, /\bcta\b/i, /air.?handling/i] },
	{ type: 'variateur', needles: [/vfd/i, /variator/i, /\bvariateur\b/i, /drive\b/i, /\bvfd\b/i, /\batv\d/i, /\bacs\d/i] },
	{ type: 'regulateur', needles: [/\bregulator\b/i, /thermostat/i, /\bhvac\b/i, /carel/i, /distech/i, /siemens.*rd[gs]/i] },
	{ type: 'gateway', needles: [/gateway/i, /modbus.?tcp/i, /relay/i, /\b(i\/o|io)\b/i, /digital.?(in|out)/i, /waveshare/i] },
	{ type: 'es', needles: [/wago/i, /beckhoff/i, /i\/o module/i, /\biocoupler\b/i] }
];

export function inferEquipmentType(opts: {
	vendor: string;
	model: string;
	description?: string;
	registerNames?: string[];
	application?: string;
}): EquipmentType {
	const haystack = [
		opts.vendor,
		opts.model,
		opts.description ?? '',
		opts.application ?? '',
		(opts.registerNames ?? []).slice(0, 30).join(' ')
	].join(' ');
	for (const { type, needles } of EQUIPMENT_HEURISTICS) {
		if (needles.some((re) => re.test(haystack))) return type;
	}
	// Hints depuis l'application jibrilsharafi.
	const app = (opts.application ?? '').toLowerCase();
	if (app.includes('energy metering')) return 'compteur-elec';
	if (app.includes('energy generation') || app.includes('energy storage')) return 'onduleur-pv';
	return 'autre';
}

interface JibriMetadata {
	manufacturer: string;
	model: string;
	description?: string;
	version?: string;
	url?: string;
	tags?: { industry?: string; application?: string };
	connection?: {
		RTU?: {
			baudrate?: number;
			parity?: 'none' | 'even' | 'odd';
			data_bits?: 5 | 6 | 7 | 8;
			stop_bits?: 1 | 2;
			slave_id?: number;
		};
		TCP?: { port?: number; slave_id?: number; ip_address?: string };
	};
}

interface JibriRegistersFile {
	[address: string]: {
		name: string;
		description: string;
		function_codes: number[];
		size?: number;
		data_type: string;
		unit?: string;
		access: string;
		scaling_factor?: number;
		scaling_offset?: number;
	};
}

export function normalizeJibri(input: {
	metadata: JibriMetadata;
	registers: JibriRegistersFile;
	upstreamSha: string;
}): ModbusDevice {
	const { metadata, registers, upstreamSha } = input;

	const vendor = (metadata.manufacturer ?? 'unknown').trim();
	const model = (metadata.model ?? 'unknown').trim();
	const vendorSlug = slugify(vendor);
	const modelSlug = slugify(model);

	const registerNames: string[] = [];
	const normRegisters: ModbusRegister[] = Object.entries(registers)
		.map(([addrStr, r]) => {
			const address = Number.parseInt(addrStr, 10);
			if (!Number.isFinite(address)) return null;
			const fnCodes = Array.isArray(r.function_codes) ? r.function_codes : [];
			const fn = functionFromCodes(fnCodes);
			const access = accessFromCodes(fnCodes, r.access);
			const { dataType, size } = dataTypeFromJibri(r.data_type, r.size);
			const label = r.description && r.description !== r.name ? r.description : undefined;
			registerNames.push(r.name);
			return {
				address,
				function: fn,
				name: r.name,
				label,
				dataType,
				size,
				scale: r.scaling_factor,
				offset: r.scaling_offset,
				unit: r.unit && r.unit.trim() ? r.unit.trim() : undefined,
				access
			} satisfies ModbusRegister;
		})
		.filter((x): x is ModbusRegister => x !== null)
		.sort((a, b) => a.address - b.address);

	const transport: ModbusTransport[] = [];
	if (metadata.connection?.RTU) transport.push('rtu');
	if (metadata.connection?.TCP) transport.push('tcp');
	if (transport.length === 0) transport.push('rtu'); // Défaut raisonnable.

	const reviewReasons: string[] = [];
	if (isSuspectSourceUrl(metadata.url)) reviewReasons.push('Source upstream : tuto tiers, vérifier les registres');
	if (!metadata.connection || (!metadata.connection.RTU && !metadata.connection.TCP)) {
		reviewReasons.push('Pas de config RTU/TCP fournie en amont');
	}
	const hasMulti = normRegisters.some((r) => r.size > 1);
	if (hasMulti) reviewReasons.push("Ordre d'octets (word order) non spécifié — défaut AB-CD, vérifier sur datasheet");

	const equipmentType = inferEquipmentType({
		vendor,
		model,
		description: metadata.description,
		registerNames,
		application: metadata.tags?.application
	});

	return {
		slug: `${vendorSlug}-${modelSlug}`,
		vendor,
		vendorSlug,
		model,
		modelSlug,
		name: `${vendor} ${model}`,
		equipmentType,
		transport,
		defaults: {
			rtu: metadata.connection?.RTU
				? {
						baudrate: metadata.connection.RTU.baudrate,
						parity: metadata.connection.RTU.parity,
						dataBits: metadata.connection.RTU.data_bits,
						stopBits: metadata.connection.RTU.stop_bits,
						slaveIdDefault: metadata.connection.RTU.slave_id
					}
				: undefined,
			tcp: metadata.connection?.TCP
				? { port: metadata.connection.TCP.port, unitIdDefault: metadata.connection.TCP.slave_id }
				: undefined
		},
		registers: normRegisters,
		datasheets: metadata.url && !isSuspectSourceUrl(metadata.url)
			? [{ label: 'Doc constructeur', url: metadata.url }]
			: undefined,
		upstream: {
			source: 'jibrilsharafi',
			ref: upstreamSha,
			sourceUrl: metadata.url,
			needsReview: reviewReasons.length > 0,
			reviewReasons: reviewReasons.length > 0 ? reviewReasons : undefined
		} satisfies UpstreamInfo
	};
}

// ─────────────────────────────────────────────────────────────────────────
// Home Assistant (timlaing/modbus_local_gateway) → opengtb

/**
 * Schéma simplifié des YAML HA modbus_local_gateway.
 * Sections supportées : read_only_word, read_write_word, read_only_bool, read_write_bool,
 * read_only_holding, read_write_holding, read_only_input, read_only_coil, read_write_coil.
 * Tout `*_word` sans hint = holding ; `*_bool` = coil.
 */
interface HaDeviceConfig {
	device?: { manufacturer?: string; model?: string };
	[section: string]: unknown;
}

interface HaRegisterRaw {
	address: number;
	name?: string;
	size?: number;
	float?: boolean;
	unit_of_measurement?: string;
	precision?: number;
	multiplier?: number;
	control?: string;
	options?: Record<string | number, string>;
	icon?: string;
}

/** Map une section HA vers `(function, access, dataTypeHint)`. */
function inferFromHaSection(section: string): {
	function: ModbusFunction;
	access: ModbusAccess;
	defaultDataType: ModbusDataType;
} | null {
	const s = section.toLowerCase();
	const access: ModbusAccess = s.startsWith('read_write') ? 'rw' : 'r';
	if (s.includes('bool') || s.includes('coil')) {
		return { function: 'coil', access, defaultDataType: 'bool' };
	}
	if (s.includes('discrete')) {
		return { function: 'discrete', access: 'r', defaultDataType: 'bool' };
	}
	if (s.includes('input')) {
		return { function: 'input', access: 'r', defaultDataType: 'uint16' };
	}
	if (s.includes('word') || s.includes('holding')) {
		return { function: 'holding', access, defaultDataType: 'uint16' };
	}
	return null;
}

function haDataType(
	raw: HaRegisterRaw,
	defaultDataType: ModbusDataType
): { dataType: ModbusDataType; size: number } {
	const size = raw.size ?? 1;
	if (defaultDataType === 'bool') return { dataType: 'bool', size: 1 };
	if (raw.float) {
		// float: true → 32 ou 64 bits selon size.
		if (size >= 4) return { dataType: 'float64', size: 4 };
		return { dataType: 'float32', size: 2 };
	}
	// Hint via size pour les entiers.
	if (size >= 4) return { dataType: 'uint64', size: 4 };
	if (size >= 2) return { dataType: 'uint32', size: 2 };
	return { dataType: 'uint16', size: 1 };
}

export function normalizeHa(input: { yaml: HaDeviceConfig; upstreamSha: string; filename: string }): ModbusDevice | null {
	const { yaml, upstreamSha, filename } = input;
	const vendor = yaml.device?.manufacturer ?? '';
	const model = yaml.device?.model ?? '';
	if (!vendor || !model) return null;

	const vendorSlug = slugify(vendor);
	const modelSlug = slugify(model);
	const registers: ModbusRegister[] = [];
	const registerNames: string[] = [];

	for (const [section, payload] of Object.entries(yaml)) {
		if (section === 'device') continue;
		const sectionInfo = inferFromHaSection(section);
		if (!sectionInfo || typeof payload !== 'object' || !payload) continue;

		for (const [key, raw] of Object.entries(payload as Record<string, HaRegisterRaw>)) {
			if (!raw || typeof raw !== 'object' || typeof raw.address !== 'number') continue;
			const { dataType, size } = haDataType(raw, sectionInfo.defaultDataType);
			const name = raw.name ?? key;
			registerNames.push(name);
			const optionsEntries = raw.options
				? Object.entries(raw.options).reduce<Record<string, string>>((acc, [k, v]) => {
						acc[String(k)] = String(v);
						return acc;
					}, {})
				: undefined;
			registers.push({
				address: raw.address,
				function: sectionInfo.function,
				name,
				dataType,
				size,
				scale: raw.multiplier,
				unit: raw.unit_of_measurement,
				access: sectionInfo.access,
				enum: optionsEntries
			});
		}
	}

	registers.sort((a, b) => a.address - b.address);

	if (registers.length === 0) return null;

	const equipmentType = inferEquipmentType({
		vendor,
		model,
		description: filename,
		registerNames
	});

	const reviewReasons: string[] = [];
	const hasMulti = registers.some((r) => r.size > 1);
	if (hasMulti) reviewReasons.push("Ordre d'octets (word order) non spécifié — défaut AB-CD, vérifier sur datasheet");

	return {
		slug: `${vendorSlug}-${modelSlug}`,
		vendor,
		vendorSlug,
		model,
		modelSlug,
		name: `${vendor} ${model}`,
		equipmentType,
		transport: ['rtu', 'tcp'],
		defaults: {},
		registers,
		upstream: {
			source: 'ha-modbus-gateway',
			ref: upstreamSha,
			needsReview: reviewReasons.length > 0,
			reviewReasons: reviewReasons.length > 0 ? reviewReasons : undefined
		}
	};
}

// ─────────────────────────────────────────────────────────────────────────
// Merge overrides

/**
 * Override partiel : on remplace ce qui est fourni, on garde le reste.
 *
 * Mode "ex-nihilo" : si l'override contient `_create: true`, on crée un device
 * complet de zéro (utile pour les devices absents des sources upstream :
 * Viessmann, Kamstrup, Sontex, etc.). Les champs `vendor`, `model`,
 * `equipmentType`, `transport`, `registers` deviennent alors requis (validé
 * par `createDeviceFromOverride`).
 */
export interface DeviceOverride {
	slug: string; // requis pour matcher
	_create?: boolean;
	vendor?: string;
	model?: string;
	name?: string;
	equipmentType?: EquipmentType;
	transport?: ModbusTransport[];
	defaults?: ModbusDevice['defaults'];
	doc?: string;
	datasheets?: ModbusDevice['datasheets'];
	tags?: string[];
	/** Patches par adresse : remplace ou ajoute un registre (clé = `${function}:${address}`). */
	registers?: Record<string, Partial<ModbusRegister> & { address?: number; function?: ModbusFunction }>;
	/** Liste de slugs à supprimer (registres en erreur amont). */
	removeRegisters?: string[];
	/** Si défini, force le statut needsReview (true/false). */
	needsReview?: boolean;
	/** Source de référence (datasheet PDF/HTML utilisée pour la saisie ex-nihilo). */
	source?: {
		datasheetUrl?: string;
		notes?: string;
	};
}

/**
 * Crée un device complet à partir d'un override `_create: true`.
 * Lève si des champs requis manquent.
 */
export function createDeviceFromOverride(o: DeviceOverride, ref = 'opengtb'): ModbusDevice {
	if (!o._create) {
		throw new Error(`Override "${o.slug}" : _create:true requis pour création ex-nihilo`);
	}
	const missing: string[] = [];
	if (!o.vendor) missing.push('vendor');
	if (!o.model) missing.push('model');
	if (!o.equipmentType) missing.push('equipmentType');
	if (!o.transport?.length) missing.push('transport');
	if (!o.registers || Object.keys(o.registers).length === 0) missing.push('registers');
	if (missing.length > 0) {
		throw new Error(`Override "${o.slug}" : champs manquants pour _create : ${missing.join(', ')}`);
	}

	const vendor = o.vendor!;
	const model = o.model!;
	const vendorSlug = slugify(vendor);
	const modelSlug = slugify(model);

	// Construit les registres à partir des entrées (clé "<function>:<address>" ou champs explicites)
	const registers: ModbusRegister[] = [];
	for (const [key, patch] of Object.entries(o.registers ?? {})) {
		const [fnFromKey, addrFromKey] = key.split(':');
		const fn = (patch.function ?? fnFromKey) as ModbusFunction;
		const addr = patch.address ?? Number.parseInt(addrFromKey, 10);
		if (!fn || !Number.isFinite(addr)) {
			throw new Error(`Override "${o.slug}" : registre "${key}" invalide`);
		}
		const name = patch.name ?? `register_${addr}`;
		registers.push({
			address: addr,
			function: fn,
			name,
			dataType: patch.dataType ?? 'uint16',
			size: patch.size ?? 1,
			access: patch.access ?? 'r',
			...patch
		} as ModbusRegister);
	}
	registers.sort((a, b) => a.address - b.address);

	return {
		slug: o.slug,
		vendor,
		vendorSlug,
		model,
		modelSlug,
		name: o.name ?? `${vendor} ${model}`,
		equipmentType: o.equipmentType!,
		transport: o.transport!,
		defaults: o.defaults ?? {},
		registers,
		doc: o.doc,
		datasheets: o.datasheets,
		tags: o.tags,
		upstream: {
			source: 'opengtb',
			ref,
			sourceUrl: o.source?.datasheetUrl,
			needsReview: o.needsReview ?? false,
			reviewReasons: undefined
		}
	};
}

export function applyOverride(device: ModbusDevice, override: DeviceOverride): ModbusDevice {
	const merged: ModbusDevice = {
		...device,
		vendor: override.vendor ?? device.vendor,
		model: override.model ?? device.model,
		name: override.name ?? device.name,
		equipmentType: override.equipmentType ?? device.equipmentType,
		transport: override.transport ?? device.transport,
		defaults: override.defaults ? { ...device.defaults, ...override.defaults } : device.defaults,
		doc: override.doc ?? device.doc,
		datasheets: override.datasheets ?? device.datasheets,
		tags: override.tags ?? device.tags
	};

	if (override.removeRegisters || override.registers) {
		const byKey = new Map<string, ModbusRegister>();
		for (const r of merged.registers) byKey.set(`${r.function}:${r.address}`, r);

		for (const k of override.removeRegisters ?? []) byKey.delete(k);

		for (const [key, patch] of Object.entries(override.registers ?? {})) {
			const existing = byKey.get(key);
			if (existing) {
				byKey.set(key, { ...existing, ...patch } as ModbusRegister);
			} else {
				// Nouveau registre — vérifier qu'on a les champs requis.
				const [fnFromKey, addrFromKey] = key.split(':');
				const fn = (patch.function ?? fnFromKey) as ModbusFunction;
				const addr = patch.address ?? Number.parseInt(addrFromKey, 10);
				if (!fn || !Number.isFinite(addr)) continue;
				byKey.set(key, {
					address: addr,
					function: fn,
					name: patch.name ?? `register_${addr}`,
					dataType: patch.dataType ?? 'uint16',
					size: patch.size ?? 1,
					access: patch.access ?? 'r',
					...patch
				} as ModbusRegister);
			}
		}

		merged.registers = [...byKey.values()].sort((a, b) => a.address - b.address);
	}

	if (override.needsReview !== undefined) {
		merged.upstream = { ...merged.upstream, needsReview: override.needsReview };
	}

	return merged;
}
