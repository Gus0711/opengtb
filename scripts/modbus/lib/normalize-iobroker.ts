// Parse les fichiers TSV de ioBroker/modbus-templates (MIT).
//
// Format : 1 ligne d'entête + N lignes registres.
//   _address  name  description  unit  type        len  factor  offset  formula  role  room  poll  wp  cw  isScale
//   40002     ID_Code  ID-Code   …     uint32be    2    1       0       …        …     …     …     …     …    …
//
// Conventions :
//   - _address respecte la notation Modicon : 4xxxx = holding (FC 3),
//     3xxxx = input (FC 4), 1xxxx = discrete (FC 2), 0xxxx = coil (FC 1).
//   - Le filename peut indiquer le type (`holding-registers.tsv`,
//     `input-registers.tsv`, `coils.tsv`) ; sinon on déduit de _address.
//   - `wp` = writeable. true → access rw, false → r.

import { slugify } from './normalize.ts';
import type {
	EquipmentType,
	ModbusDataType,
	ModbusDevice,
	ModbusFunction,
	ModbusRegister
} from '../../../src/lib/tools/modbus/types.ts';

const TYPE_MAP: Record<string, { dataType: ModbusDataType; size: number }> = {
	int16be: { dataType: 'int16', size: 1 },
	int16le: { dataType: 'int16', size: 1 },
	uint16be: { dataType: 'uint16', size: 1 },
	uint16le: { dataType: 'uint16', size: 1 },
	int32be: { dataType: 'int32', size: 2 },
	int32le: { dataType: 'int32', size: 2 },
	uint32be: { dataType: 'uint32', size: 2 },
	uint32le: { dataType: 'uint32', size: 2 },
	int64be: { dataType: 'int64', size: 4 },
	uint64be: { dataType: 'uint64', size: 4 },
	float32be: { dataType: 'float32', size: 2 },
	float32le: { dataType: 'float32', size: 2 },
	float64be: { dataType: 'float64', size: 4 },
	string: { dataType: 'string', size: 1 }
};

/** Cat dossier ioBroker → equipmentType opengtb. */
const CATEGORY_MAP: Record<string, EquipmentType> = {
	Lueftungsanlagen: 'vmc',
	Heizungsanlagen: 'pac', // par défaut PAC ; surchargé si "Kessel"/"chaudière" dans le model
	'PV-Wechselrichter': 'onduleur-pv',
	Energiezaehler: 'compteur-elec',
	Wallbox: 'wallbox'
};

export interface IobrokerTsvFile {
	/** Catégorie ioBroker (premier sous-dossier). */
	category: string;
	vendor: string;
	model: string;
	filename: string;
	content: string;
}

function inferFunction(address: number, filename: string): ModbusFunction {
	const lower = filename.toLowerCase();
	if (lower.includes('holding')) return 'holding';
	if (lower.includes('input') || lower.includes('eingang')) return 'input';
	if (lower.includes('coil')) return 'coil';
	if (lower.includes('discrete')) return 'discrete';
	// Fallback selon convention Modicon.
	if (address >= 40000) return 'holding';
	if (address >= 30000) return 'input';
	if (address >= 10000) return 'discrete';
	return 'coil';
}

function parseTsvLine(line: string): Record<string, string> | null {
	const cells = line.split('\t');
	if (cells.length < 5) return null;
	return {
		_address: cells[0] ?? '',
		name: cells[1] ?? '',
		description: cells[2] ?? '',
		unit: cells[3] ?? '',
		type: cells[4] ?? '',
		len: cells[5] ?? '',
		factor: cells[6] ?? '',
		offset: cells[7] ?? '',
		role: cells[9] ?? '',
		wp: cells[12] ?? ''
	};
}

/** Convertit une ou plusieurs fichiers TSV partageant (vendor, model) en un ModbusDevice. */
export function parseIobrokerDevice(files: IobrokerTsvFile[], upstreamSha: string): ModbusDevice | null {
	if (files.length === 0) return null;
	const { category, vendor, model } = files[0];

	const registers: ModbusRegister[] = [];
	const seen = new Set<string>();
	for (const file of files) {
		const lines = file.content.split(/\r?\n/);
		if (lines.length < 2) continue;
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i];
			if (!line.trim()) continue;
			const row = parseTsvLine(line);
			if (!row) continue;
			const address = Number.parseInt(row._address, 10);
			if (!Number.isFinite(address)) continue;
			const fn = inferFunction(address, file.filename);
			const dedup = `${fn}:${address}`;
			if (seen.has(dedup)) continue;
			seen.add(dedup);
			const mapped = TYPE_MAP[row.type.toLowerCase()] ?? { dataType: 'uint16' as ModbusDataType, size: 1 };
			const len = Number.parseInt(row.len, 10);
			const size = Number.isFinite(len) && len > 0 ? len : mapped.size;
			const factor = Number.parseFloat(row.factor);
			const offset = Number.parseFloat(row.offset);
			const writable = row.wp.toLowerCase() === 'true' && (fn === 'holding' || fn === 'coil');

			registers.push({
				address,
				function: fn,
				name: row.name || `register_${address}`,
				label: row.description && row.description !== row.name ? row.description : undefined,
				dataType: mapped.dataType,
				size,
				scale: Number.isFinite(factor) && factor !== 1 ? factor : undefined,
				offset: Number.isFinite(offset) && offset !== 0 ? offset : undefined,
				unit: row.unit || undefined,
				access: writable ? 'rw' : 'r'
			});
		}
	}
	registers.sort((a, b) => a.address - b.address);
	if (registers.length === 0) return null;

	const vendorSlug = slugify(vendor);
	const modelSlug = slugify(model);
	let equipmentType: EquipmentType = CATEGORY_MAP[category] ?? 'autre';
	// Affinage chaudière vs PAC sous Heizungsanlagen.
	if (equipmentType === 'pac' && /kessel|brenner|chaudi|boiler|pellet/i.test(model)) {
		equipmentType = 'chaudiere';
	}

	const name = vendor.toLowerCase() === model.toLowerCase() ? vendor : `${vendor} ${model}`;

	return {
		slug: `${vendorSlug}-${modelSlug}`,
		vendor,
		vendorSlug,
		model,
		modelSlug,
		name,
		equipmentType,
		transport: ['rtu', 'tcp'],
		defaults: {},
		registers,
		upstream: {
			source: 'iobroker',
			ref: upstreamSha,
			needsReview: true,
			reviewReasons: [
				"Source : ioBroker/modbus-templates. Vérifier l'ordre des octets et le sens du facteur sur datasheet."
			]
		}
	};
}
