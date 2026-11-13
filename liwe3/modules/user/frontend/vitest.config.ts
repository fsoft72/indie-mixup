import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

export default defineConfig( {
	resolve: {
		alias: {
			'@frontend/liwe3': path.resolve( __dirname, 'tests/__mocks__/@frontend/liwe3.ts' ),
		},
	},
	test: {
		environment: 'node',
		globals: true,
	},
} );
