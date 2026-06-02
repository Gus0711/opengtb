/**
 * Présets de locaux types — accélérateurs de saisie.
 *
 * Chaque préset pré-câble la zone, la surface indicative, les populations avec
 * leur référentiel/désignation, et les paramètres spécifiques s'il y a lieu.
 * L'utilisateur ajuste ensuite les effectifs et la surface réelle.
 */

import type { Local, Population, ZoneLocal } from './types';

export interface Preset {
	id: string;
	libelle: string;
	zone: ZoneLocal;
	description: string;
	build: (id: string) => Local;
}

let _seq = 0;
const pid = (): string => `p${Date.now().toString(36)}${(_seq++).toString(36)}`;

function adultes(libelle: string, nb: number, ref: Population['referentiel'], designation: string): Population {
	return {
		libelle,
		nbOccupants: nb,
		referentiel: ref,
		designationLocal: designation,
		profil: 'adulte',
		activite: 'leger'
	};
}

function enfants(libelle: string, nb: number, ref: Population['referentiel'], designation: string): Population {
	return {
		libelle,
		nbOccupants: nb,
		referentiel: ref,
		designationLocal: designation,
		profil: 'enfant',
		activite: 'leger'
	};
}

export const PRESETS: Preset[] = [
	{
		id: 'bureau_openspace',
		libelle: 'Bureau open-space',
		zone: 'tertiaire_bureau',
		description: 'Salariés en bureau, pas de public — Code du Travail R4222-6.',
		build: (id) => ({
			id,
			libelle: 'Bureau open-space',
			zone: 'tertiaire_bureau',
			surface_m2: 50,
			hauteurSousPlafond_m: 2.7,
			populations: [adultes('Salariés', 10, 'code_travail', 'bureau')]
		})
	},
	{
		id: 'salle_reunion',
		libelle: "Salle de réunion d'entreprise",
		zone: 'tertiaire_bureau',
		description: 'Salariés en réunion, pas de public — Code du Travail R4222-6 (30 m³/h).',
		build: (id) => ({
			id,
			libelle: 'Salle de réunion',
			zone: 'tertiaire_bureau',
			surface_m2: 30,
			hauteurSousPlafond_m: 2.7,
			populations: [adultes('Salariés', 12, 'code_travail', 'restauration_vente_reunion')]
		})
	},
	{
		id: 'accueil_public',
		libelle: 'Open-space avec accueil public',
		zone: 'tertiaire_bureau',
		description: 'Banque, mairie — salariés (CT) + visiteurs (RSDT) co-présents.',
		build: (id) => ({
			id,
			libelle: 'Accueil public',
			zone: 'tertiaire_bureau',
			surface_m2: 60,
			hauteurSousPlafond_m: 2.7,
			populations: [
				adultes('Salariés', 10, 'code_travail', 'bureau'),
				adultes('Visiteurs', 5, 'rsdt_641', 'bureau')
			]
		})
	},
	{
		id: 'classe_primaire',
		libelle: 'Salle de classe primaire / collège',
		zone: 'enseignement',
		description: '1 enseignant (CT) + élèves (RSDT 64.1 enseignement 1er degré, 15 m³/h).',
		build: (id) => ({
			id,
			libelle: 'Salle de classe primaire',
			zone: 'enseignement',
			surface_m2: 60,
			hauteurSousPlafond_m: 3.0,
			populations: [
				adultes('Enseignant', 1, 'code_travail', 'bureau'),
				enfants('Élèves', 24, 'rsdt_641', 'enseignement_primaire_college')
			]
		})
	},
	{
		id: 'classe_lycee',
		libelle: 'Salle de classe lycée / supérieur',
		zone: 'enseignement',
		description: '1 enseignant (CT) + élèves (RSDT 64.1 lycée/universitaire, 18 m³/h).',
		build: (id) => ({
			id,
			libelle: 'Salle de classe lycée',
			zone: 'enseignement',
			surface_m2: 60,
			hauteurSousPlafond_m: 3.0,
			populations: [
				adultes('Enseignant', 1, 'code_travail', 'bureau'),
				enfants('Élèves', 24, 'rsdt_641', 'enseignement_lycee_universite')
			]
		})
	},
	{
		id: 'restaurant_erp',
		libelle: 'Restaurant ERP',
		zone: 'restauration',
		description: 'Personnel (CT) + clientèle (RSDT 64.1 restauration, 22 m³/h).',
		build: (id) => ({
			id,
			libelle: 'Salle de restaurant',
			zone: 'restauration',
			surface_m2: 100,
			hauteurSousPlafond_m: 2.7,
			populations: [
				adultes('Personnel', 4, 'code_travail', 'restauration_vente_reunion'),
				adultes('Clientèle', 80, 'rsdt_641', 'restauration')
			]
		})
	},
	{
		id: 'cuisine_collective',
		libelle: 'Cuisine collective (200 repas)',
		zone: 'cuisine_collective',
		description: 'Débit forfaitaire RSDT 64.2 + arrêté 20/01/1983 — fonction du nombre de repas servis.',
		build: (id) => ({
			id,
			libelle: 'Cuisine 200 repas',
			zone: 'cuisine_collective',
			surface_m2: 50,
			hauteurSousPlafond_m: 3.0,
			populations: [],
			parametresSpecifiques: { nbRepasSimultanes: 200 }
		})
	},
	{
		id: 'sanitaires_collectifs',
		libelle: 'Sanitaires ERP collectifs',
		zone: 'sanitaire',
		description: 'Débit forfaitaire RSDT 64.2 — 30 m³/h par cabinet, 10 m³/h par lavabo.',
		build: (id) => ({
			id,
			libelle: 'Sanitaires collectifs',
			zone: 'sanitaire',
			surface_m2: 12,
			hauteurSousPlafond_m: 2.5,
			populations: [],
			parametresSpecifiques: { nbCabinets: 4, nbLavabos: 3, nbDouches: 0, collectif: true }
		})
	},
	{
		id: 'creche_piece_vie',
		libelle: 'Crèche — pièce de vie',
		zone: 'creche',
		description: 'Arrêté 31/08/2021 — 15 m³/h par enfant accueilli.',
		build: (id) => ({
			id,
			libelle: 'Crèche pièce de vie',
			zone: 'creche',
			surface_m2: 40,
			hauteurSousPlafond_m: 2.7,
			populations: [
				enfants('Enfants', 12, 'creche', 'piece_vie'),
				adultes('Personnel encadrant', 2, 'code_travail', 'bureau')
			]
		})
	},
	{
		id: 'creche_change',
		libelle: 'Crèche — local de change',
		zone: 'creche',
		description: 'Arrêté 31/08/2021 — 20 m³/h par poste de change.',
		build: (id) => ({
			id,
			libelle: 'Local de change',
			zone: 'creche',
			surface_m2: 10,
			hauteurSousPlafond_m: 2.5,
			populations: [],
			parametresSpecifiques: { nbPostesChange: 2 }
		})
	},
	{
		id: 'cinema',
		libelle: 'Salle de spectacle / cinéma',
		zone: 'spectacle',
		description: 'Spectateurs uniquement — RSDT 64.1 (30 m³/h par spectateur).',
		build: (id) => ({
			id,
			libelle: 'Salle de cinéma',
			zone: 'spectacle',
			surface_m2: 250,
			hauteurSousPlafond_m: 4.0,
			populations: [adultes('Spectateurs', 200, 'rsdt_641', 'spectacle_cinema')]
		})
	},
	{
		id: 'bloc_op_risque_3',
		libelle: 'Bloc opératoire — risque 3 (NF S 90-351)',
		zone: 'sante',
		description: 'Calcul indicatif en taux de renouvellement (25 vol/h). Surpression +15 Pa.',
		build: (id) => ({
			id,
			libelle: 'Bloc op risque 3',
			zone: 'sante',
			surface_m2: 60,
			hauteurSousPlafond_m: 3.0,
			populations: [adultes('Personnel chirurgical', 6, 'code_travail', 'bureau')],
			parametresSpecifiques: { classementZoneSante: 3 }
		})
	}
];

export function getPreset(id: string): Preset | undefined {
	return PRESETS.find((p) => p.id === id);
}

export function buildFromPreset(id: string): Local | null {
	const p = getPreset(id);
	if (!p) return null;
	return p.build(pid());
}

export function newLocalId(): string {
	return pid();
}
