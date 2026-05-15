import type { Category } from './types';

/**
 * Catégories triées par fréquence d'usage en GTB.
 * Pour chaque catégorie, la première unité linéaire = unité de référence
 * (factor === 1). Les autres ont leur facteur vers cette référence.
 *
 * Sources facteurs notables :
 *   - mmCE → Pa : 1 mmCE = 9.80665 Pa (g=9.80665, ρ_eau=1000)
 *   - psi → Pa : 1 psi = 6894.757293168 Pa
 *   - CFM → m³/s : 1 CFM = 0.00047194745 m³/s
 *   - BTU → J : 1 BTU(IT) = 1055.05585262 J
 *   - kcal → J : 1 kcal = 4184 J
 *   - thermie → J : 1 th = 1 Mcal = 4.184e6 J
 *   - ch métrique → W : 1 ch = 735.49875 W
 *   - ft/min → m/s : 1 ft/min = 0.00508 m/s exact
 *   - mph → m/s : 1 mph = 0.44704 m/s
 *   - gallon US → m³ : 3.785411784e-3
 *   - gallon UK → m³ : 4.54609e-3
 *   - ft³ → m³ : 0.028316846592
 */
export const CATEGORIES: Category[] = [
	{
		slug: 'temperature',
		name: 'Température',
		defaultUnit: 'C',
		units: [
			{
				id: 'C',
				label: '°C',
				toReference: (v) => v,
				fromReference: (v) => v
			},
			{
				id: 'F',
				label: '°F',
				toReference: (v) => ((v - 32) * 5) / 9,
				fromReference: (v) => (v * 9) / 5 + 32
			},
			{
				id: 'K',
				label: 'K',
				toReference: (v) => v - 273.15,
				fromReference: (v) => v + 273.15
			}
		]
	},
	{
		slug: 'pression',
		name: 'Pression',
		defaultUnit: 'Pa',
		units: [
			{ id: 'Pa', label: 'Pa', factor: 1 },
			{ id: 'hPa', label: 'hPa', factor: 100 },
			{ id: 'kPa', label: 'kPa', factor: 1000 },
			{ id: 'mbar', label: 'mbar', factor: 100 },
			{ id: 'bar', label: 'bar', factor: 100000 },
			{ id: 'mmCE', label: 'mmCE', factor: 9.80665 },
			{ id: 'psi', label: 'psi', factor: 6894.757293168 }
		]
	},
	{
		slug: 'debit',
		name: 'Débit',
		defaultUnit: 'm3h',
		units: [
			// référence m³/s
			{ id: 'm3s', label: 'm³/s', factor: 1 },
			{ id: 'm3h', label: 'm³/h', factor: 1 / 3600 },
			{ id: 'Ls', label: 'L/s', factor: 1e-3 },
			{ id: 'Lmin', label: 'L/min', factor: 1e-3 / 60 },
			{ id: 'Lh', label: 'L/h', factor: 1e-3 / 3600 },
			{ id: 'CFM', label: 'CFM', factor: 0.00047194745 }
		]
	},
	{
		slug: 'puissance',
		name: 'Puissance',
		defaultUnit: 'kW',
		units: [
			{ id: 'W', label: 'W', factor: 1 },
			{ id: 'kW', label: 'kW', factor: 1000 },
			{ id: 'MW', label: 'MW', factor: 1e6 },
			{ id: 'BTUh', label: 'BTU/h', factor: 1055.05585262 / 3600 },
			{ id: 'kcalh', label: 'kcal/h', factor: 4184 / 3600 },
			{ id: 'ch', label: 'ch', factor: 735.49875 }
		]
	},
	{
		slug: 'energie',
		name: 'Énergie',
		defaultUnit: 'kWh',
		units: [
			{ id: 'J', label: 'J', factor: 1 },
			{ id: 'kJ', label: 'kJ', factor: 1000 },
			{ id: 'MJ', label: 'MJ', factor: 1e6 },
			{ id: 'Wh', label: 'Wh', factor: 3600 },
			{ id: 'kWh', label: 'kWh', factor: 3.6e6 },
			{ id: 'MWh', label: 'MWh', factor: 3.6e9 },
			{ id: 'kcal', label: 'kcal', factor: 4184 },
			{ id: 'BTU', label: 'BTU', factor: 1055.05585262 },
			{ id: 'th', label: 'thermie', factor: 4.184e6 }
		]
	},
	{
		slug: 'vitesse-air',
		name: "Vitesse d'air",
		defaultUnit: 'ms',
		units: [
			{ id: 'ms', label: 'm/s', factor: 1 },
			{ id: 'kmh', label: 'km/h', factor: 1 / 3.6 },
			{ id: 'ftmin', label: 'ft/min', factor: 0.00508 },
			{ id: 'mph', label: 'mph', factor: 0.44704 }
		]
	},
	{
		slug: 'volume',
		name: 'Volume',
		defaultUnit: 'm3',
		units: [
			{ id: 'm3', label: 'm³', factor: 1 },
			{ id: 'dm3', label: 'dm³', factor: 1e-3 },
			{ id: 'L', label: 'L', factor: 1e-3 },
			{ id: 'galUS', label: 'gal (US)', factor: 3.785411784e-3 },
			{ id: 'galUK', label: 'gal (UK)', factor: 4.54609e-3 },
			{ id: 'ft3', label: 'ft³', factor: 0.028316846592 }
		]
	}
];

export const getCategory = (slug: string): Category | undefined =>
	CATEGORIES.find((c) => c.slug === slug);

export const getUnit = (cat: Category, id: string) => cat.units.find((u) => u.id === id);
