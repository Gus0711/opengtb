import type { CodecOutput } from './types';

/**
 * Décodeur Cayenne LPP (myDevices / LoRa Alliance).
 *
 * Format : suite de tuples [channel (1 byte) | type (1 byte) | value (N bytes)].
 * Référence standard : https://github.com/myDevicesIoT/cayenne-docs/blob/master/docs/LORA.md
 *
 * Couvre les 13 types standard myDevices + 7 types fréquemment rencontrés
 * dans les extensions vendeur (codes >= 0x76). Ces extensions ne sont PAS
 * normées : si votre device utilise un mapping différent, le décodage
 * échouera sur un type inconnu — il faudra alors préférer le codec TTN
 * dédié au device. Les codes choisis ici suivent les conventions les plus
 * répandues (Electronic Cats CayenneLPP, ARM Mbed).
 *
 * Cas non couverts : Polyline, Color RGB, codecs vendor exotiques.
 */

interface LppType {
	name: string;
	size: number;
	unit?: string;
	parse: (bytes: number[], offset: number) => number | Record<string, number>;
}

function readInt16BE(bytes: number[], offset: number): number {
	const v = (bytes[offset] << 8) | bytes[offset + 1];
	return v >= 0x8000 ? v - 0x10000 : v;
}

function readUInt16BE(bytes: number[], offset: number): number {
	return (bytes[offset] << 8) | bytes[offset + 1];
}

function readInt24BE(bytes: number[], offset: number): number {
	const v = (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
	return v >= 0x800000 ? v - 0x1000000 : v;
}

function readUInt32BE(bytes: number[], offset: number): number {
	return (
		bytes[offset] * 0x1000000 +
		((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
	);
}

const LPP_TYPES: Record<number, LppType> = {
	0x00: {
		name: 'digital_input',
		size: 1,
		parse: (b, o) => b[o]
	},
	0x01: {
		name: 'digital_output',
		size: 1,
		parse: (b, o) => b[o]
	},
	0x02: {
		name: 'analog_input',
		size: 2,
		parse: (b, o) => readInt16BE(b, o) / 100
	},
	0x03: {
		name: 'analog_output',
		size: 2,
		parse: (b, o) => readInt16BE(b, o) / 100
	},
	0x65: {
		name: 'illuminance',
		size: 2,
		unit: 'lx',
		parse: (b, o) => readUInt16BE(b, o)
	},
	0x66: {
		name: 'presence',
		size: 1,
		parse: (b, o) => b[o]
	},
	0x67: {
		name: 'temperature',
		size: 2,
		unit: '°C',
		parse: (b, o) => readInt16BE(b, o) / 10
	},
	0x68: {
		name: 'humidity',
		size: 1,
		unit: '%',
		parse: (b, o) => b[o] / 2
	},
	0x71: {
		name: 'accelerometer',
		size: 6,
		unit: 'G',
		parse: (b, o) => ({
			x: readInt16BE(b, o) / 1000,
			y: readInt16BE(b, o + 2) / 1000,
			z: readInt16BE(b, o + 4) / 1000
		})
	},
	0x73: {
		name: 'barometer',
		size: 2,
		unit: 'hPa',
		parse: (b, o) => readUInt16BE(b, o) / 10
	},
	0x86: {
		name: 'gyrometer',
		size: 6,
		unit: '°/s',
		parse: (b, o) => ({
			x: readInt16BE(b, o) / 100,
			y: readInt16BE(b, o + 2) / 100,
			z: readInt16BE(b, o + 4) / 100
		})
	},
	0x88: {
		name: 'gps',
		size: 9,
		parse: (b, o) => ({
			latitude: readInt24BE(b, o) / 10000,
			longitude: readInt24BE(b, o + 3) / 10000,
			altitude_m: readInt24BE(b, o + 6) / 100
		})
	},
	0x70: {
		name: 'unix_time',
		size: 4,
		unit: 's',
		parse: (b, o) => readUInt32BE(b, o)
	},
	0x74: {
		name: 'voltage',
		size: 2,
		unit: 'V',
		parse: (b, o) => readUInt16BE(b, o) / 100
	},
	0x78: {
		name: 'current',
		size: 2,
		unit: 'A',
		parse: (b, o) => readUInt16BE(b, o) / 1000
	},
	// — Extensions communes (hors spec myDevices stricte) ———————————————
	0x76: {
		name: 'generic_uint32',
		size: 4,
		parse: (b, o) => readUInt32BE(b, o)
	},
	0x7e: {
		name: 'switch',
		size: 1,
		parse: (b, o) => b[o]
	},
	0x7f: {
		name: 'concentration',
		size: 2,
		unit: 'ppm',
		parse: (b, o) => readUInt16BE(b, o)
	},
	0x80: {
		name: 'power',
		size: 2,
		unit: 'W',
		parse: (b, o) => readUInt16BE(b, o)
	},
	0x81: {
		name: 'energy',
		size: 4,
		unit: 'kWh',
		parse: (b, o) => readUInt32BE(b, o) / 1000
	},
	0x82: {
		name: 'frequency',
		size: 4,
		unit: 'Hz',
		parse: (b, o) => readUInt32BE(b, o)
	},
	0x83: {
		name: 'percentage',
		size: 1,
		unit: '%',
		parse: (b, o) => b[o]
	}
};

export function decodeCayenneLPP(input: { bytes: number[]; fPort: number }): CodecOutput {
	const data: Record<string, unknown> = {};
	const errors: string[] = [];
	const warnings: string[] = [];

	let i = 0;
	while (i < input.bytes.length) {
		if (i + 2 > input.bytes.length) {
			errors.push(`Trame Cayenne LPP tronquée à l'offset ${i} : il manque le type/value`);
			break;
		}
		const channel = input.bytes[i++];
		const type = input.bytes[i++];
		const meta = LPP_TYPES[type];
		if (!meta) {
			errors.push(
				`Type Cayenne LPP inconnu : 0x${type.toString(16).padStart(2, '0')} (channel ${channel})`
			);
			break;
		}
		if (i + meta.size > input.bytes.length) {
			errors.push(`Trame tronquée pour type "${meta.name}" (channel ${channel})`);
			break;
		}
		const raw = meta.parse(input.bytes, i);
		i += meta.size;
		const key = `ch${channel}_${meta.name}`;
		if (typeof raw === 'number' && meta.unit) {
			data[key] = { value: raw, unit: meta.unit };
		} else {
			data[key] = raw;
		}
	}

	return { data, warnings, errors };
}
