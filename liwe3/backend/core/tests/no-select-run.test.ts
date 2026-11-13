import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P0-9 repo-wide guard.
 *
 * On a Drizzle `select()`, `.run()` returns the raw D1 driver envelope
 * (`{ success, meta, results }`), not the rows - so `const rows: T[] = ...run()`
 * compiles and then blows up at the first `.length` / `.map()`. The fix is
 * `.all()`. This test fails on any `select()...run()` chain in the source,
 * standing in for the ESLint rule P0.md asks for without pulling ESLint into a
 * dprint-only repo.
 *
 * Static source scan, same approach as `route-gate-drift.test.ts`. Scans the
 * shared code (`liwe3/`), the product app (`app/`) and the playground backend;
 * skips generated output, dependencies and test files (a test legitimately
 * mentions `.run()` in mocks and, like here, in the guard regex itself).
 */

const REPO_ROOT = join( __dirname, '..', '..', '..', '..' );

const SCAN_DIRS = [
	join( REPO_ROOT, 'liwe3' ),
	join( REPO_ROOT, 'app' ),
	join( REPO_ROOT, 'playground', 'backend', 'src' ),
];

const SKIP_DIRS = new Set( [ 'node_modules', 'dist', 'build', 'coverage', '.svelte-kit', '.wrangler', 'drizzle' ] );

/**
 * A `select( ... )` followed by any chain of `.method( ... )` calls that ends in
 * `.run(`, all within one statement. Catches `select().from(t).where(c).run()`
 * as well as `select().from(t).run()`.
 */
const OFFENDER = /\bselect\s*\([^;]*?\)\s*(?:\.\s*\w+\s*\([^;]*?\)\s*)*\.\s*run\s*\(/s;

/**
 * Recursively collects the non-test `.ts` files under a directory.
 *
 * @param dir - directory to walk
 * @returns absolute paths of the source `.ts` files found
 */
const _sourceFiles = ( dir : string ) : string[] => {
	const out : string[] = [];

	let entries;
	try {
		entries = readdirSync( dir, { withFileTypes: true } );
	} catch {
		return out; // directory not present in this checkout
	}

	for ( const entry of entries ) {
		if ( entry.isDirectory() ) {
			if ( SKIP_DIRS.has( entry.name ) || entry.name === 'tests' ) continue;
			out.push( ..._sourceFiles( join( dir, entry.name ) ) );
			continue;
		}
		const name = entry.name;
		if ( !name.endsWith( '.ts' ) ) continue;
		if ( name.endsWith( '.d.ts' ) || name.endsWith( '.test.ts' ) || name.endsWith( '.spec.ts' ) ) continue;
		out.push( join( dir, name ) );
	}

	return out;
};

describe('no .run() on a select() chain (P0-9)', () => {
	const files = SCAN_DIRS.flatMap( ( d ) => _sourceFiles( d ) );

	it('the scan reaches the sources', () => {
		expect( files.length ).toBeGreaterThan( 50 );
	});

	it('no source file ends a select() chain in .run()', () => {
		const offenders = files
			.filter( ( f ) => OFFENDER.test( readFileSync( f, 'utf8' ) ) )
			.map( ( f ) => relative( REPO_ROOT, f ) );

		expect( offenders, `use .all() instead of .run() on a select in:\n  ${offenders.join( '\n  ' )}` ).toEqual( [] );
	});
});
