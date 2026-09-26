import { describe, expect, test } from 'vitest';
import { formatAddress, nextFreeAddress, numberedName, uniqueName } from './data';
import { defaultNodePosition, freeNodePosition } from './flow';

describe('adressage des points', () => {
	test('formate l’adresse selon le type', () => {
		expect(formatAddress('AI', 3)).toBe('AI3');
		expect(formatAddress('LORA', 1)).toBe('DEV-01');
		expect(formatAddress('MODBUS', 12)).toBe('HR12');
		expect(formatAddress('BACNET', 4)).toBe('AV4');
		expect(formatAddress('MBUS', 7)).toBe('PRI-007');
	});

	test('reprend le trou laissé par une suppression au lieu de doubler la dernière adresse', () => {
		// AI2 supprimé : compter les points restants proposerait AI3, déjà pris.
		expect(nextFreeAddress('AI', ['AI1', 'AI3'])).toBe('AI2');
		expect(nextFreeAddress('AI', ['AI1', 'AI2', 'AI3'])).toBe('AI4');
		expect(nextFreeAddress('LORA', ['DEV-01', 'DEV-03'])).toBe('DEV-02');
	});

	test('ignore la casse et les adresses vides', () => {
		expect(nextFreeAddress('AI', ['ai1', ' AI2 ', '', '  '])).toBe('AI3');
	});

	test('ne confond pas deux types au même rang', () => {
		expect(nextFreeAddress('DI', ['AI1', 'AI2'])).toBe('DI1');
	});
});

describe('emplacement des blocs', () => {
	test('empile les blocs neufs dans leur colonne', () => {
		expect(freeNodePosition('equipment', [])).toEqual(defaultNodePosition('equipment', 0));
		expect(freeNodePosition('equipment', [defaultNodePosition('equipment', 0)])).toEqual(defaultNodePosition('equipment', 1));
	});

	test('reprend le créneau libéré au lieu de se poser sur un bloc existant', () => {
		// Trois blocs, le premier supprimé : se baser sur le nombre restant viserait le slot 2, occupé.
		const occupied = [defaultNodePosition('equipment', 1), defaultNodePosition('equipment', 2)];
		expect(freeNodePosition('equipment', occupied)).toEqual(defaultNodePosition('equipment', 0));
	});

	test('évite aussi un bloc déplacé à la main près du créneau', () => {
		const dragged = { x: defaultNodePosition('target', 0).x + 24, y: defaultNodePosition('target', 0).y + 32 };
		expect(freeNodePosition('target', [dragged])).toEqual(defaultNodePosition('target', 1));
	});

	test('garde les colonnes indépendantes', () => {
		const occupied = [defaultNodePosition('equipment', 0), defaultNodePosition('equipment', 1)];
		expect(freeNodePosition('supervisor', occupied)).toEqual(defaultNodePosition('supervisor', 0));
	});
});

describe('nommage des blocs', () => {
	test('incrémente le numéro déjà présent dans le nom', () => {
		expect(numberedName('Pompe circuit 01', 1)).toBe('Pompe circuit 01');
		expect(numberedName('Pompe circuit 01', 2)).toBe('Pompe circuit 02');
		expect(numberedName('Chaudière 01', 3)).toBe('Chaudière 03');
		expect(numberedName('Compteur 09', 3)).toBe('Compteur 11');
	});

	test('suffixe les noms sans numéro', () => {
		expect(numberedName('Automate GTB', 2)).toBe('Automate GTB 2');
		expect(numberedName('Sonde départ', 3)).toBe('Sonde départ 3');
	});

	test('saute les noms déjà pris plutôt que de les dupliquer', () => {
		expect(uniqueName('Pompe circuit 01', [])).toBe('Pompe circuit 01');
		expect(uniqueName('Pompe circuit 01', ['Pompe circuit 01'])).toBe('Pompe circuit 02');
		// « Pompe circuit 01 » supprimée : compter les restantes reproposerait « 02 ».
		expect(uniqueName('Pompe circuit 01', ['Pompe circuit 02'])).toBe('Pompe circuit 01');
		expect(uniqueName('Automate GTB', ['automate gtb', 'Automate GTB 2'])).toBe('Automate GTB 3');
	});
});
