import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

import { svgAdminPlugin } from './scripts/vite-svg-admin-plugin';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), svgAdminPlugin()],
	server: {
		host: '0.0.0.0',
		allowedHosts: ['opengtb.datagtb.com']
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.{js,ts}'],
		environment: 'node'
	}
});
