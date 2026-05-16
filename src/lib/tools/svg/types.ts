export interface SvgSubtheme {
	slug: string;
	name: string;
}

export interface SvgTheme {
	slug: string;
	number: string;
	name: string;
	subthemes: SvgSubtheme[];
}

export interface SvgTag {
	slug: string;
	name: string;
}

export interface SvgTagFamily {
	slug: string;
	name: string;
	tags: SvgTag[];
}

export interface SvgTaxonomy {
	version: number;
	themes: SvgTheme[];
	tagFamilies: SvgTagFamily[];
}

export interface SvgEntry {
	slug: string;
	name: string;
	description: string;
	theme: string;
	subtheme: string;
	tags: string[];
	file: string;
	createdAt: string;
	updatedAt: string;
}

export interface SvgManifest {
	version: number;
	updatedAt: string;
	entries: SvgEntry[];
}
