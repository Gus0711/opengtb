import { describe, expect, test } from 'vitest';
import {
	accessFromCodes,
	applyOverride,
	createDeviceFromOverride,
	dataTypeFromJibri,
	functionFromCodes,
	inferEquipmentType,
	isSuspectSourceUrl,
	normalizeHa,
	normalizeJibri,
	slugify
} from './normalize.ts';

describe('slugify', () => {
	test('ASCII safe lowercase kebab', () => {
		expect(slugify('Eastron SDM-630')).toBe('eastron-sdm-630');
	});
	test('strips diacritics', () => {
		expect(slugify('Fröling BWP300PV')).toBe('froling-bwp300pv');
	});
	test('collapses non-alphanum', () => {
		expect(slugify('Wago 750 / 352')).toBe('wago-750-352');
	});
});

describe('functionFromCodes', () => {
	test('code 3 → holding', () => expect(functionFromCodes([3])).toBe('holding'));
	test('code 4 → input', () => expect(functionFromCodes([4])).toBe('input'));
	test('code 1 → coil', () => expect(functionFromCodes([1])).toBe('coil'));
	test('code 2 → discrete', () => expect(functionFromCodes([2])).toBe('discrete'));
	test('prefers read code when read+write mixed', () => {
		expect(functionFromCodes([3, 6])).toBe('holding');
		expect(functionFromCodes([6, 3])).toBe('holding');
	});
	test('fallback holding sur input vide', () => expect(functionFromCodes([])).toBe('holding'));
});

describe('accessFromCodes', () => {
	test('upstream read/write a priorité', () => {
		expect(accessFromCodes([3], 'read/write')).toBe('rw');
	});
	test('read seul', () => expect(accessFromCodes([3])).toBe('r'));
	test('write seul', () => expect(accessFromCodes([6])).toBe('w'));
	test('read+write', () => expect(accessFromCodes([3, 16])).toBe('rw'));
});

describe('dataTypeFromJibri', () => {
	test('float → float32 size 2', () => {
		expect(dataTypeFromJibri('float')).toEqual({ dataType: 'float32', size: 2 });
	});
	test('double → float64 size 4', () => {
		expect(dataTypeFromJibri('double')).toEqual({ dataType: 'float64', size: 4 });
	});
	test('int16 → size 1', () => {
		expect(dataTypeFromJibri('int16')).toEqual({ dataType: 'int16', size: 1 });
	});
	test('int32 → size 2', () => {
		expect(dataTypeFromJibri('int32')).toEqual({ dataType: 'int32', size: 2 });
	});
	test('boolean → bool', () => {
		expect(dataTypeFromJibri('boolean')).toEqual({ dataType: 'bool', size: 1 });
	});
	test('respecte size hint amont si fourni', () => {
		expect(dataTypeFromJibri('uint16', 4)).toEqual({ dataType: 'uint16', size: 4 });
	});
	test('fallback sur type inconnu', () => {
		const r = dataTypeFromJibri('exotique', 1);
		expect(r.dataType).toBe('uint16');
	});
});

describe('isSuspectSourceUrl', () => {
	test('aggsoft tuto → suspect', () => {
		expect(isSuspectSourceUrl('https://www.aggsoft.com/serial-data-logger/tutorials/foo.htm')).toBe(true);
	});
	test('datasheet constructeur → propre', () => {
		expect(isSuspectSourceUrl('https://www.eastron.co.uk/files/SDM630.pdf')).toBe(false);
	});
	test('forum → suspect', () => {
		expect(isSuspectSourceUrl('https://forum.example.com/topic/123')).toBe(true);
	});
	test('undefined → propre', () => {
		expect(isSuspectSourceUrl(undefined)).toBe(false);
	});
});

describe('inferEquipmentType', () => {
	test('SDM630 → compteur-elec', () => {
		expect(inferEquipmentType({ vendor: 'Eastron', model: 'SDM630' })).toBe('compteur-elec');
	});
	test('Fronius inverter → onduleur-pv', () => {
		expect(inferEquipmentType({ vendor: 'Fronius', model: 'Symo' })).toBe('onduleur-pv');
	});
	test('Dimplex SI → pac', () => {
		expect(inferEquipmentType({ vendor: 'Dimplex', model: 'SI-11TU' })).toBe('pac');
	});
	test('application=Energy Metering → compteur-elec si pas matché par needles', () => {
		expect(
			inferEquipmentType({ vendor: 'Unknown', model: 'X', application: 'Energy Metering' })
		).toBe('compteur-elec');
	});
	test('aucun match → autre', () => {
		expect(inferEquipmentType({ vendor: 'Inconnu', model: 'YZ' })).toBe('autre');
	});
});

describe('normalizeJibri', () => {
	test('Eastron SDM630 — mapping minimal', () => {
		const out = normalizeJibri({
			metadata: {
				manufacturer: 'eastron',
				model: 'sdm630',
				url: 'https://www.aggsoft.com/serial-data-logger/tutorials/modbus-data-logging/eastron-sdm630.htm',
				tags: { industry: 'Unknown', application: 'Unknown' }
			},
			registers: {
				'0': {
					name: 'Phase-1-line-to-neutral-volts',
					description: 'Phase-1-line-to-neutral-volts',
					function_codes: [3],
					data_type: 'float',
					unit: 'Volts',
					access: 'read'
				}
			},
			upstreamSha: 'abc123'
		});

		expect(out.slug).toBe('eastron-sdm630');
		expect(out.vendor).toBe('eastron');
		expect(out.equipmentType).toBe('compteur-elec');
		expect(out.registers).toHaveLength(1);
		expect(out.registers[0]).toMatchObject({
			address: 0,
			function: 'holding',
			dataType: 'float32',
			size: 2,
			unit: 'Volts',
			access: 'r'
		});
		expect(out.upstream.needsReview).toBe(true);
		// Source douteuse → datasheets ne contient pas l'URL aggsoft.
		expect(out.datasheets).toBeUndefined();
	});

	test('registres triés par adresse', () => {
		const out = normalizeJibri({
			metadata: { manufacturer: 'x', model: 'y' },
			registers: {
				'100': { name: 'b', description: '', function_codes: [3], data_type: 'uint16', access: 'read' },
				'10': { name: 'a', description: '', function_codes: [3], data_type: 'uint16', access: 'read' }
			},
			upstreamSha: 'sha'
		});
		expect(out.registers.map((r) => r.address)).toEqual([10, 100]);
	});

	test('config RTU exportée + datasheet propre', () => {
		const out = normalizeJibri({
			metadata: {
				manufacturer: 'Schneider',
				model: 'IEM3155',
				url: 'https://www.se.com/datasheet.pdf',
				connection: { RTU: { baudrate: 19200, parity: 'even', stop_bits: 1, slave_id: 1 } }
			},
			registers: {},
			upstreamSha: 'sha'
		});
		expect(out.defaults.rtu).toEqual({
			baudrate: 19200,
			parity: 'even',
			dataBits: undefined,
			stopBits: 1,
			slaveIdDefault: 1
		});
		expect(out.transport).toEqual(['rtu']);
		expect(out.datasheets).toEqual([{ label: 'Doc constructeur', url: 'https://www.se.com/datasheet.pdf' }]);
	});
});

describe('normalizeHa', () => {
	test('SDM630 HA → mapping read_only_word + read_write_word', () => {
		const out = normalizeHa({
			yaml: {
				device: { manufacturer: 'Eastron', model: 'SDM-630' },
				read_only_word: {
					'Phase 1 Voltage': {
						address: 0,
						name: 'Phase 1 Voltage',
						unit_of_measurement: 'Volts',
						precision: 2,
						float: true,
						size: 2
					}
				},
				read_write_word: {
					baud_rate: {
						name: 'Baud Rate',
						address: 28,
						size: 2,
						control: 'select',
						float: true,
						options: { 0: '2400 bps', 1: '4800 bps', 2: '9600 bps' }
					}
				}
			},
			upstreamSha: 'sha',
			filename: 'SDM630.yaml'
		});
		expect(out).not.toBeNull();
		expect(out!.vendor).toBe('Eastron');
		expect(out!.registers).toHaveLength(2);
		const v = out!.registers.find((r) => r.address === 0)!;
		expect(v.dataType).toBe('float32');
		expect(v.unit).toBe('Volts');
		expect(v.access).toBe('r');
		const baud = out!.registers.find((r) => r.address === 28)!;
		expect(baud.access).toBe('rw');
		expect(baud.enum).toEqual({ '0': '2400 bps', '1': '4800 bps', '2': '9600 bps' });
	});

	test('null si pas de manufacturer/model', () => {
		const out = normalizeHa({ yaml: {}, upstreamSha: 'sha', filename: 'x.yaml' });
		expect(out).toBeNull();
	});

	test('null si aucun registre', () => {
		const out = normalizeHa({
			yaml: { device: { manufacturer: 'X', model: 'Y' } },
			upstreamSha: 'sha',
			filename: 'x.yaml'
		});
		expect(out).toBeNull();
	});
});

describe('applyOverride', () => {
	const base = normalizeJibri({
		metadata: { manufacturer: 'eastron', model: 'sdm630' },
		registers: {
			'0': { name: 'voltage', description: '', function_codes: [3], data_type: 'float', unit: 'V', access: 'read' },
			'6': { name: 'current', description: '', function_codes: [3], data_type: 'float', unit: 'A', access: 'read' }
		},
		upstreamSha: 'sha'
	});

	test("override des métadonnées de l'appareil", () => {
		const out = applyOverride(base, {
			slug: 'eastron-sdm630',
			name: 'Eastron SDM630 (triphasé)',
			equipmentType: 'compteur-elec',
			doc: 'Notes terrain.'
		});
		expect(out.name).toBe('Eastron SDM630 (triphasé)');
		expect(out.doc).toBe('Notes terrain.');
	});

	test("patch d'un registre par clé function:addr", () => {
		const out = applyOverride(base, {
			slug: 'eastron-sdm630',
			registers: { 'holding:0': { label: 'Tension L1' } }
		});
		expect(out.registers.find((r) => r.address === 0)?.label).toBe('Tension L1');
		expect(out.registers.find((r) => r.address === 0)?.unit).toBe('V');
	});

	test('ajout nouveau registre', () => {
		const out = applyOverride(base, {
			slug: 'eastron-sdm630',
			registers: {
				'holding:200': { dataType: 'uint16', size: 1, access: 'rw', name: 'mode', enum: { '0': 'off', '1': 'on' } }
			}
		});
		const r = out.registers.find((x) => x.address === 200)!;
		expect(r).toBeDefined();
		expect(r.enum).toEqual({ '0': 'off', '1': 'on' });
	});

	test('suppression registre', () => {
		const out = applyOverride(base, { slug: 'eastron-sdm630', removeRegisters: ['holding:6'] });
		expect(out.registers.find((r) => r.address === 6)).toBeUndefined();
	});

	test('force needsReview=false', () => {
		const out = applyOverride(base, { slug: 'eastron-sdm630', needsReview: false });
		expect(out.upstream.needsReview).toBe(false);
	});
});

describe('createDeviceFromOverride', () => {
	test('Viessmann fictif — création complète', () => {
		const dev = createDeviceFromOverride({
			slug: 'viessmann-vitodens-200',
			_create: true,
			vendor: 'Viessmann',
			model: 'Vitodens 200',
			equipmentType: 'autre',
			transport: ['rtu'],
			defaults: { rtu: { baudrate: 9600, parity: 'even', stopBits: 1 } },
			registers: {
				'holding:1000': { name: 'temp_chaudiere', label: 'Température chaudière', dataType: 'int16', size: 1, scale: 0.1, unit: '°C', access: 'r' }
			},
			doc: 'Note terrain.',
			source: { datasheetUrl: 'https://viessmann.com/datasheet.pdf' }
		});

		expect(dev.slug).toBe('viessmann-vitodens-200');
		expect(dev.vendorSlug).toBe('viessmann');
		expect(dev.modelSlug).toBe('vitodens-200');
		expect(dev.registers).toHaveLength(1);
		expect(dev.registers[0].label).toBe('Température chaudière');
		expect(dev.upstream.source).toBe('opengtb');
		expect(dev.upstream.needsReview).toBe(false);
		expect(dev.upstream.sourceUrl).toBe('https://viessmann.com/datasheet.pdf');
	});

	test('refuse si _create absent', () => {
		expect(() =>
			createDeviceFromOverride({
				slug: 'x-y',
				vendor: 'X',
				model: 'Y',
				equipmentType: 'autre',
				transport: ['rtu'],
				registers: { 'holding:0': { dataType: 'uint16', size: 1, access: 'r' } }
			})
		).toThrow(/_create/);
	});

	test('refuse si champs requis manquants', () => {
		expect(() =>
			createDeviceFromOverride({ slug: 'x-y', _create: true } as never)
		).toThrow(/manquants/);
	});

	test('refuse si aucun registre', () => {
		expect(() =>
			createDeviceFromOverride({
				slug: 'x-y',
				_create: true,
				vendor: 'X',
				model: 'Y',
				equipmentType: 'autre',
				transport: ['rtu'],
				registers: {}
			})
		).toThrow(/registers/);
	});
});
