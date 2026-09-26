import { describe, expect, test } from 'vitest';
import { createSegment } from './bus';
import { createEquipment, createTarget, EQUIPMENT_DEFINITIONS } from './data';
import { duplicateEquipment, duplicateTarget } from './duplicate';
import type { Equipment, Target } from './types';

function idFactory() {
	let n = 0;
	return (prefix: string) => `${prefix}-copy-${++n}`;
}

function wired(id: string, targetId: string, addresses: string[]): Equipment {
	const item = createEquipment('heating-circuit', id);
	item.points = item.points.map((point, index) => ({ ...point, targetId, address: addresses[index] ?? '' }));
	return item;
}

function modbusMeter(id: string, segmentId: string, address: string, targetId: string): Equipment {
	const item = createEquipment('energy-meter', id);
	return { ...item, bus: { segmentId, address }, points: item.points.map((point, index) => ({ ...point, targetId, address: `HR${index + 1}` })) };
}

const controller = (id: string): Target => ({ ...createTarget('controller', id, 'Automate CTA 01'), segments: [createSegment('MODBUS', 'rs485', `${id}-rs485`, 'Bus Modbus RTU')] });

describe('duplication d’un équipement', () => {
	test('garde l’automate et prend les bornes suivantes libres', () => {
		const target = controller('plc-1');
		const source = wired('circuit-1', 'plc-1', ['AI1', 'AI2', 'AO1', 'DO1', 'DI1', 'DI2']);
		const result = duplicateEquipment({ targets: [target], equipment: [source] }, 'circuit-1', idFactory())!;

		expect(result.equipment).toHaveLength(2);
		expect(result.copy.name).toBe('Circuit chauffage 02');
		expect(result.copy.points.map((point) => point.targetId)).toEqual(Array(6).fill('plc-1'));
		expect(result.copy.points.map((point) => point.address)).toEqual(['AI3', 'AI4', 'AO2', 'DO2', 'DI3', 'DI4']);
		// Nouveaux identifiants : la copie est indépendante de l'original.
		const ids = new Set(source.points.map((point) => point.id));
		expect(result.copy.points.some((point) => ids.has(point.id))).toBe(false);
		expect(result.copy.id).not.toBe(source.id);
	});

	test('un point non affecté reste non affecté', () => {
		const source = createEquipment('fan-coil', 'fc-1');
		const result = duplicateEquipment({ targets: [], equipment: [source] }, 'fc-1', idFactory())!;
		expect(result.copy.points.every((point) => point.targetId === null && point.address === '')).toBe(true);
		expect(result.copy.name).toBe('Ventilo 02');
	});

	test('un device de bus prend l’adresse esclave suivante et garde ses registres', () => {
		const target = controller('plc-1');
		const segmentId = target.segments[0].id;
		const meters = [modbusMeter('m-1', segmentId, '1', 'plc-1'), modbusMeter('m-2', segmentId, '2', 'plc-1')];
		const result = duplicateEquipment({ targets: [target], equipment: meters }, 'm-1', idFactory())!;

		expect(result.copy.bus).toEqual({ segmentId, address: '3' });
		expect(result.copy.points.map((point) => point.address)).toEqual(['HR1', 'HR2']);
	});

	test('dupliquer dix fois enchaîne les numéros sans collision', () => {
		const target = controller('plc-1');
		let equipment = [wired('circuit-1', 'plc-1', ['AI1', 'AI2', 'AO1', 'DO1', 'DI1', 'DI2'])];
		const makeId = idFactory();
		for (let i = 0; i < 10; i += 1) equipment = duplicateEquipment({ targets: [target], equipment }, 'circuit-1', makeId)!.equipment;

		const names = equipment.map((item) => item.name);
		expect(new Set(names).size).toBe(11);
		expect(names.at(-1)).toBe('Circuit chauffage 11');
		const aiAddresses = equipment.flatMap((item) => item.points.filter((point) => point.kind === 'AI').map((point) => point.address));
		expect(new Set(aiAddresses).size).toBe(22);
	});

	test('identifiant inconnu → null', () => {
		expect(duplicateEquipment({ targets: [], equipment: [] }, 'nope', idFactory())).toBeNull();
	});
});

describe('duplication d’un automate', () => {
	test('copie les segments et les équipements qui ne dépendent que de lui', () => {
		const plc = controller('plc-1');
		const other = { ...createTarget('controller', 'plc-2', 'Automate chaufferie'), segments: [] };
		const segmentId = plc.segments[0].id;
		const ahu = createEquipment('ahu', 'ahu-1');
		ahu.points = ahu.points.map((point, index) => ({ ...point, targetId: 'plc-1', address: `${point.kind}${index + 1}` }));
		const meter = modbusMeter('m-1', segmentId, '5', 'plc-1');
		const shared = wired('circuit-1', 'plc-1', ['AI10', 'AI11', 'AO10', 'DO10', 'DI10', 'DI11']);
		shared.points[5] = { ...shared.points[5], targetId: 'plc-2' };
		const orphan = createEquipment('pump', 'pump-1');

		const result = duplicateTarget({ targets: [plc, other], equipment: [ahu, meter, shared, orphan] }, 'plc-1', idFactory())!;

		expect(result.copy.name).toBe('Automate CTA 02');
		expect(result.copy.supervisorId).toBe(plc.supervisorId);
		expect(result.copy.segments).toHaveLength(1);
		expect(result.copy.segments[0].id).not.toBe(segmentId);
		expect(result.copy.segments[0]).toMatchObject({ kind: 'MODBUS', media: 'rs485', baud: 9600 });

		// La CTA et le compteur suivent ; l'équipement partagé et l'orphelin restent.
		expect(result.equipmentCopies.map((item) => item.name)).toEqual(['CTA 02', 'Compteur énergie 2']);
		const [ahuCopy, meterCopy] = result.equipmentCopies;
		expect(ahuCopy.points.every((point) => point.targetId === result.copy.id)).toBe(true);
		// Automate vierge : mêmes bornes que l'original.
		expect(ahuCopy.points.map((point) => point.address)).toEqual(ahu.points.map((point) => point.address));
		expect(meterCopy.bus).toEqual({ segmentId: result.copy.segments[0].id, address: '5' });
		expect(meterCopy.points.every((point) => point.targetId === result.copy.id)).toBe(true);

		expect(result.targets).toHaveLength(3);
		expect(result.equipment).toHaveLength(6);
	});
});

describe('modèles CVC', () => {
	test.each(['heating-circuit', 'ahu', 'heat-pump', 'chiller', 'fan-coil', 'dhw', 'extract-fan', 'outdoor-sensor'] as const)(
		'%s est un équipement câblé avec des points',
		(kind) => {
			const item = createEquipment(kind, `x-${kind}`);
			expect(item.bus).toBeNull();
			expect(item.points.length).toBeGreaterThan(0);
			expect(item.points.every((point) => ['AI', 'AO', 'DI', 'DO'].includes(point.kind))).toBe(true);
			expect(EQUIPMENT_DEFINITIONS[kind].label).toBeTruthy();
		}
	);
});
