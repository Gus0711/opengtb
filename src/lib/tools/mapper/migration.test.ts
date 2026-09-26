import { describe, expect, test } from 'vitest';
import { createSegment, isBusKind } from './bus';
import { migrateBusAttachments } from './data';
import { validateMapper } from './validation';
import type { Equipment, GtbPoint, MapperDocument, Target } from './types';

const controller: Target = { id: 'auto-1', kind: 'controller', name: 'Automate', supervisorId: null, uplink: 'BACnet/IP', segments: [] };

function point(id: string, kind: GtbPoint['kind'], address: string, targetId: string | null): GtbPoint {
	return { id, name: id, kind, signal: 'x', address, targetId };
}

/** Projet tel qu'enregistré avant l'introduction des segments : aucun champ `bus`. */
function legacy(): MapperDocument {
	return {
		title: 'Ancien projet',
		supervisors: [],
		targets: [{ ...controller }],
		equipment: [
			{ id: 'chaudiere', kind: 'boiler', name: 'Chaudière', points: [point('p-ao', 'AO', 'AO1', 'auto-1'), point('p-di', 'DI', 'DI1', 'auto-1')] } as unknown as Equipment,
			{ id: 'compteur-a', kind: 'energy-meter', name: 'Compteur A', points: [point('p-a', 'MODBUS', 'HR1', 'auto-1')] } as unknown as Equipment,
			{ id: 'compteur-b', kind: 'energy-meter', name: 'Compteur B', points: [point('p-b', 'MODBUS', 'HR1', 'auto-1')] } as unknown as Equipment,
			{ id: 'sonde-bacnet', kind: 'bacnet-ip-device', name: 'Sonde BACnet', points: [point('p-bac', 'BACNET', 'AV1', 'auto-1')] } as unknown as Equipment
		]
	};
}

describe('migration vers le modèle de bus', () => {
	test('crée un segment par protocole et y rattache les devices', () => {
		const migrated = migrateBusAttachments(legacy());
		const segments = migrated.targets[0].segments;

		expect(segments.map((segment) => [segment.kind, segment.media])).toEqual([['MODBUS', 'rs485'], ['BACNET', 'ip']]);
		const rtu = segments[0];
		expect(migrated.equipment.filter((item) => item.bus?.segmentId === rtu.id).map((item) => item.id)).toEqual(['compteur-a', 'compteur-b']);
	});

	test('alloue des adresses d’équipement distinctes sur le segment', () => {
		const migrated = migrateBusAttachments(legacy());
		expect(migrated.equipment.find((item) => item.id === 'compteur-a')?.bus?.address).toBe('1');
		expect(migrated.equipment.find((item) => item.id === 'compteur-b')?.bus?.address).toBe('2');
	});

	test('laisse les équipements câblés sans bus', () => {
		const migrated = migrateBusAttachments(legacy());
		expect(migrated.equipment.find((item) => item.id === 'chaudiere')?.bus).toBeNull();
	});

	test('le projet migré ne produit plus d’alerte de rattachement', () => {
		const migrated = migrateBusAttachments(legacy());
		const kinds = validateMapper(migrated).map((issue) => issue.kind);
		expect(kinds).not.toContain('bus-unattached');
		expect(kinds).not.toContain('invalid-device-address');
		// Deux compteurs partagent HR1 : légitime, le registre vit dans le device.
		expect(kinds).not.toContain('duplicate-address');
	});

	test('ne touche pas un rattachement déjà valide', () => {
		const segment = createSegment('MODBUS', 'rs485', 'seg-1', 'Bus compteurs');
		const doc: MapperDocument = {
			title: 'Déjà migré',
			supervisors: [],
			targets: [{ ...controller, segments: [segment] }],
			equipment: [{ id: 'compteur', kind: 'energy-meter', name: 'Compteur', bus: { segmentId: 'seg-1', address: '17' }, points: [point('p', 'MODBUS', 'HR1', 'auto-1')] }]
		};

		const migrated = migrateBusAttachments(doc);
		expect(migrated.targets[0].segments).toHaveLength(1);
		expect(migrated.equipment[0].bus).toEqual({ segmentId: 'seg-1', address: '17' });
	});

	test('évite l’adresse déjà prise par un device rattaché', () => {
		const segment = createSegment('MODBUS', 'rs485', 'seg-1', 'Bus compteurs');
		const doc: MapperDocument = {
			title: 'Mixte',
			supervisors: [],
			targets: [{ ...controller, segments: [segment] }],
			equipment: [
				{ id: 'ancien', kind: 'energy-meter', name: 'Ancien', bus: { segmentId: 'seg-1', address: '1' }, points: [point('p1', 'MODBUS', 'HR1', 'auto-1')] },
				{ id: 'nouveau', kind: 'energy-meter', name: 'Nouveau', points: [point('p2', 'MODBUS', 'HR1', 'auto-1')] } as unknown as Equipment
			]
		};

		expect(migrateBusAttachments(doc).equipment[1].bus?.address).toBe('2');
	});

	test('laisse en attente un device dont aucun point n’est affecté', () => {
		const doc: MapperDocument = {
			title: 'Non affecté',
			supervisors: [],
			targets: [{ ...controller }],
			equipment: [{ id: 'compteur', kind: 'energy-meter', name: 'Compteur', points: [point('p', 'MODBUS', '', null)] } as unknown as Equipment]
		};

		const migrated = migrateBusAttachments(doc);
		expect(migrated.targets[0].segments).toHaveLength(0);
		expect(migrated.equipment[0].bus).toEqual({ segmentId: null, address: '' });
	});
});

describe('répartition des points sur le nœud cible', () => {
	test('seules les E/S câblées occupent une borne de l’automate', () => {
		const migrated = migrateBusAttachments(legacy());
		const assigned = migrated.equipment.flatMap((item) => item.points.filter((entry) => entry.targetId === 'auto-1').map((entry) => ({ item, point: entry })));

		const physical = assigned.filter(({ point: entry }) => !isBusKind(entry.kind));
		expect(physical.map(({ point: entry }) => entry.address)).toEqual(['AO1', 'DI1']);

		// Chaque point réseau retombe sous le segment de son device, aucun orphelin.
		const grouped = migrated.targets[0].segments.flatMap((segment) =>
			assigned.filter(({ item, point: entry }) => isBusKind(entry.kind) && item.bus?.segmentId === segment.id)
		);
		expect(grouped).toHaveLength(3);
		expect(physical.length + grouped.length).toBe(assigned.length);
	});
});
