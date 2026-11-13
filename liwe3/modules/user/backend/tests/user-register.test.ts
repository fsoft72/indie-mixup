import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listeners_init } from '../src/listeners';
import { user_register } from '../src/methods/user-register';
import { user_register_config } from '../src/methods/user-register-config';
import { LiWEApp, type LiWECtx } from '@backend/liwe3';

vi.mock( '@backend/liwe3', async () => {
	const actual = await vi.importActual( '@backend/liwe3' );
	return { ...actual, mkid: vi.fn( () => 'user_generated_id' ) };
} );

const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockRun = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();

const resetDbMocks = () => {
	mockInsert.mockReturnValue( { values: mockValues } );
	mockValues.mockReturnValue( { run: mockRun } );
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { where: mockWhere } );
	mockWhere.mockReturnValue( { get: mockGet } );
};

// Throwaway values generated on every run: no fixed password or code lives in the repo
const PASSWORD = `pw-${crypto.randomUUID()}`;
const AUTH_CODE = `code-${crypto.randomUUID()}`;

/** Builds a ctx whose `cfg.user` is the given section (undefined leaves it out) */
const createCtx = ( userCfg? : Record<string, unknown> ) : LiWECtx => {
	const app = new LiWEApp( 'test' );
	const cfg : Record<string, unknown> = { system: { domain: 'sysdom' } };
	if ( userCfg ) cfg.user = userCfg;

	Object.defineProperty( app, 'db', { get: () => ( { insert: mockInsert, select: mockSelect } ) } );
	Object.defineProperty( app, 'cfg', { get: () => cfg } );

	return { app, c: null, sessionId: null, session: async () => null, user: async () => null };
};

const input = ( over : Record<string, unknown> = {} ) => ( {
	username: 'newuser',
	email: 'new@example.com',
	password: PASSWORD,
	...over,
} );

/** The users row inserted by the first `insert().values()` call */
const insertedUser = () => mockValues.mock.calls[0][0];

describe('user_register_config', () => {
	it('reports a closed registration when the config has no user section', async () => {
		const res = await user_register_config( createCtx() );

		expect( res ).toMatchObject( { ok: true, data: { enabled: false, create_domain: false, auth_code_required: false } } );
	});

	it('reports the open registration flags and never the auth code', async () => {
		const res = await user_register_config( createCtx( { allowRegistration: true, createDomain: true, registrationAuthCode: AUTH_CODE } ) );

		expect( res ).toMatchObject( { ok: true, data: { enabled: true, create_domain: true, auth_code_required: true } } );
		expect( JSON.stringify( res ) ).not.toContain( AUTH_CODE );
	});

	it('hides the other flags while the registration is closed', async () => {
		const res = await user_register_config( createCtx( { allowRegistration: false, createDomain: true, registrationAuthCode: AUTH_CODE } ) );

		expect( res ).toMatchObject( { ok: true, data: { enabled: false, create_domain: false, auth_code_required: false } } );
	});
});

describe('user_register', () => {
	// Handlers register into a module-level singleton: install them once
	beforeAll( () => {
		listeners_init( createCtx().app );
	} );

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		mockRun.mockResolvedValue( undefined );
	} );

	it('rejects with 403 when the registration is not allowed', async () => {
		for ( const cfg of [ undefined, {}, { allowRegistration: false } ] ) {
			const res : any = await user_register( createCtx( cfg ), input() );

			expect( res.ok ).toBe( false );
			expect( res.error.code ).toBe( 'ERR_REGISTRATION_DISABLED' );
			expect( res.error.status ?? res.status ).toBe( 403 );
		}
		expect( mockInsert ).not.toHaveBeenCalled();
	});

	it('rejects a missing or wrong auth code when one is configured', async () => {
		const ctx = createCtx( { allowRegistration: true, registrationAuthCode: AUTH_CODE } );

		for ( const auth_code of [ undefined, '', 'wrong', AUTH_CODE.slice( 0, -1 ), `${AUTH_CODE}x` ] ) {
			const res : any = await user_register( ctx, input( { auth_code } ) );

			expect( res.ok ).toBe( false );
			expect( res.error.code ).toBe( 'ERR_INVALID_AUTH_CODE' );
		}
		expect( mockInsert ).not.toHaveBeenCalled();
	});

	it('does not ask for a code when the configured one is empty', async () => {
		mockGet.mockResolvedValueOnce( undefined ).mockResolvedValueOnce( { id: 'user_generated_id', username: 'newuser', email_verified: false } );

		const res : any = await user_register( createCtx( { allowRegistration: true, registrationAuthCode: '' } ), input() );

		expect( res.ok ).toBe( true );
	});

	it('validates username, email and password', async () => {
		const ctx = createCtx( { allowRegistration: true } );

		expect( ( await user_register( ctx, input( { username: 'ab' } ) ) as any ).error.code ).toBe( 'ERR_INVALID_USERNAME' );
		expect( ( await user_register( ctx, input( { email: 'nope' } ) ) as any ).error.code ).toBe( 'ERR_INVALID_EMAIL' );
		expect( ( await user_register( ctx, input( { password: 'short' } ) ) as any ).error.code ).toBe( 'ERR_INVALID_PASSWORD' );
		expect( mockInsert ).not.toHaveBeenCalled();
	});

	it('puts the user in the system domain, without permissions, when no domain is created', async () => {
		mockGet.mockResolvedValueOnce( undefined ).mockResolvedValueOnce( { id: 'user_generated_id', username: 'newuser', email_verified: false } );

		const res : any = await user_register( createCtx( { allowRegistration: true, createDomain: false } ), input() );

		expect( res.ok ).toBe( true );
		expect( insertedUser() ).toMatchObject( { domain: 'sysdom', username: 'newuser', email_verified: false } );
		expect( insertedUser().perms ).toBeFalsy();
	});

	it('rejects a username that cannot be a domain code when a domain is created', async () => {
		const ctx = createCtx( { allowRegistration: true, createDomain: true } );

		for ( const username of [ 'has space', 'with:colon', 'a@b.com', 'x'.repeat( 33 ) ] ) {
			const res : any = await user_register( ctx, input( { username } ) );

			expect( res.ok ).toBe( false );
			expect( res.error.code ).toBe( 'ERR_INVALID_DOMAIN' );
		}
		expect( mockInsert ).not.toHaveBeenCalled();
	});

	it('rejects a domain that already exists', async () => {
		mockGet.mockResolvedValueOnce( { id: 'someone' } ); // domain-exists check

		const res : any = await user_register( createCtx( { allowRegistration: true, createDomain: true } ), input( { username: 'Acme' } ) );

		expect( res.ok ).toBe( false );
		expect( res.error.code ).toBe( 'ERROR_DOMAIN_ALREADY_EXISTS' );
		expect( mockInsert ).not.toHaveBeenCalled();
	});

	it('creates the user as owner of the new domain', async () => {
		mockGet
			.mockResolvedValueOnce( undefined ) // domain is free
			.mockResolvedValueOnce( undefined ) // no duplicate username / email
			.mockResolvedValueOnce( { id: 'user_generated_id', username: 'acme', domain: 'acme', email_verified: false } );

		const ctx = createCtx( { allowRegistration: true, createDomain: true, registrationAuthCode: AUTH_CODE } );
		const res : any = await user_register( ctx, input( { username: 'acme', auth_code: AUTH_CODE } ) );

		expect( res.ok ).toBe( true );
		expect( insertedUser() ).toMatchObject( { domain: 'acme', username: 'acme', email_verified: false } );
		expect( insertedUser().perms ).toContain( 'user.create' );
	});
});
