// Parse les YAML de TCzerny/ha-modbus-manager (MIT).
//
// Format observé sur solvis_sc3.yaml et autres :
//   manufacturer: "..."
//   model: "..."
//   sensors:               # liste, read-only
//     - name: "..."
//       address: N
//       input_type: input | holding
//       data_type: uint16 | int16 | float | ...
//       unit_of_measurement: "..."   (optionnel)
//       scale | precision            (selon)
//   controls:              # liste, read-write
//     - name: "..."
//       address: N
//       input_type: holding
//       ...

import { inferEquipmentType, slugify } from './normalize.ts';
import type {
	ModbusAccess,
	ModbusDataType,
	ModbusDevice,
	ModbusFunction,
	ModbusRegister
} from '../../../src/lib/tools/modbus/types.ts';

interface HaMmEntry {
	name?: string;
	unique_id?: string;
	address?: number;
	input_type?: string;
	data_type?: string;
	unit_of_measurement?: string;
	scale?: number;
	multiplier?: number;
	precision?: number;
	signed?: boolean;
	bits?: number;
	icon?: string;
	mm_group?: string;
}

interface HaMmFile {
	manufacturer?: string;
	model?: string;
	name?: string;
	sensors?: HaMmEntry[];
	controls?: HaMmEntry[];
	[k: string]: unknown;
}

const DATA_TYPE_MAP: Record<string, { dataType: ModbusDataType; size: number }> = {
	uint16: { dataType: 'uint16', size: 1 },
	int16: { dataType: 'int16', size: 1 },
	uint32: { dataType: 'uint32', size: 2 },
	int32: { dataType: 'int32', size: 2 },
	uint64: { dataType: 'uint64', size: 4 },
	int64: { dataType: 'int64', size: 4 },
	float: { dataType: 'float32', size: 2 },
	float32: { dataType: 'float32', size: 2 },
	float64: { dataType: 'float64', size: 4 },
	double: { dataType: 'float64', size: 4 },
	string: { dataType: 'string', size: 1 },
	boolean: { dataType: 'bool', size: 1 }
};

function mapDataType(raw: string | undefined): { dataType: ModbusDataType; size: number } {
	if (!raw) return { dataType: 'uint16', size: 1 };
	return DATA_TYPE_MAP[raw.toLowerCase()] ?? { dataType: 'uint16', size: 1 };
}

function mapFunction(inputType: string | undefined): ModbusFunction {
	const s = (inputType ?? '').toLowerCase();
	if (s === 'input') return 'input';
	if (s === 'coil') return 'coil';
	if (s === 'discrete' || s === 'discrete_input') return 'discrete';
	return 'holding';
}

function entryToRegister(e: HaMmEntry, access: ModbusAccess): ModbusRegister | null {
	if (typeof e.address !== 'number') return null;
	const { dataType, size } = mapDataType(e.data_type);
	return {
		address: e.address,
		function: mapFunction(e.input_type),
		name: e.unique_id ?? e.name ?? `register_${e.address}`,
		label: e.name && e.name !== e.unique_id ? e.name : undefined,
		dataType,
		size,
		scale: e.scale ?? e.multiplier,
		unit: e.unit_of_measurement,
		access
	};
}

export function parseHaModbusManager(yaml: HaMmFile, upstreamSha: string): ModbusDevice | null {
	const vendor = yaml.manufacturer?.trim();
	const model = yaml.model?.trim();
	if (!vendor || !model) return null;

	const registers: ModbusRegister[] = [];
	const registerNames: string[] = [];

	for (const e of yaml.sensors ?? []) {
		const r = entryToRegister(e, 'r');
		if (r) {
			registers.push(r);
			registerNames.push(r.name);
		}
	}
	for (const e of yaml.controls ?? []) {
		const r = entryToRegister(e, 'rw');
		if (r) {
			registers.push(r);
			registerNames.push(r.name);
		}
	}

	registers.sort((a, b) => a.address - b.address);
	if (registers.length === 0) return null;

	const vendorSlug = slugify(vendor);
	const modelSlug = slugify(model);
	const equipmentType = inferEquipmentType({
		vendor,
		model,
		description: yaml.name,
		registerNames
	});

	const hasMulti = registers.some((r) => r.size > 1);
	const reviewReasons: string[] = [];
	if (hasMulti) reviewReasons.push("Ordre d'octets non spécifié — défaut AB-CD, vérifier sur datasheet");

	return {
		slug: `${vendorSlug}-${modelSlug}`,
		vendor,
		vendorSlug,
		model,
		modelSlug,
		name: yaml.name ?? `${vendor} ${model}`,
		equipmentType,
		transport: ['rtu', 'tcp'],
		defaults: {},
		registers,
		upstream: {
			source: 'ha-modbus-manager',
			ref: upstreamSha,
			needsReview: reviewReasons.length > 0,
			reviewReasons: reviewReasons.length > 0 ? reviewReasons : undefined
		}
	};
}
