import type { Preset } from './types';

export const PRESETS: Preset[] = [
	{
		id: 'pavillon-80-rad-ht',
		name: 'Pavillon années 80 + radiateurs HT',
		state: {
			building: { mode: 'fourchette', isolation: 'mauvaise' },
			emitter: 'rad-ht',
			zone: 'H1',
			tAmbiance: 20
		}
	},
	{
		id: 'logement-rt2012-plancher',
		name: 'Logement RT 2012 + plancher chauffant',
		state: {
			building: { mode: 'fourchette', isolation: 'bonne' },
			emitter: 'plancher',
			zone: 'H1',
			tAmbiance: 20
		}
	},
	{
		id: 'tertiaire-ancien-vcv',
		name: 'Tertiaire ancien + ventilo-convecteurs',
		state: {
			building: { mode: 'fourchette', isolation: 'mauvaise' },
			emitter: 'vcv',
			zone: 'H1',
			tAmbiance: 21
		}
	},
	{
		id: 'maison-re2020-pac',
		name: 'Maison RE 2020 + PAC + plancher chauffant',
		state: {
			building: { mode: 'fourchette', isolation: 'tres-bonne' },
			emitter: 'plancher',
			zone: 'H2',
			tAmbiance: 20
		}
	},
	{
		id: 'atelier-aerothermes',
		name: 'Atelier industriel + aérothermes',
		state: {
			building: { mode: 'fourchette', isolation: 'passoire' },
			emitter: 'aero',
			zone: 'H1',
			tAmbiance: 16
		}
	}
];
