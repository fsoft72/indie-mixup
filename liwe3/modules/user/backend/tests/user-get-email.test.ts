import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { LiWEApp, type LiWECtx, liwe_event_call } from '@backend/liwe3';
import { listeners_init } from '../src/listeners';
import { users } from '../src/schema';

/** Builds an in-memory SQLite database with the user tables, wired to Drizzle */
const createDb = () => {
	const sqlite = new DatabaseSync( ':memory:' );
	sqlite.exec( readFileSync( join( __dirname, '..', 'sql', 'user.sql' ), 'utf8' ) );

	return drizzle( async ( query, params, method ) => {
		const stmt = sqlite.prepare( query );
		if ( method === 'run' ) {
			stmt.run( ...( params as any[] ) );
			return { rows: [] };
		}
		stmt.setReturnArrays( true );
		const rows = stmt.all( ...( params as any[] ) ) as unknown[][];
		return { rows: method === 'get' ? rows[0] : rows };
	} );
};

describe('user.call.user.get', () => {
	let ctx : LiWECtx;
	let db : ReturnType<typeof createDb>;

	beforeAll( () => {
		listeners_init( new LiWEApp( 'test' ) );
	} );

	beforeEach( async () => {
		db = createDb();
		ctx = { app: { db } as any, c: null, sessionId: null, session: async () => null, user: async () => null };
		await db.insert( users ).values( { id: 'u1', domain: 'acme', username: 'MixedUser', email: 'mixed.case@acme.it', perms: [] } as any ).run();
	} );

	const get = ( payload : Record<string, string> ) : Promise<any> => liwe_event_call( ctx, 'user', 'user.get', payload );

	it('matches a lowercase stored email with a lowercase lookup', async () => {
		const res = await get( { email: 'mixed.case@acme.it' } );
		expect( res.ok ).toBe( true );
		expect( res.data.id ).toBe( 'u1' );
	});

	it('does not match a legacy row that was stored with capitals (emails must be stored lowercase)', async () => {
		await db.insert( users ).values( { id: 'u3', domain: 'acme', username: 'legacy', email: 'Legacy@Acme.it', perms: [] } as any ).run();
		const res = await get( { email: 'legacy@acme.it' } );
		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 404 );
	});

	it('matches a lowercase stored email with a mixed case, padded lookup', async () => {
		await db.insert( users ).values( { id: 'u2', domain: 'acme', username: 'lower', email: 'lower@acme.it', perms: [] } as any ).run();
		const res = await get( { email: '  LOWER@Acme.IT ' } );
		expect( res.ok ).toBe( true );
		expect( res.data.id ).toBe( 'u2' );
	});

	it('still matches by id and by exact username', async () => {
		expect( ( await get( { id: 'u1' } ) ).data.id ).toBe( 'u1' );
		expect( ( await get( { username: 'MixedUser' } ) ).data.id ).toBe( 'u1' );
	});

	it('returns 404 for an unknown email', async () => {
		const res = await get( { email: 'nobody@acme.it' } );
		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 404 );
	});
});
