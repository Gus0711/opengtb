import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import mdsvexConfig from './mdsvex.config.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			// Coquille SPA servie par Caddy pour les URL inconnues → +error.svelte (404).
			fallback: '404.html',
			strict: false
		}),
		prerender: {
			handleHttpError: 'fail',
			handleMissingId: 'fail',
			// La route [slug] sert de placeholder « implémentation à venir » et
			// n'est plus liée nulle part depuis que chaque outil a sa route
			// dédiée — on tolère son absence dans le crawl plutôt que de planter
			// le build.
			handleUnseenRoutes: 'warn'
		}
	},
	preprocess: [mdsvex(mdsvexConfig)],
	extensions: ['.svelte', '.svx', '.md']
};

export default config;
