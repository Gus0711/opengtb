import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

import { svgAdminPlugin } from './scripts/vite-svg-admin-plugin';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), svgAdminPlugin()],
	server: {
		host: '0.0.0.0',
		allowedHosts: ['opengtb.datagtb.com'],
		// En dev : `node api/server.mjs` (DATA_DIR=./tmp/api) pour le compteur et /messages.
		proxy: { '/api': 'http://localhost:8080' }
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.{js,ts}'],
		environment: 'node'
	}
});
