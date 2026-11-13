import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig( {
	resolve: {
		alias: {
			'@backend/liwe3/src/crypto': path.resolve( __dirname, '../../../backend/core/src/crypto.ts' ),
			'@backend/liwe3': path.resolve( __dirname, '../../../backend/core/src/index.ts' ),
		},
	},
	test: {
		environment: 'node',
		globals: true,
		include: [
			'tests/validation.test.ts',
			'tests/methods-simple.test.ts',
			'tests/comprehensive.test.ts',
			'tests/tag-list.test.ts',
			'tests/call-events.test.ts',
			'tests/route-gates.test.ts',
		],
		exclude: [ 'tests/methods.test.ts', 'tests/integration.test.ts', 'tests/edge-cases.test.ts' ],
		coverage: {
			reporter: [ 'text', 'json', 'html' ],
			include: [ 'src/**/*.ts' ],
			exclude: [ 'src/**/*.d.ts' ],
		},
	},
} );
