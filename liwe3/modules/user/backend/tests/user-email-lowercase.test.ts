import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { eq } from 'drizzle-orm';
import { LiWEApp, type LiWECtx, liwe_event_call } from '@backend/liwe3';
import { hashPassword } from '@backend/liwe3/src/crypto';
import { listeners_init } from '../src/listeners';
import { user_add, user_email_resend, user_login } from '../src/methods';
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

describe('emails are stored lowercase', () => {
	let db : ReturnType<typeof createDb>;
	let ctx : LiWECtx;

	beforeAll( () => {
		listeners_init( new LiWEApp( 'test' ) );
	} );

	beforeEach( () => {
		db = createDb();
		const app = new LiWEApp( 'test' );
		Object.defineProperty( app, 'db', { get: () => db } );
		Object.defineProperty( app, 'kv', { get: () => ( { put: async () => undefined, get: async () => null } ) } );
		Object.defineProperty( app, 'cfg', {
			get: () => ( { system: {}, jwt: { secret: 'test-secret-1234567890-test-secret-1234567890', expiresIn: 1800, refreshTokenDuration: 21600 } } ),
		} );
		ctx = { app, c: null, sessionId: null, session: async () => null, user: async () => null };
	} );

	const sys = { skip_permissions_check: true, domain: 'acme' };
	const stored_email = async ( username : string ) => ( await db.select().from( users ).where( eq( users.username, username ) ).get() )?.email;

	it('user_add trims and lowercases the email it stores and returns', async () => {
		const res = await user_add( ctx, { username: 'jane', email: '  Jane.Doe@Acme.IT ', password: 'Passw0rd!x', email_verified: true }, sys );

		expect( res.ok ).toBe( true );
		expect( res.data?.email ).toBe( 'jane.doe@acme.it' );
		expect( await stored_email( 'jane' ) ).toBe( 'jane.doe@acme.it' );
	});

	it('user_add refuses an email that differs only by case in the same domain, but not in another domain', async () => {
		await user_add( ctx, { username: 'jane', email: 'jane@acme.it', password: 'Passw0rd!x', email_verified: true }, sys );

		const same = await user_add( ctx, { username: 'jane2', email: 'JANE@acme.it', password: 'Passw0rd!x', email_verified: true }, sys );
		const other = await user_add( ctx, { username: 'jane3', email: 'JANE@acme.it', password: 'Passw0rd!x', email_verified: true }, {
			skip_permissions_check: true,
			domain: 'other',
		} );

		expect( same.ok ).toBe( false );
		expect( same.status ).toBe( 400 );
		expect( other.ok ).toBe( true );
		expect( await stored_email( 'jane3' ) ).toBe( 'jane@acme.it' );
	});

	it('user.call.user.update stores the new email lowercase and refuses a clash that differs by case', async () => {
		await user_add( ctx, { username: 'a', email: 'a@acme.it', password: 'Passw0rd!x', email_verified: true }, sys );
		await user_add( ctx, { username: 'b', email: 'b@acme.it', password: 'Passw0rd!x', email_verified: true }, sys );
		const a = await db.select().from( users ).where( eq( users.username, 'a' ) ).get();

		const clash : any = await liwe_event_call( ctx, 'user', 'user.update', { id: a!.id, domain: 'acme', email: 'B@Acme.it' } );
		const ok : any = await liwe_event_call( ctx, 'user', 'user.update', { id: a!.id, domain: 'acme', email: ' New.A@Acme.IT ' } );

		expect( clash.ok ).toBe( false );
		expect( clash.status ).toBe( 409 );
		expect( ok.ok ).toBe( true );
		expect( await stored_email( 'a' ) ).toBe( 'new.a@acme.it' );
	});

	it('user.call.user.get finds the user with any case of the email', async () => {
		await user_add( ctx, { username: 'jane', email: 'jane@acme.it', password: 'Passw0rd!x', email_verified: true }, sys );

		const res : any = await liwe_event_call( ctx, 'user', 'user.get', { email: ' JANE@Acme.it ' } );

		expect( res.ok ).toBe( true );
		expect( res.data.username ).toBe( 'jane' );
	});

	it('user_login accepts the email with any case', async () => {
		await user_add( ctx, { username: 'jane', email: 'jane@acme.it', password: 'Passw0rd!x', email_verified: true }, sys );

		const res = await user_login( ctx, { username: 'JANE@Acme.IT', password: 'Passw0rd!x' } );

		expect( res.ok ).toBe( true );
	});

	it('user_email_resend finds the user with any case of the email', async () => {
		await user_add( ctx, { username: 'jane', email: 'jane@acme.it', password: 'Passw0rd!x', email_verified: true }, sys );

		const res = await user_email_resend( ctx, { email: 'Jane@ACME.it' } );

		// Found: an already verified account answers 400, an unknown email would answer success without revealing anything
		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 400 );
	});
});
