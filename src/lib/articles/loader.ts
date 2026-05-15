import type { Article, ArticleFrontmatter } from './types';

const WORDS_PER_MINUTE = 220;

type ArticleModule = { metadata: ArticleFrontmatter; default: unknown };

const modules = import.meta.glob<ArticleModule>('/src/content/articles/*.md', { eager: true });

const slugFromPath = (path: string): string =>
	(path.split('/').pop() ?? '').replace(/\.md$/, '');

const computeReadingTime = (text: string): number => {
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
};

const articles: Article[] = Object.entries(modules)
	.map(([path, mod]) => {
		const { reading_time, ...fm } = mod.metadata;
		return {
			...fm,
			slug: slugFromPath(path),
			reading_time: reading_time ?? computeReadingTime(fm.excerpt ?? '')
		};
	})
	.sort((a, b) => b.date.localeCompare(a.date));

export const getAllArticles = (): Article[] => articles;

export const getArticleBySlug = (slug: string): Article | undefined =>
	articles.find((a) => a.slug === slug);

export const getArticleComponent = (slug: string): unknown =>
	modules[`/src/content/articles/${slug}.md`]?.default;
