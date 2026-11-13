import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P0-1 migration tripwire.
 *
 * Every module `index.ts` registers its routes with `routeGet( fn )` /
 * `routeBody( fn )`. Until P0-1 phase 3 regenerates them, none pass a gate as
 * the second argument. This test records how many un-gated registrations each
 * module still has; the numbers must only ever go DOWN. When a module is
 * regenerated its entry drops to 0. By phase 4 (mandatory gate) MODULES_DIR
 * must hold no un-gated registration at all.
 *
 * A source scan, not a runtime check: it needs no assembled app.
 */

const MODULES_DIR = join( __dirname, '..', '..', '..', 'modules' );

/** Matches a `routeGet(` / `routeBody(` call and captures its full argument list up to the matching-ish close. */
const CALL = /\broute(?:Get|Body)\s*\(([^;]*?)\)\s*\)/g;

/**
 * Counts route registrations in a module index.ts and how many lack a gate.
 *
 * @param src - file contents
 * @returns { total, ungated }
 */
const scan = ( src : string ) : { total : number; ungated : number } => {
	let total = 0;
	let ungated = 0;
	for ( const m of src.matchAll( CALL ) ) {
		total++;
		if ( !/\bperms\s*:/.test( m[1] ) ) ungated++;
	}
	return { total, ungated };
};

const ungatedByModule = () : Record<string, number> => {
	const out : Record<string, number> = {};
	for ( const mod of readdirSync( MODULES_DIR ) ) {
		const idx = join( MODULES_DIR, mod, 'backend', 'src', 'index.ts' );
		let src : string;
		try {
			src = readFileSync( idx, 'utf8' );
		} catch {
			continue;
		}
		const { total, ungated } = scan( src );
		if ( total > 0 ) out[mod] = ungated;
	}
	return out;
};

describe('route gate migration (P0-1)', () => {
	// Shrink these as modules are regenerated. Never grow one.
	const ALLOWLIST : Record<string, number> = {
		activitylog: 0,
		apikeys: 0,
		comment: 0,
		credentials: 0,
		kanban: 0,
		kb: 0,
		mcpkanban: 0,
		notifier: 0,
		payment: 0,
		system: 0,
		tags: 0,
		upload: 0,
		user: 0,
		wallet: 0,
	};

	it('no module has more un-gated route registrations than its recorded allowance', () => {
		const current = ungatedByModule();

		for ( const [ mod, count ] of Object.entries( current ) ) {
			const allowed = ALLOWLIST[mod] ?? 0;
			expect( count, `${mod}: ${count} un-gated route registrations, allowance is ${allowed}` ).toBeLessThanOrEqual( allowed );
		}
	});

	it('no NEW module started registering routes without a gate', () => {
		const current = ungatedByModule();
		const unexpected = Object.keys( current ).filter( ( m ) => !( m in ALLOWLIST ) );
		expect( unexpected, `modules with un-tracked un-gated routes: ${unexpected.join( ', ' )}` ).toEqual( [] );
	});
});
