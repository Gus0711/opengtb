export type Mode = 'decouverte' | 'pro';

export type EmitterId = 'rad-ht' | 'rad-bt' | 'plancher' | 'vcv' | 'aero';

export interface EmitterSpec {
	id: EmitterId;
	name: string;
	short: string;
	regime: { departure: number; return: number };
	defaultMinT: number;
	defaultMaxT: number;
	typicalSlopeRange: { min: number; max: number };
	description: string;
	source: string;
}

export type IsolationLevel = 'passoire' | 'mauvaise' | 'moyenne' | 'bonne' | 'tres-bonne';

export interface IsolationSpec {
	id: IsolationLevel;
	name: string;
	dpeEquivalent: string;
	description: string;
	ubatRange: { min: number; max: number };
	ubatTypical: number;
}

export type ClimateZoneId = 'H1' | 'H2' | 'H3';

export interface ClimateZoneSpec {
	id: ClimateZoneId;
	name: string;
	baseTemp: number;
	description: string;
}

export interface PeriodSpec {
	id: string;
	name: string;
	yearStart: number;
	yearEnd: number;
	ubatRange: { min: number; max: number };
	ubatTypical: number;
	note: string;
}

export type BuildingInputMode = 'ubat' | 'annee' | 'fourchette';

export interface BuildingInputs {
	mode: BuildingInputMode;
	ubat?: number;
	annee?: number;
	renoveAnnee?: number;
	isolation?: IsolationLevel;
}

export interface LoiEauParams {
	pente: number;
	parallele: number;
	tMin: number;
	tMax: number;
	tPivot: number;
}

export interface LoiEauState {
	mode: Mode;
	building: BuildingInputs;
	emitter: EmitterId;
	zone: ClimateZoneId;
	tAmbiance: number;
	params: LoiEauParams;
	tExt: number;
}

export type DiagnosticLevel = 'ok' | 'info' | 'warn' | 'error';

export interface Diagnostic {
	level: DiagnosticLevel;
	message: string;
	hint?: string;
}

export interface Preset {
	id: string;
	name: string;
	state: Partial<LoiEauState> & {
		building: BuildingInputs;
		emitter: EmitterId;
		zone: ClimateZoneId;
	};
}
