import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P0-1 drift guard.
 *
 * The permission gate of every endpoint lives in `work/modules/<mod>.json`. The
 * generator projects it into `liwe3/modules/<mod>/backend/src/index.ts`. This
 * test recomputes the expected gate from the JSON and compares it to what the
 * generated `index.ts` actually registers, so it catches:
 *   - a hand-edited index.ts that the next regeneration would silently revert
 *   - a module JSON changed without regenerating
 *
 * Static comparison (no assembled app). Modules without a JSON (e.g. comment)
 * are skipped - their gates are hand-maintained by definition.
 */

const MODULES_JSON_DIR = join( __dirname, '..', '..', '..', '..', 'work', 'modules' );
const MODULES_SRC_DIR = join( __dirname, '..', '..', '..', 'modules' );

/** name -> TS constant, same rule as gen_be_perms / gen_be_index. */
const permConst = ( permName : string, modName : string ) : string => {
	const suffix = permName.includes( '.' ) ? permName.slice( permName.indexOf( '.' ) + 1 ) : permName;
	return `${modName.toUpperCase()}_PERM_${suffix.replace( /[-.]/g, '_' ).toUpperCase()}`;
};

/**
 * The gate declared for an endpoint in the module JSON, as the TS expression the
 * generated index.ts is expected to carry.
 *
 * @returns 'PUBLIC' | 'LOGGED' | '[ A, B ]' | null (not configured)
 */
const expectedGate = ( perms : Record<string, unknown>, modName : string, permIdToName : Map<string, string> ) : string | null => {
	if ( perms.public ) return 'PUBLIC';
	if ( perms.logged ) return 'LOGGED';

	const names : string[] = [];
	for ( const [ key, on ] of Object.entries( perms ) ) {
		if ( key === 'public' || key === 'logged' ) continue;
		if ( !on ) continue;
		if ( key === 'admins' ) {
			names.push( "'system.admin'" );
			continue;
		}
		const name = permIdToName.get( key );
		if ( name ) names.push( name === 'system.admin' ? "'system.admin'" : permConst( name, modName ) );
	}
	return names.length ? `[ ${names.join( ', ' )} ]` : null;
};

/** Extracts `METHOD /api/path` -> gate expression from a generated index.ts. */
const gatesFromIndex = ( src : string ) : Map<string, string> => {
	const out = new Map<string, string>();
	// app.hono.<m>( '<path>', route(Get|Body|Raw)( <fn>, { perms: <gate> } ) );
	const re = /app\.hono\.(\w+)\(\s*'([^']+)'\s*,\s*route(?:Get|Body|Raw)\(\s*\w+\s*,\s*\{\s*perms:\s*([^}]+?)\s*\}\s*\)\s*\)/g;
	for ( const m of src.matchAll( re ) ) {
		out.set( `${m[1].toUpperCase()} ${m[2]}`, m[3].trim() );
	}
	return out;
};

const stripJsonc = ( s : string ) : string => s.replace( /^\s*\/\/.*$/gm, '' );

describe('route gate: JSON model vs generated index.ts', () => {
	const jsonFiles = readdirSync( MODULES_JSON_DIR ).filter( ( f ) => f.endsWith( '.json' ) );

	for ( const file of jsonFiles ) {
		const modName = file.replace( /\.json$/, '' );

		it(`${modName}: every endpoint gate matches its JSON declaration`, () => {
			const mod = JSON.parse( stripJsonc( readFileSync( join( MODULES_JSON_DIR, file ), 'utf8' ) ) );

			const permIdToName = new Map<string, string>();
			for ( const [ id, p ] of Object.entries<any>( mod.permissions ?? {} ) ) {
				permIdToName.set( id, p.name );
			}

			let indexSrc : string;
			try {
				indexSrc = readFileSync( join( MODULES_SRC_DIR, modName, 'backend', 'src', 'index.ts' ), 'utf8' );
			} catch {
				return; // module not present in this checkout
			}
			const actual = gatesFromIndex( indexSrc );

			for ( const ep of Object.values<any>( mod.endpoints ?? {} ) ) {
				const key = `${ep.method.toUpperCase()} /api${ep.url}`;
				const want = expectedGate( ep.permissions ?? {}, modName, permIdToName );

				// endpoints with no configured gate are rejected by the generator;
				// none should exist in a committed module, but don't assert here
				if ( want === null ) continue;

				expect( actual.get( key ), `gate drift on ${key}` ).toBe( want );
			}
		});
	}
});
