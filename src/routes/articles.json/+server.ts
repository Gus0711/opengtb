// Index léger des articles (slug + titre), prérendu en /articles.json.
// Chargé à la demande par le terminal, pour ne pas embarquer les articles
// dans le bundle commun à toutes les pages.
import { json } from '@sveltejs/kit';
import { getAllArticles } from '$lib/articles/loader';

export const prerender = true;

export const GET = () =>
	json(getAllArticles().map(({ slug, title }) => ({ slug, title })));
