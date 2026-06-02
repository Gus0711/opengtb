// Parse les drivers Go de volkszaehler/mbmd/meters/rs485/*.go vers le schéma opengtb.
//
// mbmd : BSD-3-Clause. Format ultra régulier :
//   - `Register("DEVICE", NewXxxProducer)` — identifiant
//   - `func (p *XxxProducer) Description() string { return "..." }` — humain
//   - `Opcodes{ VoltageL1: 0x..., CurrentL1: 0x..., ... }` — table de registres
//
// Par défaut, mbmd lit les registres en float32 / 2 mots / holding (`snipFloat32`).
// Quelques drivers utilisent uint32/int — détectés via la fonction de lecture
// dominante dans le fichier. Pas critique pour V1 : on signale needsReview.

import type { ModbusDevice, ModbusRegister, UpstreamInfo } from '../../../src/lib/tools/modbus/types.ts';
import { slugify } from './normalize.ts';

interface MbmdDriverFile {
	filename: string;     // ex. "iem3000.go"
	source: string;       // contenu du fichier
}

interface MbmdMeasurement {
	label: string;
	unit?: string;
}

/**
 * Mapping des "Measurements" mbmd vers (label FR, unit).
 * Source : .cache/mbmd/meters/measurements.go.
 * Tout ce qui n'est pas listé reste avec son nom mbmd brut + sans unité.
 */
export const MBMD_MEASUREMENTS: Record<string, MbmdMeasurement> = {
	// Fréquence
	Frequency: { label: 'Fréquence', unit: 'Hz' },
	FrequencyL1: { label: 'Fréquence L1', unit: 'Hz' },
	FrequencyL2: { label: 'Fréquence L2', unit: 'Hz' },
	FrequencyL3: { label: 'Fréquence L3', unit: 'Hz' },
	// Tensions
	Voltage: { label: 'Tension', unit: 'V' },
	VoltageL1: { label: 'Tension L1', unit: 'V' },
	VoltageL2: { label: 'Tension L2', unit: 'V' },
	VoltageL3: { label: 'Tension L3', unit: 'V' },
	VoltageL1_L2: { label: 'Tension L1-L2', unit: 'V' },
	VoltageL2_L3: { label: 'Tension L2-L3', unit: 'V' },
	VoltageL3_L1: { label: 'Tension L3-L1', unit: 'V' },
	VoltageL_N_avg: { label: 'Tension moyenne L-N', unit: 'V' },
	VoltageL_L_avg: { label: 'Tension moyenne L-L', unit: 'V' },
	// Courants
	Current: { label: 'Courant', unit: 'A' },
	CurrentL1: { label: 'Courant L1', unit: 'A' },
	CurrentL2: { label: 'Courant L2', unit: 'A' },
	CurrentL3: { label: 'Courant L3', unit: 'A' },
	// Puissances actives
	Power: { label: 'Puissance active', unit: 'W' },
	PowerL1: { label: 'Puissance active L1', unit: 'W' },
	PowerL2: { label: 'Puissance active L2', unit: 'W' },
	PowerL3: { label: 'Puissance active L3', unit: 'W' },
	ImportPower: { label: 'Puissance importée', unit: 'W' },
	ImportPowerL1: { label: 'Puissance importée L1', unit: 'W' },
	ImportPowerL2: { label: 'Puissance importée L2', unit: 'W' },
	ImportPowerL3: { label: 'Puissance importée L3', unit: 'W' },
	ExportPower: { label: 'Puissance exportée', unit: 'W' },
	ExportPowerL1: { label: 'Puissance exportée L1', unit: 'W' },
	ExportPowerL2: { label: 'Puissance exportée L2', unit: 'W' },
	ExportPowerL3: { label: 'Puissance exportée L3', unit: 'W' },
	// Puissances réactives / apparentes
	ReactivePower: { label: 'Puissance réactive', unit: 'var' },
	ReactivePowerL1: { label: 'Puissance réactive L1', unit: 'var' },
	ReactivePowerL2: { label: 'Puissance réactive L2', unit: 'var' },
	ReactivePowerL3: { label: 'Puissance réactive L3', unit: 'var' },
	ApparentPower: { label: 'Puissance apparente', unit: 'VA' },
	ApparentPowerL1: { label: 'Puissance apparente L1', unit: 'VA' },
	ApparentPowerL2: { label: 'Puissance apparente L2', unit: 'VA' },
	ApparentPowerL3: { label: 'Puissance apparente L3', unit: 'VA' },
	// Cos phi
	Cosphi: { label: 'Cos φ' },
	CosphiL1: { label: 'Cos φ L1' },
	CosphiL2: { label: 'Cos φ L2' },
	CosphiL3: { label: 'Cos φ L3' },
	PowerFactor: { label: 'Facteur de puissance' },
	// Énergies actives (cumulées)
	Import: { label: 'Énergie active importée', unit: 'kWh' },
	ImportT1: { label: 'Énergie active importée T1', unit: 'kWh' },
	ImportT2: { label: 'Énergie active importée T2', unit: 'kWh' },
	ImportL1: { label: 'Énergie active importée L1', unit: 'kWh' },
	ImportL2: { label: 'Énergie active importée L2', unit: 'kWh' },
	ImportL3: { label: 'Énergie active importée L3', unit: 'kWh' },
	Export: { label: 'Énergie active exportée', unit: 'kWh' },
	ExportT1: { label: 'Énergie active exportée T1', unit: 'kWh' },
	ExportT2: { label: 'Énergie active exportée T2', unit: 'kWh' },
	ExportL1: { label: 'Énergie active exportée L1', unit: 'kWh' },
	ExportL2: { label: 'Énergie active exportée L2', unit: 'kWh' },
	ExportL3: { label: 'Énergie active exportée L3', unit: 'kWh' },
	// Énergies réactives
	ReactiveSum: { label: 'Énergie réactive (somme)', unit: 'kvarh' },
	ReactiveImport: { label: 'Énergie réactive importée', unit: 'kvarh' },
	ReactiveExport: { label: 'Énergie réactive exportée', unit: 'kvarh' },
	// DC (onduleurs)
	DCCurrent: { label: 'Courant DC', unit: 'A' },
	DCVoltage: { label: 'Tension DC', unit: 'V' },
	DCPower: { label: 'Puissance DC', unit: 'W' },
	DCCurrentS1: { label: 'Courant DC string 1', unit: 'A' },
	DCVoltageS1: { label: 'Tension DC string 1', unit: 'V' },
	DCPowerS1: { label: 'Puissance DC string 1', unit: 'W' },
	DCCurrentS2: { label: 'Courant DC string 2', unit: 'A' },
	DCVoltageS2: { label: 'Tension DC string 2', unit: 'V' },
	DCPowerS2: { label: 'Puissance DC string 2', unit: 'W' },
	// THD
	THD: { label: 'THD courant', unit: '%' },
	THDL1: { label: 'THD courant L1', unit: '%' },
	THDL2: { label: 'THD courant L2', unit: '%' },
	THDL3: { label: 'THD courant L3', unit: '%' },
	VoltageTHD: { label: 'THD tension', unit: '%' },
	VoltageTHDL1: { label: 'THD tension L1', unit: '%' },
	VoltageTHDL2: { label: 'THD tension L2', unit: '%' },
	VoltageTHDL3: { label: 'THD tension L3', unit: '%' },
	// Temps de fonctionnement
	HourOfUse: { label: "Heures d'utilisation", unit: 'h' }
};

/** Mapping filename → vendor / model affichés. Pas de fallback magique : seuls les drivers listés sont importés. */
export const MBMD_DRIVERS: Record<string, { vendor: string; model: string; equipment: 'compteur-elec' | 'onduleur-pv' }> = {
	'iem3000.go': { vendor: 'Schneider Electric', model: 'iEM3000', equipment: 'compteur-elec' },
	'pac2200.go': { vendor: 'Siemens', model: 'PAC2200', equipment: 'compteur-elec' },
	'janitza.go': { vendor: 'Janitza', model: 'UMG series', equipment: 'compteur-elec' },
	'abb.go': { vendor: 'ABB', model: 'A/B-Series', equipment: 'compteur-elec' },
	'carlogavazzi-em24.go': { vendor: 'Carlo Gavazzi', model: 'EM24', equipment: 'compteur-elec' },
	'carlogavazzi-em24_e1.go': { vendor: 'Carlo Gavazzi', model: 'EM24 E1', equipment: 'compteur-elec' },
	'carlogavazzi-ex3x0.go': { vendor: 'Carlo Gavazzi', model: 'EX3x0', equipment: 'compteur-elec' },
	'sdm.go': { vendor: 'Eastron', model: 'SDM', equipment: 'compteur-elec' },
	'sdm230.go': { vendor: 'Eastron', model: 'SDM230', equipment: 'compteur-elec' },
	'sdm72.go': { vendor: 'Eastron', model: 'SDM72', equipment: 'compteur-elec' },
	'sdm72mv2.go': { vendor: 'Eastron', model: 'SDM72 M-V2', equipment: 'compteur-elec' },
	'sdm630.go': { vendor: 'Eastron', model: 'SDM630', equipment: 'compteur-elec' },
	'finder7m24.go': { vendor: 'Finder', model: '7M.24', equipment: 'compteur-elec' },
	'finder7m38.go': { vendor: 'Finder', model: '7M.38', equipment: 'compteur-elec' },
	'inepro.go': { vendor: 'Inepro', model: 'PRO380', equipment: 'compteur-elec' },
	'orno1p.go': { vendor: 'Orno', model: 'WE-514/515 (1P)', equipment: 'compteur-elec' },
	'orno1p504.go': { vendor: 'Orno', model: 'OR-WE-504 (1P)', equipment: 'compteur-elec' },
	'orno1p525.go': { vendor: 'Orno', model: 'OR-WE-525 (1P)', equipment: 'compteur-elec' },
	'orno3p.go': { vendor: 'Orno', model: 'WE-516 (3P)', equipment: 'compteur-elec' },
	'sbc.go': { vendor: 'Saia Burgess Controls', model: 'ALD/ALE/AWD', equipment: 'compteur-elec' },
	'mpm3pm.go': { vendor: 'IME', model: 'MPM3PM', equipment: 'compteur-elec' },
	'ddm18sd.go': { vendor: 'Hiking', model: 'DDM18SD', equipment: 'compteur-elec' },
	'ds100.go': { vendor: 'BG-Tech', model: 'DS100', equipment: 'compteur-elec' },
	'dmg610.go': { vendor: 'Lovato', model: 'DMG610', equipment: 'compteur-elec' },
	'dtsu666.go': { vendor: 'CHINT', model: 'DTSU666', equipment: 'compteur-elec' },
	'dzg.go': { vendor: 'DZG', model: 'DVH4013', equipment: 'compteur-elec' }
};

const OPCODES_RE = /Opcodes\{([\s\S]*?)\n\s*\}/;
const OPCODE_LINE_RE = /([A-Za-z][A-Za-z0-9_]*)\s*:\s*0x([0-9A-Fa-f]+)/g;
const REGISTER_RE = /Register\(\s*"([^"]+)"/;
const DESCRIPTION_RE = /Description\(\)[^{]*\{\s*return\s+"([^"]+)"/;

/**
 * Détecte si le driver utilise majoritairement uint32/int32 plutôt que float32.
 * Pas exhaustif : `snipFloat32` est le défaut, on ne renvoie un signal que si
 * on voit explicitement des appels à `snipUint32`/`snipInt`/`snipMeasurement`
 * dominants.
 */
function inferDataType(source: string): { dataType: 'float32' | 'uint32' | 'int32'; size: number } {
	const float = (source.match(/snipFloat32/g) ?? []).length;
	const uint = (source.match(/snipUint32/g) ?? []).length;
	const int = (source.match(/snipInt/g) ?? []).length;
	if (uint > float && uint > int) return { dataType: 'uint32', size: 2 };
	if (int > float && int > uint) return { dataType: 'int32', size: 2 };
	return { dataType: 'float32', size: 2 };
}

/**
 * Détecte le type de fonction Modbus utilisée. `ReadHoldingReg` (FC 3) est le
 * défaut côté mbmd ; `ReadInputReg` (FC 4) est utilisé par certains drivers.
 */
function inferFunction(source: string): 'holding' | 'input' {
	const holding = (source.match(/ReadHoldingReg/g) ?? []).length;
	const input = (source.match(/ReadInputReg/g) ?? []).length;
	return input > holding ? 'input' : 'holding';
}

export function parseMbmdDriver(file: MbmdDriverFile, upstreamSha: string): ModbusDevice | null {
	const meta = MBMD_DRIVERS[file.filename];
	if (!meta) return null;

	const opcodesMatch = file.source.match(OPCODES_RE);
	if (!opcodesMatch) return null;

	const registerMatch = file.source.match(REGISTER_RE);
	const descMatch = file.source.match(DESCRIPTION_RE);
	const driverName = registerMatch?.[1] ?? meta.model;
	const description = descMatch?.[1] ?? `${meta.vendor} ${meta.model}`;

	const { dataType, size } = inferDataType(file.source);
	const fn = inferFunction(file.source);

	const registers: ModbusRegister[] = [];
	const seen = new Set<number>();
	OPCODE_LINE_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = OPCODE_LINE_RE.exec(opcodesMatch[1])) !== null) {
		const measurement = m[1];
		const address = Number.parseInt(m[2], 16);
		if (!Number.isFinite(address) || seen.has(address)) continue;
		seen.add(address);
		const info = MBMD_MEASUREMENTS[measurement];
		registers.push({
			address,
			function: fn,
			name: measurement,
			label: info?.label,
			dataType,
			size,
			unit: info?.unit,
			access: 'r'
		});
	}
	registers.sort((a, b) => a.address - b.address);
	if (registers.length === 0) return null;

	const vendorSlug = slugify(meta.vendor);
	const modelSlug = slugify(meta.model);

	const reviewReasons = [
		`Type ${dataType} et ordre AB-CD supposés (convention mbmd). Vérifier sur la datasheet ${driverName}.`
	];

	const upstream: UpstreamInfo = {
		source: 'mbmd',
		ref: upstreamSha,
		needsReview: true,
		reviewReasons
	};

	return {
		slug: `${vendorSlug}-${modelSlug}`,
		vendor: meta.vendor,
		vendorSlug,
		model: meta.model,
		modelSlug,
		name: `${meta.vendor} ${meta.model}`,
		equipmentType: meta.equipment,
		transport: ['rtu', 'tcp'],
		defaults: {},
		registers,
		doc: `Importé depuis volkszaehler/mbmd (BSD-3-Clause). Description amont : ${description}.`,
		upstream
	};
}
