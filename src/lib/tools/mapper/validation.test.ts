import { describe, expect, it } from 'vitest';
import { createSegment } from './bus';
import { validateMapper } from './validation';
import type { Equipment, MapperDocument, Target } from './types';

const controller: Target = { id: 'controller', kind: 'controller', name: 'Automate', supervisorId: 'scada', uplink: 'BACnet/IP', segments: [] };
const supervisors = [{ id: 'scada', kind: 'scada', name: 'Supervision' } as const];
const rs485 = createSegment('MODBUS', 'rs485', 'seg-1', 'Bus compteurs');

function meter(id: string, address: string, segmentId: string | null = rs485.id): Equipment {
	return {
		id,
		kind: 'energy-meter',
		name: id,
		bus: { segmentId, address },
		points: [{ id: `${id}-p1`, name: 'Énergie', kind: 'MODBUS', signal: 'Modbus RTU (RS485)', address: 'HR1', targetId: 'controller' }]
	};
}

function document(overrides: Partial<MapperDocument> = {}): MapperDocument {
	return { title: 'Test', supervisors: [...supervisors], targets: [{ ...controller }], equipment: [], ...overrides };
}

const kinds = (doc: MapperDocument) => validateMapper(doc).map((issue) => issue.kind);

describe('validateMapper — points', () => {
	it('detects unassigned and duplicate addresses', () => {
		const doc = document({
			equipment: [{
				id: 'boiler', kind: 'boiler', name: 'Chaudière', bus: null, points: [
					{ id: 'p1', name: 'A', kind: 'AI', signal: '0-10 V', address: 'AI1', targetId: 'controller' },
					{ id: 'p2', name: 'B', kind: 'AI', signal: '0-10 V', address: 'ai1', targetId: 'controller' },
					{ id: 'p3', name: 'C', kind: 'DI', signal: 'TOR', address: '', targetId: null }
				]
			}]
		});

		expect(kinds(doc)).toEqual(['unassigned', 'duplicate-address', 'duplicate-address']);
	});

	it('deux devices peuvent porter le même registre, deux bornes câblées non', () => {
		// HR1 sur deux compteurs distincts est normal : le registre vit dans le device.
		const doc = document({
			targets: [{ ...controller, segments: [rs485] }],
			equipment: [meter('compteur-1', '1'), meter('compteur-2', '2')]
		});

		expect(kinds(doc)).toEqual([]);
	});

	it('signale deux registres identiques dans un même device', () => {
		const device = meter('compteur-1', '1');
		device.points.push({ id: 'dup', name: 'Puissance', kind: 'MODBUS', signal: 'Modbus RTU (RS485)', address: 'HR1', targetId: 'controller' });
		const doc = document({ targets: [{ ...controller, segments: [rs485] }], equipment: [device] });

		expect(kinds(doc)).toEqual(['duplicate-address', 'duplicate-address']);
	});
});

describe('validateMapper — bus', () => {
	it('signale un équipement bus affecté mais non raccordé à un segment', () => {
		const doc = document({ equipment: [meter('compteur-1', '', null)] });
		expect(kinds(doc)).toEqual(['bus-unattached']);
	});

	it('laisse tranquille un équipement bus tant qu’aucun point n’est affecté', () => {
		const orphan = meter('compteur-1', '', null);
		orphan.points = orphan.points.map((point) => ({ ...point, targetId: null }));
		expect(kinds(document({ equipment: [orphan] }))).toEqual(['unassigned']);
	});

	it('signale une adresse esclave hors plage Modbus', () => {
		const doc = document({ targets: [{ ...controller, segments: [rs485] }], equipment: [meter('compteur-1', '300')] });
		const issue = validateMapper(doc).find((entry) => entry.kind === 'invalid-device-address');
		expect(issue?.message).toBe('Adresse esclave invalide (1–247)');
	});

	it('exige une adresse que l’intégrateur alloue lui-même', () => {
		const doc = document({ targets: [{ ...controller, segments: [rs485] }], equipment: [meter('compteur-1', '')] });
		const issue = validateMapper(doc).find((entry) => entry.kind === 'invalid-device-address');
		expect(issue?.message).toBe('Adresse esclave manquante');
	});

	it('n’exige pas un DevEUI en conception : il est gravé par le fabricant', () => {
		const lora = createSegment('LORA', 'lorawan', 'seg-lora', 'Réseau LoRaWAN');
		const gateway: Target = { id: 'gw', kind: 'lora-gateway', name: 'Gateway', supervisorId: 'scada', uplink: 'MQTT', segments: [lora] };
		const sensor = (id: string, address: string): Equipment => ({
			id, kind: 'lora-sensor', name: id, bus: { segmentId: lora.id, address },
			points: [{ id: `${id}-p`, name: 'Température', kind: 'LORA', signal: 'LoRaWAN', address: 'DEV-01', targetId: 'gw' }]
		});
		const base = { targets: [gateway] };

		expect(kinds(document({ ...base, equipment: [sensor('capteur-1', '')] }))).toEqual([]);
		// Une fois relevé, il reste contrôlé : format et unicité sur le réseau.
		expect(kinds(document({ ...base, equipment: [sensor('capteur-1', '70B3D5')] }))).toEqual(['invalid-device-address']);
		expect(kinds(document({ ...base, equipment: [sensor('a', '70B3D5FFFE000001'), sensor('b', '70B3D5FFFE000001')] })))
			.toEqual(['duplicate-device-address', 'duplicate-device-address']);
		// Deux capteurs sans DevEUI ne sont pas des doublons.
		expect(kinds(document({ ...base, equipment: [sensor('a', ''), sensor('b', '')] }))).toEqual([]);
	});

	it('accepte la plage MAC 0–127 en BACnet MS/TP et refuse 128', () => {
		const mstp = createSegment('BACNET', 'rs485', 'seg-mstp', 'Bus MS/TP');
		const device = (address: string): Equipment => ({
			id: `dev-${address}`, kind: 'bacnet-mstp-device', name: `Device ${address}`, bus: { segmentId: mstp.id, address },
			points: [{ id: `p-${address}`, name: 'Objet', kind: 'BACNET', signal: 'BACnet MS/TP', address: 'AV1', targetId: 'controller' }]
		});
		const base = { targets: [{ ...controller, segments: [mstp] }] };

		expect(kinds(document({ ...base, equipment: [device('0')] }))).toEqual([]);
		expect(kinds(document({ ...base, equipment: [device('128')] }))).toEqual(['invalid-device-address']);
	});

	it('signale deux équipements à la même adresse sur un segment', () => {
		const doc = document({
			targets: [{ ...controller, segments: [rs485] }],
			equipment: [meter('compteur-1', '5'), meter('compteur-2', '5')]
		});
		expect(kinds(doc)).toEqual(['duplicate-device-address', 'duplicate-device-address']);
	});

	it('autorise la même adresse sur deux segments différents', () => {
		const second = createSegment('MODBUS', 'rs485', 'seg-2', 'Bus CVC');
		const doc = document({
			targets: [{ ...controller, segments: [rs485, second] }],
			equipment: [meter('compteur-1', '5'), meter('compteur-2', '5', second.id)]
		});
		expect(kinds(doc)).toEqual([]);
	});

	it('signale un segment RS485 au-delà de 32 équipements', () => {
		const doc = document({
			targets: [{ ...controller, segments: [rs485] }],
			equipment: Array.from({ length: 33 }, (_, index) => meter(`compteur-${index}`, String(index + 1)))
		});
		const issue = validateMapper(doc).find((entry) => entry.kind === 'segment-overloaded');
		expect(issue).toMatchObject({ scope: 'segment', id: rs485.id });
		expect(issue?.message).toBe('33 équipements sur le segment, 32 au maximum sans répéteur');
	});

	it('ne limite pas un réseau IP', () => {
		const ip = createSegment('MODBUS', 'ip', 'seg-ip', 'Réseau TCP');
		const doc = document({
			targets: [{ ...controller, segments: [ip] }],
			equipment: Array.from({ length: 40 }, (_, index) => {
				const item = meter(`device-${index}`, `192.168.1.${index + 1}`, ip.id);
				return { ...item, kind: 'modbus-tcp-device' as const };
			})
		});
		expect(kinds(doc)).toEqual([]);
	});

	it('signale un segment dont le protocole ne correspond pas à l’équipement', () => {
		const mstp = createSegment('BACNET', 'rs485', 'seg-mstp', 'Bus MS/TP');
		const doc = document({ targets: [{ ...controller, segments: [mstp] }], equipment: [meter('compteur-1', '5', mstp.id)] });
		expect(kinds(doc)).toEqual(['bus-mismatch']);
	});
});

describe('validateMapper — supervision', () => {
	it('signale une cible chargée de points mais non remontée', () => {
		const doc = document({
			supervisors: [],
			targets: [{ ...controller, supervisorId: null }],
			equipment: [{
				id: 'boiler', kind: 'boiler', name: 'Chaudière', bus: null, points: [
					{ id: 'p1', name: 'A', kind: 'AI', signal: '0-10 V', address: 'AI1', targetId: 'controller' }
				]
			}]
		});

		expect(validateMapper(doc)).toEqual([
			{ kind: 'no-supervisor', scope: 'target', id: 'controller', message: 'Cible non remontée en supervision' }
		]);
	});

	it('ne signale rien pour une cible sans point affecté', () => {
		expect(validateMapper(document({ supervisors: [], targets: [{ ...controller, supervisorId: null }] }))).toEqual([]);
	});

	it('signale un superviseur référencé mais absent du document', () => {
		const doc = document({
			supervisors: [],
			equipment: [{
				id: 'boiler', kind: 'boiler', name: 'Chaudière', bus: null, points: [
					{ id: 'p1', name: 'A', kind: 'AI', signal: '0-10 V', address: 'AI1', targetId: 'controller' }
				]
			}]
		});
		expect(kinds(doc)).toEqual(['no-supervisor']);
	});
});
