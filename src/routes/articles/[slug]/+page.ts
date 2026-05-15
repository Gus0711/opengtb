import { error } from '@sveltejs/kit';
import { getAllArticles, getArticleBySlug, getArticleComponent } from '$lib/articles/loader';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => getAllArticles().map((a) => ({ slug: a.slug }));

export const load: PageLoad = ({ params }) => {
	const article = getArticleBySlug(params.slug);
	const Component = getArticleComponent(params.slug);
	if (!article || !Component) error(404, 'Article introuvable');
	return { article, Component };
};
