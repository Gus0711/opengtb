export type CategorySlug =
	| 'temperature'
	| 'pression'
	| 'debit'
	| 'puissance'
	| 'energie'
	| 'vitesse-air'
	| 'volume';

/**
 * Une unité est définie par son facteur vers l'unité de référence de la
 * catégorie (multiplicatif), ou par un couple de fonctions
 * toReference / fromReference quand la conversion est affine (T°).
 */
export interface LinearUnit {
	id: string;
	label: string;
	/** valeur dans l'unité × factor = valeur dans l'unité de référence */
	factor: number;
}

export interface AffineUnit {
	id: string;
	label: string;
	toReference: (v: number) => number;
	fromReference: (v: number) => number;
}

export type Unit = LinearUnit | AffineUnit;

export interface Category {
	slug: CategorySlug;
	name: string;
	/** Unité par défaut au reset (id) */
	defaultUnit: string;
	units: Unit[];
}

export const isAffine = (u: Unit): u is AffineUnit =>
	(u as AffineUnit).toReference !== undefined;
