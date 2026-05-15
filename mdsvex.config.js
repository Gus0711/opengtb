import { defineMDSveXConfig as defineConfig } from 'mdsvex';
import { getSingletonHighlighter } from 'shiki';

const SHIKI_THEME = 'github-dark';
const SHIKI_LANGS = [
	'bash',
	'shell',
	'yaml',
	'json',
	'dockerfile',
	'docker',
	'typescript',
	'javascript',
	'svelte',
	'html',
	'css',
	'text'
];

let highlighterPromise;
const getHighlighter = () =>
	(highlighterPromise ??= getSingletonHighlighter({
		themes: [SHIKI_THEME],
		langs: SHIKI_LANGS
	}));

const WORDS_PER_MINUTE = 220;

// Plugin remark : compte les mots du corps (text + code) et écrit
// `reading_time` dans le front-matter, exposé ensuite comme metadata.
const readingTimePlugin = () => (tree, file) => {
	let words = 0;
	const visit = (node) => {
		if (!node) return;
		if (node.type === 'text') {
			words += node.value.trim().split(/\s+/).filter(Boolean).length;
		} else if (node.type === 'code') {
			// On compte les lignes de code à 4 mots-équivalents : un bloc
			// de code prend du temps de lecture mais moins qu'un même
			// volume de prose.
			words += node.value.split('\n').length * 4;
		}
		if (Array.isArray(node.children)) node.children.forEach(visit);
	};
	visit(tree);
	const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
	file.data.fm = file.data.fm ?? {};
	if (file.data.fm.reading_time == null) {
		file.data.fm.reading_time = minutes;
	}
};

export default defineConfig({
	extensions: ['.svx', '.md'],
	smartypants: { dashes: 'oldschool' },
	remarkPlugins: [readingTimePlugin],
	highlight: {
		highlighter: async (code, lang = 'text') => {
			const safeLang = SHIKI_LANGS.includes(lang) ? lang : 'text';
			const h = await getHighlighter();
			const html = h.codeToHtml(code, { lang: safeLang, theme: SHIKI_THEME });
			// Les accolades sont interprétées par Svelte → échappement en
			// entités HTML pour que le code source reste inerte.
			const safe = html.replace(/[{}`]/g, (c) =>
				c === '{' ? '&#123;' : c === '}' ? '&#125;' : '&#96;'
			);
			return `{@html \`${safe}\`}`;
		}
	}
});
