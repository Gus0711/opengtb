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
			fallback: undefined,
			strict: true
		}),
		prerender: {
			handleHttpError: 'fail',
			handleMissingId: 'fail',
			// TODO(after step 9 / 1st article): repasser à 'fail' (défaut strict).
			handleUnseenRoutes: 'warn'
		}
	},
	preprocess: [mdsvex(mdsvexConfig)],
	extensions: ['.svelte', '.svx', '.md']
};

export default config;
