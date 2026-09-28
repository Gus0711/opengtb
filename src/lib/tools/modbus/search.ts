// Recherche + facettes pour la page index /outils/modbus.
//
// Pas de dépendance externe (fuzzy maison, suffisant à l'échelle ~300 devices).

import type { EquipmentType, ModbusManifestDevice, ModbusTransport } from './types.ts';

export type ModbusReviewFilter = 'all' | 'verified' | 'needs-review';

export type ModbusSort =
	| 'catalogue'
	| 'name-asc'
	| 'vendor-asc'
	| 'registers-desc'
	| 'registers-asc';

export interface ModbusFilters {
	/** Texte libre — matching insensible à la casse / accents. */
	query: string;
	vendors: string[];
	equipmentTypes: EquipmentType[];
	transports: ModbusTransport[];
	review: ModbusReviewFilter;
	sort: ModbusSort;
}

export const EMPTY_FILTERS: ModbusFilters = {
	query: '',
	vendors: [],
	equipmentTypes: [],
	transports: [],
	review: 'all',
	sort: 'catalogue'
};

function normalize(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
}

/**
 * Vrai si chaque token de la query apparaît quelque part dans le haystack
 * (vendor, model, name, slug, tags). Approche AND, qui correspond à
 * l'attente naturelle d'un champ "rechercher".
 */
export function matchesQuery(device: ModbusManifestDevice, query: string): boolean {
	const tokens = normalize(query.trim()).split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return true;
	const haystack = normalize(
		[device.vendor, device.model, device.name, device.slug, (device.tags ?? []).join(' ')].join(' ')
	);
	return tokens.every((t) => haystack.includes(t));
}

/** Applique tous les filtres en intersection. */
export function filterDevices(
	devices: ModbusManifestDevice[],
	filters: ModbusFilters
): ModbusManifestDevice[] {
	const vendorSet = new Set(filters.vendors);
	const typeSet = new Set(filters.equipmentTypes);
	const transportSet = new Set(filters.transports);
	const list = devices.filter((d) => {
		if (vendorSet.size > 0 && !vendorSet.has(d.vendor)) return false;
		if (typeSet.size > 0 && !typeSet.has(d.equipmentType)) return false;
		if (transportSet.size > 0 && !d.transport.some((t) => transportSet.has(t))) return false;
		if (filters.review === 'verified' && d.needsReview) return false;
		if (filters.review === 'needs-review' && !d.needsReview) return false;
		return matchesQuery(d, filters.query);
	});
	return sortDevices(list, filters.sort);
}

function sortDevices(devices: ModbusManifestDevice[], sort: ModbusSort): ModbusManifestDevice[] {
	if (sort === 'catalogue') return devices;
	const list = [...devices];
	list.sort((a, b) => {
		const fallback =
			a.vendor.localeCompare(b.vendor, 'fr') ||
			a.model.localeCompare(b.model, 'fr') ||
			a.slug.localeCompare(b.slug, 'fr');

		switch (sort) {
			case 'name-asc':
				return a.name.localeCompare(b.name, 'fr') || fallback;
			case 'vendor-asc':
				return fallback;
			case 'registers-desc':
				return b.registerCount - a.registerCount || fallback;
			case 'registers-asc':
				return a.registerCount - b.registerCount || fallback;
			default:
				return fallback;
		}
	});
	return list;
}

/** Compte les occurrences pour une facette donnée, en tenant compte des autres filtres. */
export function facetCounts<K extends keyof ModbusManifestDevice>(
	devices: ModbusManifestDevice[],
	filters: ModbusFilters,
	field: K
): Map<string, number> {
	// On retire le filtre sur le champ courant pour calculer les comptes en "et si je cochais cette facette".
	const subset = filterDevices(devices, { ...filters, [fieldToFilter(field)]: [] } as ModbusFilters);
	const out = new Map<string, number>();
	for (const d of subset) {
		const v = d[field];
		if (Array.isArray(v)) {
			for (const item of v) out.set(String(item), (out.get(String(item)) ?? 0) + 1);
		} else if (v) {
			out.set(String(v), (out.get(String(v)) ?? 0) + 1);
		}
	}
	return out;
}

function fieldToFilter(field: keyof ModbusManifestDevice): keyof ModbusFilters {
	switch (field) {
		case 'vendor':
			return 'vendors';
		case 'equipmentType':
			return 'equipmentTypes';
		case 'transport':
			return 'transports';
		default:
			return 'query';
	}
}

/** Sérialise un état de filtre vers query params URL (omet les vides). */
export function filtersToQuery(filters: ModbusFilters): string {
	const params = new URLSearchParams();
	if (filters.query.trim()) params.set('q', filters.query.trim());
	if (filters.vendors.length) params.set('vendor', filters.vendors.join(','));
	if (filters.equipmentTypes.length) params.set('type', filters.equipmentTypes.join(','));
	if (filters.transports.length) params.set('transport', filters.transports.join(','));
	if (filters.review !== 'all') params.set('quality', filters.review);
	if (filters.sort !== 'catalogue') params.set('sort', filters.sort);
	const s = params.toString();
	return s ? `?${s}` : '';
}

export function filtersFromQuery(search: URLSearchParams): ModbusFilters {
	return {
		query: search.get('q') ?? '',
		vendors: split(search.get('vendor')),
		equipmentTypes: split(search.get('type')) as EquipmentType[],
		transports: split(search.get('transport')) as ModbusTransport[],
		review: parseReview(search.get('quality')),
		sort: parseSort(search.get('sort'))
	};
}

function split(v: string | null): string[] {
	return v ? v.split(',').filter(Boolean) : [];
}

function parseReview(value: string | null): ModbusReviewFilter {
	return value === 'verified' || value === 'needs-review' ? value : 'all';
}

function parseSort(value: string | null): ModbusSort {
	switch (value) {
		case 'name-asc':
		case 'vendor-asc':
		case 'registers-desc':
		case 'registers-asc':
			return value;
		default:
			return 'catalogue';
	}
}
