import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { LiWEApp, type LiWECtx } from '@backend/liwe3';
import { listeners_init } from '../src/listeners';
import { user_add, user_login } from '../src/methods';

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

describe('login with an email that exists in several domains', () => {
	let ctx : LiWECtx;

	beforeAll( () => {
		listeners_init( new LiWEApp( 'test' ) );
	} );

	beforeEach( async () => {
		const db = createDb();
		const app = new LiWEApp( 'test' );
		Object.defineProperty( app, 'db', { get: () => db } );
		Object.defineProperty( app, 'kv', { get: () => ( { put: async () => undefined, get: async () => null } ) } );
		Object.defineProperty( app, 'cfg', {
			get: () => ( { system: {}, jwt: { secret: 'test-secret-1234567890-test-secret-1234567890', expiresIn: 1800, refreshTokenDuration: 21600 } } ),
		} );
		ctx = { app, c: null, sessionId: null, session: async () => null, user: async () => null };

		const add = ( username : string, email : string, password : string, domain : string ) =>
			user_add( ctx, { username, email, password, email_verified: true }, { skip_permissions_check: true, domain } );

		await add( 'jane.acme', 'jane@mail.it', 'Passw0rd!x', 'acme' );
		await add( 'jane.beta', 'jane@mail.it', 'Passw0rd!x', 'beta' );
		await add( 'jane.gamma', 'jane@mail.it', 'Other0rd!x', 'gamma' );
		await add( 'solo', 'solo@mail.it', 'Passw0rd!x', 'acme' );
	} );

	it('logs in straight away when the email belongs to a single account', async () => {
		const res = await user_login( ctx, { username: 'solo@mail.it', password: 'Passw0rd!x' } );

		expect( res.ok ).toBe( true );
		expect( res.data?.requires_domain_choice ).toBe( false );
		expect( res.data?.token ).toBeTruthy();
	});

	it('asks for the domain, listing only those where the password is valid, and creates no session', async () => {
		const res = await user_login( ctx, { username: 'jane@mail.it', password: 'Passw0rd!x' } );

		expect( res.ok ).toBe( true );
		expect( res.data?.requires_domain_choice ).toBe( true );
		expect( [ ...( res.data?.domains ?? [] ) ].sort() ).toEqual( [ 'acme', 'beta' ] );
		expect( res.data?.token ).toBeUndefined();
	});

	it('logs in to the chosen domain', async () => {
		const res = await user_login( ctx, { username: 'jane@mail.it', password: 'Passw0rd!x', domain: 'beta' } );

		expect( res.ok ).toBe( true );
		expect( res.data?.domain ).toBe( 'beta' );
		expect( res.data?.username ).toBe( 'jane.beta' );
	});

	it('logs in straight away when the password is valid in one domain only', async () => {
		const res = await user_login( ctx, { username: 'jane@mail.it', password: 'Other0rd!x' } );

		expect( res.ok ).toBe( true );
		expect( res.data?.domain ).toBe( 'gamma' );
	});

	it('refuses a domain where the credentials do not open an account, and a wrong password', async () => {
		const wrongDomain = await user_login( ctx, { username: 'jane@mail.it', password: 'Passw0rd!x', domain: 'gamma' } );
		const wrongPassword = await user_login( ctx, { username: 'jane@mail.it', password: 'nope' } );

		expect( wrongDomain.ok ).toBe( false );
		expect( wrongDomain.status ).toBe( 403 );
		expect( wrongPassword.ok ).toBe( false );
		expect( wrongPassword.status ).toBe( 403 );
	});
});
