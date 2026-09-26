import { describe, expect, test } from 'vitest';
import { createEquipment, createTarget, defaultSignal, DEFAULT_MAPPER, EQUIPMENT_DEFINITIONS, EQUIPMENT_FAMILIES, equipmentProtocol, normalizeTarget, SIGNAL_PRESETS, SUPERVISOR_DEFINITIONS, SUPERVISOR_PALETTE, TARGET_DEFINITIONS, TARGET_PALETTE, targetAccepts } from './data';
import { mapperToCsv, renderMapperSvg } from './render';

describe('mapper GTB', () => {
	test('instancie les points d’un équipement depuis son modèle', () => {
		const boiler = createEquipment('boiler', 'boiler-9');
		expect(boiler.points).toHaveLength(4);
		expect(boiler.points[0]).toMatchObject({ kind: 'AO', signal: '0–10 V', targetId: null });
	});

	test('filtre les cibles compatibles', () => {
		expect(targetAccepts('controller', 'AI')).toBe(true);
		expect(targetAccepts('controller', 'LORA')).toBe(false);
		expect(targetAccepts('lora-gateway', 'LORA')).toBe(true);
		expect(targetAccepts('lora-gateway', 'DI')).toBe(false);
	});

	test('normalise les signaux selon le type de point', () => {
		expect(defaultSignal('LORA')).toBe('LoRaWAN');
		expect(defaultSignal('BACNET')).toBe('BACnet MS/TP');
		expect(defaultSignal('MBUS')).toBe('M-Bus');
		expect(SIGNAL_PRESETS.AI).toContain('PT1000');
		expect(SIGNAL_PRESETS.AO).toContain('0–10 V');
		expect(SIGNAL_PRESETS.MODBUS).toContain('Modbus RTU (RS485)');
		expect(SIGNAL_PRESETS.MODBUS).toContain('Modbus TCP/IP');
	});

	test.each([
		['lora-sensor', 'LORA', 'LoRaWAN', 'lorawan'],
		['modbus-rtu-device', 'MODBUS', 'Modbus RTU (RS485)', 'rs485'],
		['modbus-tcp-device', 'MODBUS', 'Modbus TCP/IP', 'ip'],
		['bacnet-mstp-device', 'BACNET', 'BACnet MS/TP', 'rs485'],
		['bacnet-ip-device', 'BACNET', 'BACnet/IP', 'ip'],
		['mbus-device', 'MBUS', 'M-Bus', 'mbus']
	] as const)('verrouille le protocole de %s', (kind, pointKind, signal, media) => {
		expect(equipmentProtocol(kind)).toEqual({ kind: pointKind, signal, media });
		expect(createEquipment(kind, `device-${kind}`).points[0]).toMatchObject({ kind: pointKind, signal });
		// Un equipement bus nait en attente de raccordement, un equipement cable n'a pas de bus du tout.
		expect(createEquipment(kind, `device-${kind}`).bus).toEqual({ segmentId: null, address: '' });
		expect(createEquipment('boiler', 'boiler-1').bus).toBeNull();
	});

	test('la palette couvre chaque type, sans doublon entre familles', () => {
		const listed = EQUIPMENT_FAMILIES.flatMap((family) => family.kinds);
		expect(new Set(listed).size).toBe(listed.length);
		expect([...listed].sort()).toEqual(Object.keys(EQUIPMENT_DEFINITIONS).sort());
		expect([...TARGET_PALETTE].sort()).toEqual(Object.keys(TARGET_DEFINITIONS).sort());
		expect([...SUPERVISOR_PALETTE].sort()).toEqual(Object.keys(SUPERVISOR_DEFINITIONS).sort());
	});

	test('une cible neuve porte un protocole de remontée mais aucun superviseur', () => {
		expect(createTarget('controller', 'c-1', 'Automate')).toEqual({ id: 'c-1', kind: 'controller', name: 'Automate', supervisorId: null, uplink: 'BACnet/IP', segments: [] });
		expect(createTarget('lora-gateway', 'g-1', 'Gateway')).toMatchObject({ supervisorId: null, uplink: 'MQTT' });
	});

	test('complète les cibles des projets antérieurs au niveau supervision', () => {
		expect(normalizeTarget({ id: 'c-1', kind: 'controller', name: 'Automate' })).toEqual({ id: 'c-1', kind: 'controller', name: 'Automate', supervisorId: null, uplink: 'BACnet/IP', segments: [] });
		expect(normalizeTarget({ id: 'g-1', kind: 'lora-gateway', name: 'Gateway', uplink: 'Carotte' as never })).toMatchObject({ uplink: 'MQTT' });
		expect(normalizeTarget({ id: 'c-2', kind: 'controller', name: 'A', supervisorId: 's-1', uplink: 'OPC UA' })).toMatchObject({ supervisorId: 's-1', uplink: 'OPC UA' });
	});

	test('génère l’architecture SVG avec plusieurs cibles', () => {
		const svg = renderMapperSvg(DEFAULT_MAPPER);
		expect(svg).toContain('Automate chaufferie');
		expect(svg).toContain('Gateway LoRaWAN');
		expect(svg).toContain('data-target-kind="controller"');
		expect(svg).toContain('data-target-kind="lora-gateway"');
		expect(svg).toContain('data-supervisor-kind="scada"');
		expect(svg).toContain('Supervision chaufferie');
		expect(svg).toContain('SUPERVISION');
		expect(svg).toContain('AO1');
	});

	test('exporte une liste de points CSV', () => {
		const csv = mapperToCsv(DEFAULT_MAPPER);
		expect(csv).toContain('"Cible";"Segment";"Adresse équipement";"Adresse";"Superviseur";"Remontée"');
		expect(csv).toContain('"Chaudière 01";"Consigne puissance";"AO";"0–10 V"');
		expect(csv).toContain('"Gateway LoRaWAN";"Réseau LoRaWAN";"";"DEV-01";"Supervision chaufferie";"MQTT"');
		expect(csv).toContain('"Automate chaufferie";"";"";"AO1";"Supervision chaufferie";"BACnet/IP"');
	});

	test('échappe les libellés dans le SVG', () => {
		const svg = renderMapperSvg({ ...DEFAULT_MAPPER, title: '<script>alert(1)</script>' });
		expect(svg).not.toContain('<script>');
		expect(svg).toContain('&lt;script&gt;');
	});
});
