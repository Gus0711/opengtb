export const SITE_NAME = 'OpenGTB';
export const SITE_URL = 'https://opengtb.fr';
const DEFAULT_DESCRIPTION =
	'La boîte à outils des intégrateurs GTB & IoT — 12 outils gratuits, en local dans le navigateur.';
const DEFAULT_OG_IMAGE = '/og/default.png';

export interface MetaInput {
	title?: string;
	description?: string;
	image?: string;
	url?: string;
	type?: 'website' | 'article';
}

export interface ResolvedMeta {
	title: string;
	description: string;
	image: string;
	url?: string;
	type: 'website' | 'article';
}

export function buildMeta(input: MetaInput = {}): ResolvedMeta {
	return {
		title: input.title ? `${input.title} · ${SITE_NAME}` : SITE_NAME,
		description: input.description ?? DEFAULT_DESCRIPTION,
		image: input.image ?? DEFAULT_OG_IMAGE,
		url: input.url,
		type: input.type ?? 'website'
	};
}
