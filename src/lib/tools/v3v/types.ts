export type FluidId = 'eau' | 'meg' | 'mpg';

export type Verdict = 'optimal' | 'acceptable' | 'limite' | 'rejete';

export interface V3VInputs {
	/** kW */
	puissance?: number;
	/** m³/h */
	debit?: number;
	/** K */
	deltaT?: number;
	fluide: FluidId;
	/** % vol (0–60) */
	glycolPct?: number;
	/** kPa */
	dpr: number;
	/** 0.3 – 0.8 */
	autoriteCible: number;
	/** DN tuyauterie pour comparaison (optionnel) */
	dnTuyauterie?: number;
	/** ΔPv max admissible vanne (kPa) — optionnel */
	dpvMax?: number;
	/** Température fluide (°C) */
	temperature: number;
}

export interface Alternative {
	kvs: number;
	dpv_kPa: number;
	autorite: number;
	verdict: Verdict;
}

export interface Hypotheses {
	/** J/(kg·K) */
	cp: number;
	/** kg/m³ */
	rho: number;
	/** kWh/(m³·K) */
	coefVolumique: number;
	formule: string;
}

export interface V3VResult {
	/** m³/h — utilisé pour le dimensionnement (saisi ou calculé) */
	debitCalcule: number;
	/** Indique si debit a été calculé depuis P et ΔT */
	debitCalculDepuisP: boolean;
	puissanceCalculee?: number;
	deltaTCalcule?: number;

	kvTheorique: number;
	kvsRetenu: number;
	kvsInferieur: number;
	kvsSuperieur: number;

	plageDN: [number, number] | null;

	dpvReelle_kPa: number;
	dpvReelle_bar: number;
	autoriteReelle: number;

	verdict: Verdict;
	justification: string;

	alternatives: Alternative[];
	warnings: string[];

	hypotheses: Hypotheses;
}
