import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { eq } from 'drizzle-orm';
import { type LiWECtx } from '@backend/liwe3';
import { user_email_verify } from '../src/methods';
import { user_verification_tokens, users } from '../src/schema';

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

describe('user_email_verify', () => {
	let db : ReturnType<typeof createDb>;
	let ctx : LiWECtx;

	beforeEach( async () => {
		db = createDb();
		ctx = { app: { db, log: { info: () => {} } } as any, c: null, sessionId: null, session: async () => null, user: async () => null };
		await db.insert( users ).values( { id: 'u1', domain: 'acme', username: 'u1', email: 'u1@acme.it', email_verified: false, perms: [] } as any ).run();
	} );

	/** Inserts a verification token expiring `in_ms` from now (negative: already expired) */
	const token = async ( id : string, in_ms : number, used_at : number | null = null ) => {
		await db.insert( user_verification_tokens ).values( {
			id,
			domain: 'acme',
			id_user: 'u1',
			type: 'email_verify',
			expires_at: Date.now() + in_ms,
			used_at,
			token: `tok-${id}`,
		} as any ).run();
	};

	const user_row = () => db.select().from( users ).where( eq( users.id, 'u1' ) ).get();
	const token_row = ( id : string ) => db.select().from( user_verification_tokens ).where( eq( user_verification_tokens.id, id ) ).get();

	it('verifies the email with a valid token and marks the token as used', async () => {
		await token( 't1', 60_000 );

		const res = await user_email_verify( ctx, { token: 'tok-t1' } );

		expect( res.ok ).toBe( true );
		expect( ( await user_row() )?.email_verified ).toBe( true );
		expect( ( await token_row( 't1' ) )?.used_at ).toBeGreaterThan( 0 );
	});

	it('refuses an expired token, deletes it and leaves the email unverified', async () => {
		await token( 't2', -60_000 );

		const res = await user_email_verify( ctx, { token: 'tok-t2' } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 400 );
		expect( res.error?.code ).toBe( 'TIMEOUT' );
		expect( await token_row( 't2' ) ).toBeUndefined();
		expect( ( await user_row() )?.email_verified ).toBeFalsy();
	});

	it('refuses a token that was already used', async () => {
		await token( 't3', 60_000, Date.now() - 1000 );

		const res = await user_email_verify( ctx, { token: 'tok-t3' } );

		expect( res.ok ).toBe( false );
		expect( res.error?.code ).toBe( 'ALREADY_EXISTS' );
		expect( ( await user_row() )?.email_verified ).toBeFalsy();
	});

	it('refuses an unknown token', async () => {
		const res = await user_email_verify( ctx, { token: 'nope' } );

		expect( res.ok ).toBe( false );
		expect( res.error?.code ).toBe( 'INVALID_INPUT' );
	});

	it('succeeds and marks the token as used when the email was already verified', async () => {
		await db.update( users ).set( { email_verified: true } as any ).where( eq( users.id, 'u1' ) ).run();
		await token( 't5', 60_000 );

		const res = await user_email_verify( ctx, { token: 'tok-t5' } );

		expect( res.ok ).toBe( true );
		expect( ( await token_row( 't5' ) )?.used_at ).toBeGreaterThan( 0 );
	});
});
