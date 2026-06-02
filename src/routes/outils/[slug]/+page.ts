import { error } from '@sveltejs/kit';
import { getTool, builtTools } from '$lib/tools/registry';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => builtTools().map((t) => ({ slug: t.slug }));

export const load: PageLoad = ({ params }) => {
	const tool = getTool(params.slug);
	if (!tool || tool.external || tool.status !== 'done') error(404, 'Outil introuvable');
	return { tool };
};
