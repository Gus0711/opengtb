/**
 * Constantes de dimensionnement V3V — séries Kvs, plages DN, propriétés fluides.
 *
 * Sources :
 *   - Série Kvs R5 (Renard) : valeurs catalogue communes Siemens VBI, Belimo R/H,
 *     Caleffi 6370.
 *   - Plages DN : indicatives, agrégées de catalogues constructeurs courants.
 *   - Eau : cp = 4186 J/(kg·K), ρ = 1000 kg/m³ → cp·ρ/3.6e6 = 1.163 kWh/(m³·K).
 *   - Eau glycolée : tables Dow/MEGlobal/Clariant Antifrogen à T moyenne ≈ 70 °C.
 *     À 30 % MEG : cp ≈ 3.78 kJ/(kg·K), ρ ≈ 1037 kg/m³ → coef vol ≈ 1.089 kWh/(m³·K)
 *     (cohérent avec la valeur de référence ABCclim/XPair pour mélange typique CVC).
 */

export const KVS_SERIES = [
	0.1, 0.16, 0.25, 0.4, 0.63, 1.0, 1.6, 2.5, 4.0, 6.3, 10, 16, 25, 40, 63, 100, 160, 250, 400
] as const;

export const DN_LIST = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200] as const;

/** Plage Kvs typiquement disponible par DN sur les V3V soupape. Indicatif. */
export const DN_KVS_RANGES: Record<number, readonly [number, number]> = {
	15: [0.25, 4.0],
	20: [2.5, 6.3],
	25: [4.0, 10],
	32: [6.3, 16],
	40: [10, 25],
	50: [16, 40],
	65: [25, 63],
	80: [40, 100],
	100: [63, 160],
	125: [100, 250],
	150: [160, 400]
};

export const COEF_VOL_EAU = 1.163; // kWh/(m³·K), valeur de référence à 20 °C
export const CP_EAU = 4186; // J/(kg·K)
export const RHO_EAU = 1000; // kg/m³ (référence Kv)

/**
 * Tables [pct, cp J/(kg·K), ρ kg/m³] pour mélanges eau + glycol à T ≈ 70 °C.
 * Interpolation linéaire entre les points, clamp aux extrémités.
 */
export const MEG_TABLE: ReadonlyArray<readonly [number, number, number]> = [
	[0, 4186, 1000],
	[10, 4040, 1014],
	[20, 3910, 1027],
	[30, 3780, 1037],
	[40, 3580, 1051],
	[50, 3380, 1065],
	[60, 3180, 1079]
];

export const MPG_TABLE: ReadonlyArray<readonly [number, number, number]> = [
	[0, 4186, 1000],
	[10, 4060, 1006],
	[20, 3930, 1014],
	[30, 3790, 1023],
	[40, 3640, 1031],
	[50, 3480, 1038],
	[60, 3300, 1045]
];

export const FLUIDES: { id: 'eau' | 'meg' | 'mpg'; label: string }[] = [
	{ id: 'eau', label: 'Eau pure' },
	{ id: 'meg', label: 'Eau + mono-éthylène glycol (MEG)' },
	{ id: 'mpg', label: 'Eau + mono-propylène glycol (MPG)' }
];
