/**
 * Tables des désignations commerciales de tubes hydrauliques.
 *
 * Pour chaque matériau, on stocke (⌀ext, épaisseur, ⌀int) en mm. Le ⌀int
 * est précalculé à partir de (ext - 2·ep) ou pris directement du catalogue
 * fabricant quand il est plus précis (ex : tolérances PER multicouche).
 *
 * Tri par ⌀int croissant — indispensable pour l'auto-dim qui itère du plus
 * petit au plus grand.
 *
 * Sources normatives par matériau (voir constants par bloc).
 */

import type { Designation, MateriauId } from '../types';

/* ============================================================ */
/*  Cuivre — NF EN 1057 (tubes ronds en cuivre)                  */
/* ============================================================ */

/** Tubes cuivre écrouis ou recuits, dimensions courantes CVC. */
export const CUIVRE: ReadonlyArray<Designation> = [
	{ id: '12x1', label: '12 × 1', extMm: 12, epMm: 1.0, intMm: 10 },
	{ id: '14x1', label: '14 × 1', extMm: 14, epMm: 1.0, intMm: 12 },
	{ id: '16x1', label: '16 × 1', extMm: 16, epMm: 1.0, intMm: 14 },
	{ id: '18x1', label: '18 × 1', extMm: 18, epMm: 1.0, intMm: 16 },
	{ id: '22x1', label: '22 × 1', extMm: 22, epMm: 1.0, intMm: 20 },
	{ id: '28x1.5', label: '28 × 1.5', extMm: 28, epMm: 1.5, intMm: 25 },
	{ id: '35x1.5', label: '35 × 1.5', extMm: 35, epMm: 1.5, intMm: 32 },
	{ id: '42x1.5', label: '42 × 1.5', extMm: 42, epMm: 1.5, intMm: 39 },
	{ id: '54x2', label: '54 × 2', extMm: 54, epMm: 2.0, intMm: 50 }
];

/* ============================================================ */
/*  PER — NF EN ISO 15875 (tube PE-X)                            */
/* ============================================================ */

export const PER: ReadonlyArray<Designation> = [
	{ id: '16x1.5', label: '16 × 1.5', extMm: 16, epMm: 1.5, intMm: 13.0 },
	{ id: '20x1.9', label: '20 × 1.9', extMm: 20, epMm: 1.9, intMm: 16.2 },
	{ id: '25x2.3', label: '25 × 2.3', extMm: 25, epMm: 2.3, intMm: 20.4 },
	{ id: '32x2.9', label: '32 × 2.9', extMm: 32, epMm: 2.9, intMm: 26.2 }
];

/* ============================================================ */
/*  Multicouche — PE-Al-PE (norme constructeur ATEC)              */
/* ============================================================ */

export const MULTICOUCHE: ReadonlyArray<Designation> = [
	{ id: '16x2', label: '16 × 2', extMm: 16, epMm: 2, intMm: 12 },
	{ id: '20x2', label: '20 × 2', extMm: 20, epMm: 2, intMm: 16 },
	{ id: '26x3', label: '26 × 3', extMm: 26, epMm: 3, intMm: 20 },
	{ id: '32x3', label: '32 × 3', extMm: 32, epMm: 3, intMm: 26 }
];

/* ============================================================ */
/*  Acier noir — NF EN 10255 série M (chauffage / distribution) */
/* ============================================================ */

export const ACIER_NOIR: ReadonlyArray<Designation> = [
	{ id: 'DN15', label: 'DN 15 (½")', extMm: 21.3, epMm: 2.6, intMm: 16.1 },
	{ id: 'DN20', label: 'DN 20 (¾")', extMm: 26.9, epMm: 2.6, intMm: 21.7 },
	{ id: 'DN25', label: 'DN 25 (1")', extMm: 33.7, epMm: 3.2, intMm: 27.3 },
	{ id: 'DN32', label: 'DN 32 (1¼")', extMm: 42.4, epMm: 3.2, intMm: 36.0 },
	{ id: 'DN40', label: 'DN 40 (1½")', extMm: 48.3, epMm: 3.2, intMm: 41.9 },
	{ id: 'DN50', label: 'DN 50 (2")', extMm: 60.3, epMm: 3.6, intMm: 53.1 },
	{ id: 'DN65', label: 'DN 65 (2½")', extMm: 76.1, epMm: 3.6, intMm: 68.9 },
	{ id: 'DN80', label: 'DN 80 (3")', extMm: 88.9, epMm: 4.0, intMm: 80.9 },
	{ id: 'DN100', label: 'DN 100 (4")', extMm: 114.3, epMm: 4.5, intMm: 105.3 }
];

/* ============================================================ */
/*  Acier galvanisé — mêmes dimensions que l'acier noir EN 10255 */
/* ============================================================ */

/**
 * En pratique, le tube acier galvanisé partage la géométrie EN 10255 série M
 * avec l'acier noir : la galvanisation est un traitement de surface, pas un
 * changement dimensionnel.
 */
export const ACIER_GALVANISE: ReadonlyArray<Designation> = ACIER_NOIR;

/* ============================================================ */
/*  Acier inox — NF EN 10312 série 2 (paroi mince)               */
/* ============================================================ */

/**
 * Tubes inox soudés à paroi mince pour distribution d'eau (chauffage,
 * sanitaire), série 2 ("light") d'EN 10312:2002+A1.
 *
 * Source : catalogue SAPIM-INOX (tubes à sertir 304L/316L, agrément CSTB,
 * exécution selon EN 10217-7 / EN 10312), série métrique standard utilisée
 * en France (PB Tub SERTIsteel, Viega Sanpress Inox, Geberit Mapress Inox).
 *
 * **ATTENTION** : les ⌀ extérieurs EN 10312 (18/22/28/35/42/54/76.1/88.9/108)
 * sont **différents** de ceux de l'acier noir EN 10255-M
 * (21.3/26.9/33.7/42.4/48.3/60.3/...). Ne pas confondre.
 *
 * Tolérance ⌀int : ±0.2 à ±0.3 mm (cumul tolérance épaisseur).
 */
export const ACIER_INOX: ReadonlyArray<Designation> = [
	{ id: 'DN15', label: 'DN 15 — 18 × 1.0', extMm: 18.0, epMm: 1.0, intMm: 16.0 },
	{ id: 'DN20', label: 'DN 20 — 22 × 1.2', extMm: 22.0, epMm: 1.2, intMm: 19.6 },
	{ id: 'DN25', label: 'DN 25 — 28 × 1.2', extMm: 28.0, epMm: 1.2, intMm: 25.6 },
	{ id: 'DN32', label: 'DN 32 — 35 × 1.5', extMm: 35.0, epMm: 1.5, intMm: 32.0 },
	{ id: 'DN40', label: 'DN 40 — 42 × 1.5', extMm: 42.0, epMm: 1.5, intMm: 39.0 },
	{ id: 'DN50', label: 'DN 50 — 54 × 1.5', extMm: 54.0, epMm: 1.5, intMm: 51.0 },
	{ id: 'DN65', label: 'DN 65 — 76.1 × 2.0', extMm: 76.1, epMm: 2.0, intMm: 72.1 },
	{ id: 'DN80', label: 'DN 80 — 88.9 × 2.0', extMm: 88.9, epMm: 2.0, intMm: 84.9 },
	{ id: 'DN100', label: 'DN 100 — 108 × 2.0', extMm: 108.0, epMm: 2.0, intMm: 104.0 }
];

/* ============================================================ */
/*  PVC pression — NF EN ISO 1452, PN16                          */
/* ============================================================ */

export const PVC: ReadonlyArray<Designation> = [
	{ id: 'DN16', label: 'DN 16', extMm: 16, epMm: 1.5, intMm: 13.0 },
	{ id: 'DN20', label: 'DN 20', extMm: 20, epMm: 1.9, intMm: 16.2 },
	{ id: 'DN25', label: 'DN 25', extMm: 25, epMm: 2.3, intMm: 20.4 },
	{ id: 'DN32', label: 'DN 32', extMm: 32, epMm: 2.9, intMm: 26.2 },
	{ id: 'DN40', label: 'DN 40', extMm: 40, epMm: 3.7, intMm: 32.6 },
	{ id: 'DN50', label: 'DN 50', extMm: 50, epMm: 4.6, intMm: 40.8 },
	{ id: 'DN63', label: 'DN 63', extMm: 63, epMm: 5.8, intMm: 51.4 },
	{ id: 'DN75', label: 'DN 75', extMm: 75, epMm: 6.8, intMm: 61.4 },
	{ id: 'DN90', label: 'DN 90', extMm: 90, epMm: 8.2, intMm: 73.6 },
	{ id: 'DN110', label: 'DN 110', extMm: 110, epMm: 10.0, intMm: 90.0 }
];

/* ============================================================ */
/*  PEHD — assimilé PER (PE haute densité, normes EN 12201)       */
/* ============================================================ */

export const PEHD: ReadonlyArray<Designation> = PER;

/* ============================================================ */
/*  Fonte — DN courants (NF EN 545)                              */
/* ============================================================ */

/**
 * Dimensions indicatives — la fonte ductile EN 545 est rarement utilisée en
 * chauffage tertiaire, plus en adduction d'eau. On garde une table minimale
 * pour permettre les comparaisons. ⌀ext ≈ DN + 30 à 50 mm selon le DN.
 */
export const FONTE: ReadonlyArray<Designation> = [
	{ id: 'DN60', label: 'DN 60', extMm: 77, epMm: 6, intMm: 65 },
	{ id: 'DN80', label: 'DN 80', extMm: 98, epMm: 6, intMm: 86 },
	{ id: 'DN100', label: 'DN 100', extMm: 118, epMm: 6.1, intMm: 105.8 },
	{ id: 'DN125', label: 'DN 125', extMm: 144, epMm: 6.2, intMm: 131.6 },
	{ id: 'DN150', label: 'DN 150', extMm: 170, epMm: 6.3, intMm: 157.4 }
];

/* ============================================================ */
/*  Index par matériau                                           */
/* ============================================================ */

export const DESIGNATIONS_PAR_MATERIAU: Record<MateriauId, ReadonlyArray<Designation>> = {
	cuivre_neuf: CUIVRE,
	cuivre_vieilli: CUIVRE,
	acier_noir_neuf: ACIER_NOIR,
	acier_noir_usage: ACIER_NOIR,
	acier_galvanise: ACIER_GALVANISE,
	acier_inox_poli: ACIER_INOX,
	fonte_neuve: FONTE,
	fonte_vieillie: FONTE,
	pvc: PVC,
	per: PER,
	pehd: PEHD,
	multicouche: MULTICOUCHE
};
