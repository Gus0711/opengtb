// Parse les templates evcc-io/evcc (MIT).
//
// Format YAML :
//   template: <id>
//   products:
//     - brand: <vendor>
//       description:
//         generic: <model>
//   render: |
//     type: custom | mbmd | sma | tasmota | ...
//     power:
//       source: modbus
//       register:
//         address: 0x0c
//         type: input
//         decode: float32
//
// On ne garde que les templates dont le render commence par `type: custom`
// avec des `register:` Modbus inline. Les autres (`type: mbmd` qui délèguent
// au driver Go déjà couvert par normalize-mbmd, ou intégrations HTTP/SMA/etc.)
// sont skippés.

import { slugify, inferEquipmentType } from './normalize.ts';
import type {
	EquipmentType,
	ModbusDataType,
	ModbusDevice,
	ModbusFunction,
	ModbusRegister
} from '../../../src/lib/tools/modbus/types.ts';

interface EvccProduct {
	brand?: string;
	description?: { generic?: string };
}

interface EvccTemplate {
	template?: string;
	products?: EvccProduct[];
	render?: string;
}

const DECODE_MAP: Record<string, { dataType: ModbusDataType; size: number }> = {
	uint16: { dataType: 'uint16', size: 1 },
	int16: { dataType: 'int16', size: 1 },
	uint32: { dataType: 'uint32', size: 2 },
	uint32s: { dataType: 'uint32', size: 2 }, // s = swapped words
	int32: { dataType: 'int32', size: 2 },
	int32s: { dataType: 'int32', size: 2 },
	uint64: { dataType: 'uint64', size: 4 },
	int64: { dataType: 'int64', size: 4 },
	float32: { dataType: 'float32', size: 2 },
	float32s: { dataType: 'float32', size: 2 },
	float64: { dataType: 'float64', size: 4 }
};

const SECTION_LABELS: Record<string, { label: string; unit?: string }> = {
	power: { label: 'Puissance', unit: 'W' },
	energy: { label: 'Énergie cumulée', unit: 'kWh' },
	currents: { label: 'Courant', unit: 'A' },
	voltages: { label: 'Tension', unit: 'V' },
	powers: { label: 'Puissance par phase', unit: 'W' },
	soc: { label: 'État de charge', unit: '%' },
	capacity: { label: 'Capacité batterie', unit: 'kWh' },
	temp: { label: 'Température', unit: '°C' },
	maxchargepower: { label: 'Puissance max charge', unit: 'W' },
	maxdischargepower: { label: 'Puissance max décharge', unit: 'W' },
	maxacpower: { label: 'Puissance AC max', unit: 'W' },
	batterymode: { label: 'Mode batterie' }
};

interface ExtractedRegister {
	section: string;
	address: number;
	function: ModbusFunction;
	decode: string;
	scale?: number;
	comment?: string;
}

/** Extrait les registres du bloc `render: |…`. Sépare l'analyse du YAML parsing. */
export function parseEvccRender(render: string): ExtractedRegister[] {
	const out: ExtractedRegister[] = [];
	const lines = render.split('\n');
	let currentSection: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const sectionMatch = line.match(/^([a-z][a-z0-9_]*):\s*$/);
		if (sectionMatch && !line.startsWith(' ') && !line.startsWith('\t')) {
			currentSection = sectionMatch[1];
			continue;
		}
		// Repère un bloc `register:`
		const regStart = line.match(/^(\s+)register:\s*$/);
		if (!regStart || !currentSection) continue;
		const baseIndent = regStart[1].length;
		// Parcourt les lignes suivantes indentées plus que baseIndent.
		let address: number | undefined;
		let fn: ModbusFunction | undefined;
		let decode: string | undefined;
		let comment: string | undefined;
		for (let j = i + 1; j < lines.length; j++) {
			const sub = lines[j];
			const subIndent = sub.match(/^(\s*)\S/);
			if (!subIndent || subIndent[1].length <= baseIndent) break;
			// Skip les lignes de templating Go (`{{- if`, `{{- end }}`).
			const trimmed = sub.trim();
			if (trimmed.startsWith('{{') || trimmed.startsWith('#')) continue;
			const m = trimmed.match(/^(address|type|decode|encoding):\s*(\S+)\s*(?:#\s*(.*))?$/);
			if (!m) continue;
			const key = m[1];
			const val = m[2];
			if (key === 'address') {
				address = val.startsWith('0x') ? Number.parseInt(val.slice(2), 16) : Number.parseInt(val, 10);
				if (m[3]) comment = m[3].trim();
			} else if (key === 'type') {
				if (val === 'input') fn = 'input';
				else if (val === 'holding') fn = 'holding';
				else if (val === 'coil') fn = 'coil';
				else if (val === 'discrete') fn = 'discrete';
			} else if (key === 'decode' || key === 'encoding') {
				decode = val;
			}
		}
		if (Number.isFinite(address) && fn) {
			out.push({
				section: currentSection,
				address: address!,
				function: fn,
				decode: decode ?? 'uint16',
				comment
			});
		}
	}
	return out;
}

/** Détecte si un render YAML evcc est exploitable côté Modbus pur. */
export function isCustomModbusRender(render: string | undefined): boolean {
	if (!render) return false;
	const head = render.split('\n').slice(0, 3).join(' ');
	if (!/type:\s*custom\b/.test(head)) return false;
	// Filtre supplémentaire : doit contenir au moins un `register:` Modbus.
	return /\n\s+register:\s*\n/.test(render);
}

export function parseEvccTemplate(
	yaml: EvccTemplate,
	source: 'meter' | 'charger',
	upstreamSha: string
): ModbusDevice | null {
	if (!yaml.template || !yaml.render) return null;
	if (!isCustomModbusRender(yaml.render)) return null;
	const product = yaml.products?.[0];
	const vendor = product?.brand?.trim();
	if (!vendor) return null;
	const model = product?.description?.generic?.trim() ?? yaml.template;

	const extracted = parseEvccRender(yaml.render);
	if (extracted.length === 0) return null;

	const seen = new Set<string>();
	const registers: ModbusRegister[] = [];
	for (const r of extracted) {
		const key = `${r.function}:${r.address}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const { dataType, size } = DECODE_MAP[r.decode] ?? { dataType: 'uint16' as ModbusDataType, size: 1 };
		const sectionInfo = SECTION_LABELS[r.section];
		registers.push({
			address: r.address,
			function: r.function,
			name: r.section,
			label: sectionInfo?.label,
			dataType,
			size,
			unit: sectionInfo?.unit,
			access: 'r',
			notes: r.comment ? r.comment : undefined
		});
	}
	registers.sort((a, b) => a.address - b.address);

	const vendorSlug = slugify(vendor);
	const modelSlug = slugify(model);

	const equipmentType: EquipmentType =
		source === 'charger'
			? 'wallbox'
			: inferEquipmentType({
					vendor,
					model,
					description: yaml.template,
					registerNames: registers.map((r) => r.name)
				});

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
			source: 'evcc',
			ref: upstreamSha,
			needsReview: true,
			reviewReasons: [
				"Tables Modbus extraites du template evcc — registres limités à ceux exposés en lecture par evcc, la doc constructeur peut en lister d'autres."
			]
		}
	};
}
