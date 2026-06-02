// Parse fucm/python-stiebel-eltron (MIT).
//
// Format Python (pystiebeleltron/pystiebeleltron.py) :
//   B1_REGMAP_INPUT = {
//       'ACTUAL_ROOM_TEMPERATURE_HC1': {'addr': 0, 'type': 2, 'value': 0},
//       ...
//   }
//   B2_REGMAP_HOLDING = { ... }
//   ...
//
// Conventions Stiebel/Tecalor ISG (cf. PDF Bedienungsanleitung) :
//   type 2 = signed int16, scale 0.1, signé
//   type 6 = uint16, scale 1
//   type 7 = signed int16, scale 0.01
//   type 8 = uint8 (range 0-255)
// Voir bloc commentaire en tête du fichier source.

import type { ModbusDataType, ModbusDevice, ModbusRegister } from '../../../src/lib/tools/modbus/types.ts';
import { extractBalancedBlock, pythonLiteralToJson } from './normalize.ts';

interface PySEEntry {
	addr: number;
	type: number;
	value?: number;
	min?: number;
	max?: number;
	multiplicator?: number;
}

const TYPE_MAP: Record<number, { dataType: ModbusDataType; scale?: number }> = {
	2: { dataType: 'int16', scale: 0.1 },
	6: { dataType: 'uint16' },
	7: { dataType: 'int16', scale: 0.01 },
	8: { dataType: 'uint16' } // doc dit uint8 mais Modbus pousse en uint16 (le high byte est 0)
};

const REGMAP_RE = /([A-Z]+\d*_REGMAP_(INPUT|HOLDING))\s*=\s*/g;

export function parsePyStiebelEltron(source: string, upstreamSha: string): ModbusDevice | null {
	const registers: ModbusRegister[] = [];
	const seenAddr = new Set<string>();

	REGMAP_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = REGMAP_RE.exec(source)) !== null) {
		const kind = match[2]; // INPUT | HOLDING
		const fn = kind === 'INPUT' ? 'input' : 'holding';
		// On repart de l'index du match pour extractBalancedBlock.
		const slice = source.slice(match.index);
		const dictText = extractBalancedBlock(slice, new RegExp(match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=\\s*'));
		if (!dictText) continue;

		let data: Record<string, PySEEntry>;
		try {
			data = JSON.parse(pythonLiteralToJson(dictText));
		} catch {
			continue;
		}
		for (const [name, e] of Object.entries(data)) {
			if (!e || typeof e.addr !== 'number') continue;
			const dedupKey = `${fn}:${e.addr}`;
			if (seenAddr.has(dedupKey)) continue;
			seenAddr.add(dedupKey);

			const mapped = TYPE_MAP[e.type] ?? { dataType: 'uint16' as ModbusDataType };
			registers.push({
				address: e.addr,
				function: fn,
				name: name.toLowerCase(),
				dataType: mapped.dataType,
				size: 1,
				scale: mapped.scale,
				access: fn === 'holding' ? 'rw' : 'r'
			});
		}
	}

	registers.sort((a, b) => a.address - b.address);
	if (registers.length === 0) return null;

	return {
		slug: 'stiebel-eltron-isg',
		vendor: 'Stiebel Eltron',
		vendorSlug: 'stiebel-eltron',
		model: 'ISG (WPM/LWZ)',
		modelSlug: 'isg',
		name: 'Stiebel Eltron ISG (WPM / LWZ)',
		equipmentType: 'pac',
		transport: ['tcp'],
		defaults: { tcp: { port: 502, unitIdDefault: 1 } },
		registers,
		doc: "Passerelle ISG Web pour PAC Stiebel Eltron WPM / LWZ (et Tecalor TTL/TTE). Tables Modbus extraites de fucm/python-stiebel-eltron (MIT), conformes au PDF officiel 'ISG Modbus Bedienungsanleitung'.",
		datasheets: [
			{
				label: 'ISG Modbus — Bedienungsanleitung (officiel Stiebel)',
				url: 'https://www.stiebel-eltron.de/content/dam/ste/de/de/home/services/Downloadlisten/ISG%20Modbus_Stiebel_Bedienungsanleitung.pdf'
			}
		],
		upstream: {
			source: 'stiebel-eltron',
			ref: upstreamSha,
			needsReview: true,
			reviewReasons: ['Plusieurs modèles (WPM, LWZ, …) partagent ces registres. Vérifier la disponibilité de chaque registre selon votre modèle exact.']
		}
	};
}
