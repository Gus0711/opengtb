import type { Component } from 'svelte';

export type SectorSlug =
	| 'briques-techniques'
	| 'reglementaire'
	| 'dimensionnement'
	| 'referentiels'
	| 'commissioning';

export interface Sector {
	slug: SectorSlug;
	number: string;
	name: string;
	icon: Component;
}

export type ToolStatus = 'done' | 'todo';

export interface Tool {
	slug: string;
	name: string;
	title: string;
	description: string;
	sector: SectorSlug;
	icon: Component;
	tags: string[];
	external?: string;
	status: ToolStatus;
}
