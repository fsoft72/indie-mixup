import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig( {
	plugins: [ svelte() ],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: [ './tests/setup.ts' ],
	},
	resolve: {
		conditions: [ 'browser' ],
		alias: {
			'$app/environment': new URL( './tests/stubs/app-environment.ts', import.meta.url ).pathname,
		},
	},
} );
