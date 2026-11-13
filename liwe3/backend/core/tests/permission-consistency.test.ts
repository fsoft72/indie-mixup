import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P0-1 Passo 2 - runtime fallback for typed permission names.
 *
 * Full declaration merging across every generated module was assessed as too
 * invasive (needs a `declare module` augmentation per perms.ts, ordering-
 * sensitive, and another full regeneration). This source-level test covers the
 * same failure class it was meant to prevent:
 *   - a route gate referencing a permission constant that does not exist
 *   - a permission constant that is declared but never registered (dead perm,
 *     like the old `activitylogs.event_add`)
 */

const MODULES_DIR = join( __dirname, '..', '..', '..', 'modules' );

/** `export const NAME = 'value';` pairs in a perms.ts. */
const declaredConsts = ( src : string ) : Map<string, string> => {
	const out = new Map<string, string>();
	for ( const m of src.matchAll( /export\s+const\s+([A-Z0-9_]+)\s*(?::[^=]+)?=\s*'([^']+)'/g ) ) {
		out.set( m[1], m[2] );
	}
	return out;
};

/** constant names referenced inside the `*_PERMISSIONS` array's `name:` fields. */
const registeredConsts = ( src : string ) : Set<string> => {
	const arr = src.match( /_PERMISSIONS\s*(?::[^=]+)?=\s*\[([\s\S]*?)\];/ );
	const out = new Set<string>();
	if ( !arr ) return out;
	for ( const m of arr[1].matchAll( /name:\s*([A-Z0-9_]+)/g ) ) out.add( m[1] );
	return out;
};

/** `*_PERM_*` identifiers used inside a `{ perms: [ ... ] }` gate in index.ts. */
const gateConsts = ( src : string ) : Set<string> => {
	const out = new Set<string>();
	for ( const m of src.matchAll( /\{\s*perms:\s*\[([^\]]*)\]/g ) ) {
		for ( const id of m[1].matchAll( /[A-Z0-9_]+_PERM_[A-Z0-9_]+/g ) ) out.add( id[0] );
	}
	return out;
};

const modules = readdirSync( MODULES_DIR ).filter( ( m ) => existsSync( join( MODULES_DIR, m, 'backend', 'src', 'perms.ts' ) ) );

describe('permission constants', () => {
	for ( const mod of modules ) {
		const permsSrc = readFileSync( join( MODULES_DIR, mod, 'backend', 'src', 'perms.ts' ), 'utf8' );
		const declared = declaredConsts( permsSrc );
		const registered = registeredConsts( permsSrc );

		it(`${mod}: every declared permission constant is also registered`, () => {
			const orphans = [ ...declared.keys() ].filter( ( c ) => !registered.has( c ) );
			expect( orphans, `declared but never registered in ${mod}/perms.ts: ${orphans.join( ', ' )}` ).toEqual( [] );
		});

		it(`${mod}: every route gate references a real permission constant`, () => {
			const idxPath = join( MODULES_DIR, mod, 'backend', 'src', 'index.ts' );
			if ( !existsSync( idxPath ) ) return;
			const used = gateConsts( readFileSync( idxPath, 'utf8' ) );
			const unknown = [ ...used ].filter( ( c ) => !declared.has( c ) );
			expect( unknown, `gate uses undeclared constant(s) in ${mod}/index.ts: ${unknown.join( ', ' )}` ).toEqual( [] );
		});
	}
});
