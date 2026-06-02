import stationsRaw from './data/stations.json';
import indexRaw from './data/index.json';
import type { IndexEntry, IndexFile, Station, StationData, StationsFile } from './types';

const stationsFile = stationsRaw as StationsFile;
const indexFile = indexRaw as IndexFile;

export const STATIONS: Station[] = stationsFile.stations;
export const INDEX_ENTRIES: IndexEntry[] = indexFile.stations;

const indexById = new Map(INDEX_ENTRIES.map((e) => [e.id, e]));

export const DATA_METADATA = {
	baseHeating: indexFile.metadata.baseHeating,
	baseCooling: indexFile.metadata.baseCooling,
	source: indexFile.metadata.source,
	generatedAt: indexFile.metadata.generatedAt
};

export function getStation(id: string): Station | undefined {
	return STATIONS.find((s) => s.id === id);
}

const TOTAL_YEARS_TARGET = 16; // 2010 → 2025 inclus

export function stationsByDept(dept: string): Station[] {
	return STATIONS.filter((s) => s.dept === dept).sort((a, b) => {
		const ya = indexById.get(a.id)?.yearsCount ?? 0;
		const yb = indexById.get(b.id)?.yearsCount ?? 0;
		return yb - ya;
	});
}

export function isDataAvailable(stationId: string): boolean {
	return indexById.has(stationId);
}

export function getIndexEntry(stationId: string): IndexEntry | undefined {
	return indexById.get(stationId);
}

export function getYearsCount(stationId: string): number {
	return indexById.get(stationId)?.yearsCount ?? 0;
}

export { TOTAL_YEARS_TARGET };

/** Charge dynamiquement les données mensuelles d'une station. */
export async function loadStationData(stationId: string): Promise<StationData> {
	if (!isDataAvailable(stationId)) {
		throw new Error(`Données indisponibles pour la station ${stationId}.`);
	}
	const res = await fetch(`/data/dju/${stationId}.json`);
	if (!res.ok) {
		throw new Error(`Échec de chargement (${res.status}) pour la station ${stationId}.`);
	}
	return (await res.json()) as StationData;
}

export const MONTH_LABELS = [
	'Janv',
	'Févr',
	'Mars',
	'Avr',
	'Mai',
	'Juin',
	'Juil',
	'Août',
	'Sept',
	'Oct',
	'Nov',
	'Déc'
];
