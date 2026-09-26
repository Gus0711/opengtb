import { describe, expect, test } from 'vitest';
import {
	addressProfile,
	createSegment,
	defaultSegmentName,
	isSerial,
	isValidDeviceAddress,
	nextFreeDeviceAddress,
	segmentDevices,
	segmentSummary
} from './bus';
import { ensureSegment, equipmentBus } from './data';
import type { Equipment, Target } from './types';

describe('profils d’adressage', () => {
	test('chaque couple protocole/média a sa plage et son intitulé', () => {
		expect(addressProfile('MODBUS', 'rs485')).toMatchObject({ label: 'Adresse esclave', min: 1, max: 247, maxDevices: 32 });
		expect(addressProfile('BACNET', 'rs485')).toMatchObject({ label: 'Adresse MAC', min: 0, max: 127, maxDevices: 32 });
		expect(addressProfile('BACNET', 'ip')).toMatchObject({ label: 'Device instance', max: 4194302, maxDevices: null });
		expect(addressProfile('MODBUS', 'ip')).toMatchObject({ label: 'Adresse IP', format: 'ip', maxDevices: null });
		expect(addressProfile('MBUS', 'mbus')).toMatchObject({ label: 'Adresse primaire', min: 1, max: 250, maxDevices: 250 });
		expect(addressProfile('LORA', 'lorawan')).toMatchObject({ label: 'DevEUI', format: 'eui' });
	});

	test('distingue ce que l’intégrateur alloue de ce qu’il relève sur site', () => {
		// Tout ce qui se decide en etude est attendu ; seul le DevEUI vient du materiel.
		for (const [kind, media] of [['MODBUS', 'rs485'], ['MODBUS', 'ip'], ['BACNET', 'rs485'], ['BACNET', 'ip'], ['MBUS', 'mbus']] as const) {
			expect(addressProfile(kind, media).assignment).toBe('design');
		}
		expect(addressProfile('LORA', 'lorawan').assignment).toBe('commissioning');
	});

	test('valide une adresse numérique dans sa plage', () => {
		const modbus = addressProfile('MODBUS', 'rs485');
		expect(isValidDeviceAddress(modbus, '1')).toBe(true);
		expect(isValidDeviceAddress(modbus, '247')).toBe(true);
		expect(isValidDeviceAddress(modbus, '0')).toBe(false);
		expect(isValidDeviceAddress(modbus, '248')).toBe(false);
		expect(isValidDeviceAddress(modbus, '')).toBe(false);
		expect(isValidDeviceAddress(modbus, 'cinq')).toBe(false);
	});

	test('valide une adresse IP et un DevEUI', () => {
		const ip = addressProfile('MODBUS', 'ip');
		expect(isValidDeviceAddress(ip, '192.168.1.50')).toBe(true);
		expect(isValidDeviceAddress(ip, '192.168.1.300')).toBe(false);
		expect(isValidDeviceAddress(ip, '192.168.1')).toBe(false);

		const lora = addressProfile('LORA', 'lorawan');
		expect(isValidDeviceAddress(lora, '70B3D5FFFE000001')).toBe(true);
		expect(isValidDeviceAddress(lora, '70-B3-D5-FF-FE-00-00-01')).toBe(true);
		expect(isValidDeviceAddress(lora, '70B3D5')).toBe(false);
	});
});

describe('allocation d’adresse sur un segment', () => {
	const modbus = addressProfile('MODBUS', 'rs485');

	test('prend la première adresse libre du segment', () => {
		expect(nextFreeDeviceAddress(modbus, [])).toBe('1');
		expect(nextFreeDeviceAddress(modbus, ['1', '2'])).toBe('3');
		// Trou laissé par un équipement retiré du bus.
		expect(nextFreeDeviceAddress(modbus, ['1', '3'])).toBe('2');
	});

	test('démarre à 0 en BACnet MS/TP', () => {
		expect(nextFreeDeviceAddress(addressProfile('BACNET', 'rs485'), [])).toBe('0');
	});

	test('laisse l’intégrateur saisir une IP ou un DevEUI', () => {
		expect(nextFreeDeviceAddress(addressProfile('MODBUS', 'ip'), [])).toBe('');
		expect(nextFreeDeviceAddress(addressProfile('LORA', 'lorawan'), [])).toBe('');
	});
});

describe('segments', () => {
	test('un média série porte vitesse et parité, IP et radio non', () => {
		expect(isSerial('rs485')).toBe(true);
		expect(isSerial('mbus')).toBe(true);
		expect(isSerial('ip')).toBe(false);
		expect(isSerial('lorawan')).toBe(false);
	});

	test('les défauts série suivent les usages du protocole', () => {
		// Modbus RTU par defaut en parite paire, BACnet MS/TP en 8N1.
		expect(createSegment('MODBUS', 'rs485', 's', 'Bus')).toMatchObject({ baud: 9600, parity: 'even', stopBits: 1 });
		expect(createSegment('BACNET', 'rs485', 's', 'Bus')).toMatchObject({ baud: 9600, parity: 'none' });
		expect(createSegment('MBUS', 'mbus', 's', 'Boucle')).toMatchObject({ baud: 2400, parity: 'even' });
		expect(createSegment('MODBUS', 'ip', 's', 'Réseau')).toMatchObject({ baud: 0, parity: 'none' });
	});

	test('résume les paramètres pour l’affichage', () => {
		expect(segmentSummary(createSegment('MODBUS', 'rs485', 's', 'Bus'))).toBe('9600 8E1');
		expect(segmentSummary(createSegment('BACNET', 'rs485', 's', 'Bus'))).toBe('9600 8N1');
		expect(segmentSummary(createSegment('MODBUS', 'ip', 's', 'Réseau'))).toBe('TCP/IP');
	});

	test('nomme le segment selon le protocole et le média', () => {
		expect(defaultSegmentName('MODBUS', 'rs485', 1)).toBe('Bus Modbus RTU');
		expect(defaultSegmentName('MODBUS', 'ip', 1)).toBe('Réseau Modbus TCP');
		expect(defaultSegmentName('BACNET', 'rs485', 1)).toBe('Bus MS/TP');
		expect(defaultSegmentName('BACNET', 'ip', 1)).toBe('Réseau BACnet/IP');
		expect(defaultSegmentName('MBUS', 'mbus', 2)).toBe('Boucle M-Bus 2');
	});
});

describe('rattachement à une cible', () => {
	const target: Target = { id: 't1', kind: 'controller', name: 'Automate', supervisorId: null, uplink: 'BACnet/IP', segments: [] };

	test('crée le segment manquant, puis réutilise celui qui existe', () => {
		const first = ensureSegment(target, 'MODBUS', 'rs485', 'seg-1');
		expect(first.target.segments).toHaveLength(1);
		expect(first.segment).toMatchObject({ kind: 'MODBUS', media: 'rs485', name: 'Bus Modbus RTU' });

		const again = ensureSegment(first.target, 'MODBUS', 'rs485', 'seg-2');
		expect(again.target.segments).toHaveLength(1);
		expect(again.segment.id).toBe('seg-1');
	});

	test('sépare RTU et TCP sur deux segments du même automate', () => {
		const rtu = ensureSegment(target, 'MODBUS', 'rs485', 'seg-1');
		const tcp = ensureSegment(rtu.target, 'MODBUS', 'ip', 'seg-2');
		expect(tcp.target.segments.map((segment) => segment.media)).toEqual(['rs485', 'ip']);
	});

	test('décrit le segment exigé par chaque type d’équipement', () => {
		expect(equipmentBus('energy-meter')).toEqual({ kind: 'MODBUS', media: 'rs485' });
		expect(equipmentBus('bacnet-ip-device')).toEqual({ kind: 'BACNET', media: 'ip' });
		expect(equipmentBus('lora-sensor')).toEqual({ kind: 'LORA', media: 'lorawan' });
		// Une chaudière est câblée en E/S directes : aucun segment.
		expect(equipmentBus('boiler')).toBeNull();
		expect(equipmentBus('temperature-sensor')).toBeNull();
	});

	test('compte les équipements portés par un segment', () => {
		const device = (id: string, segmentId: string | null): Equipment => ({ id, kind: 'energy-meter', name: id, bus: { segmentId, address: '1' }, points: [] });
		const equipment = [device('a', 'seg-1'), device('b', 'seg-1'), device('c', 'seg-2'), device('d', null)];
		expect(segmentDevices(equipment, 'seg-1').map((item) => item.id)).toEqual(['a', 'b']);
		expect(segmentDevices(equipment, 'seg-2')).toHaveLength(1);
	});
});
