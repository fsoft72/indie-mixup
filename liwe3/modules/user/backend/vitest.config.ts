import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig( {
	resolve: {
		alias: {
			'@backend/liwe3/src/crypto': path.resolve( __dirname, '../../../backend/core/src/crypto.ts' ),
			'@backend/liwe3/src/email-templates': path.resolve( __dirname, '../../../backend/core/src/email-templates.ts' ),
			'@backend/liwe3': path.resolve( __dirname, '../../../backend/core/src/index.ts' ),
		},
	},
	test: {
		environment: 'node',
		globals: true,
		include: [ 'tests/**/*.test.ts' ],
		coverage: {
			reporter: [ 'text', 'json', 'html' ],
			include: [ 'src/**/*.ts' ],
			exclude: [ 'src/**/*.d.ts' ],
		},
	},
} );
