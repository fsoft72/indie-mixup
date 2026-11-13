import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock( '@backend/liwe3', async () => {
	const actual = await vi.importActual( '@backend/liwe3' );
	return {
		...actual,
		has_perms: vi.fn(),
	};
} );

import { LiWEApp, type LiWECtx, has_perms, routeBody } from '@backend/liwe3';
import { USER_PERM_2FA_MANAGE } from '../src/perms';

/** Minimal fake Hono context for exercising a gated route handler. */
const fakeC = ( c : any, body : any = {} ) => ( {
	get: ( k : string ) => ( k === 'ctx' ? c : undefined ),
	req: { query: () => body, json: async () => body },
	json: ( b : any, s? : number ) => ( { body: b, status: s ?? b?.status ?? 200 } ),
} );
import { decryptData, encryptData, hashPassword, totpGenerate, verifyPassword } from '@backend/liwe3/src/crypto';
import { user_2fa_setup } from '../src/methods/user-2fa-setup';
import { user_2fa_enable } from '../src/methods/user-2fa-enable';
import { user_2fa_disable } from '../src/methods/user-2fa-disable';
import { user_2fa_admin_disable } from '../src/methods/user-2fa-admin-disable';

export const mockInsert = vi.fn();
export const mockValues = vi.fn();
export const mockRun = vi.fn();
export const mockSelect = vi.fn();
export const mockFrom = vi.fn();
export const mockAll = vi.fn();
export const mockWhere = vi.fn();
export const mockGet = vi.fn();
export const mockUpdate = vi.fn();
export const mockSet = vi.fn();
export const mockDelete = vi.fn();

export const resetDbMocks = () => {
	mockInsert.mockReturnValue( { values: mockValues } );
	mockValues.mockReturnValue( { run: mockRun } );
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { all: mockAll, where: mockWhere } );
	mockWhere.mockReturnValue( { run: mockRun, get: mockGet, all: mockAll } );
	mockUpdate.mockReturnValue( { set: mockSet } );
	mockSet.mockReturnValue( { where: mockWhere } );
	mockDelete.mockReturnValue( { where: mockWhere } );
};

const JWT_SECRET = 'test-jwt-secret-for-2fa-tests-1234567890';

export const createMockApp = () : LiWEApp => {
	const mockApp = new LiWEApp( 'test' );
	Object.defineProperty( mockApp, 'db', {
		get: () => ( { insert: mockInsert, select: mockSelect, update: mockUpdate, delete: mockDelete } ),
	} );
	Object.defineProperty( mockApp, 'cfg', { get: () => ( { system: {}, jwt: { secret: JWT_SECRET } } ) } );
	return mockApp;
};

export const createMockCtx = (
	currentUser : any = { id: 'user_1', domain: 'acme', username: 'jdoe', perms: [] },
	app : LiWEApp = createMockApp(),
) : LiWECtx => ( {
	app,
	c: null,
	sessionId: currentUser ? 'sess_1' : null,
	session: async () => null,
	user: async () => currentUser,
} );

describe('user_2fa_setup', () => {
	let ctx : LiWECtx;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx();
	} );

	it('generates a TOTP secret, stores it encrypted, and returns secret + otpauth_url', async () => {
		const result = await user_2fa_setup( ctx );

		expect( result.ok ).toBe( true );
		expect( result.data?.secret ).toMatch( /^[A-Z2-7]+$/ );
		expect( result.data?.otpauth_url ).toContain( 'otpauth://totp/test%3Ajdoe' );
		expect( result.data?.otpauth_url ).toContain( `secret=${result.data?.secret}` );

		expect( mockUpdate ).toHaveBeenCalled();
		expect( mockWhere ).toHaveBeenCalled();

		const setCall = mockSet.mock.calls[0][0];
		const decrypted = await decryptData( setCall.two_factor_secret, JWT_SECRET );
		expect( decrypted.secret ).toBe( result.data?.secret );
	});

	it('returns 401 when not logged in', async () => {
		ctx = createMockCtx( null );

		const result = await user_2fa_setup( ctx );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 401 );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});
});

describe('user_2fa_enable', () => {
	let ctx : LiWECtx;
	const TOTP_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx();
	} );

	it('enables 2FA and returns 10 recovery codes when the code is valid', async () => {
		const encryptedSecret = await encryptData( { secret: TOTP_SECRET }, JWT_SECRET );
		mockGet.mockResolvedValueOnce( { id: 'user_1', two_factor_secret: encryptedSecret } );
		const code = await totpGenerate( TOTP_SECRET );

		const result = await user_2fa_enable( ctx, { code } );

		expect( result.ok ).toBe( true );
		expect( result.data ).toHaveLength( 10 );
		expect( new Set( result.data ) ).toHaveProperty( 'size', 10 ); // all unique

		const setCall = mockSet.mock.calls[0][0];
		expect( setCall.two_factor_enabled ).toBe( true );
		expect( setCall.two_factor_recovery_codes ).toHaveLength( 10 );

		// stored codes are hashed, not plaintext
		expect( setCall.two_factor_recovery_codes ).not.toContain( result.data![0] );
		expect( await verifyPassword( result.data![0], setCall.two_factor_recovery_codes[0] ) ).toBe( true );
	});

	it('rejects an invalid code and does not enable 2FA', async () => {
		const encryptedSecret = await encryptData( { secret: TOTP_SECRET }, JWT_SECRET );
		mockGet.mockResolvedValueOnce( { id: 'user_1', two_factor_secret: encryptedSecret } );

		const result = await user_2fa_enable( ctx, { code: '000000' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 400 );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});

	it('rejects when 2FA setup was never started', async () => {
		mockGet.mockResolvedValueOnce( { id: 'user_1', two_factor_secret: null } );

		const result = await user_2fa_enable( ctx, { code: '123456' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 400 );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});

	it('returns 401 when not logged in', async () => {
		ctx = createMockCtx( null );

		const result = await user_2fa_enable( ctx, { code: '123456' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 401 );
	});
});

describe('user_2fa_disable', () => {
	let ctx : LiWECtx;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx();
	} );

	it('disables 2FA and clears secret/recovery codes when the password is correct', async () => {
		const passwordHash = await hashPassword( 'correct-horse' );
		mockGet.mockResolvedValueOnce( { id: 'user_1', password: passwordHash } );

		const result = await user_2fa_disable( ctx, { password: 'correct-horse' } );

		expect( result.ok ).toBe( true );
		expect( result.data ).toBe( true );
		expect( mockSet ).toHaveBeenCalledWith( {
			two_factor_enabled: false,
			two_factor_secret: null,
			two_factor_recovery_codes: null,
		} );
	});

	it('rejects an incorrect password without disabling anything', async () => {
		const passwordHash = await hashPassword( 'correct-horse' );
		mockGet.mockResolvedValueOnce( { id: 'user_1', password: passwordHash } );

		const result = await user_2fa_disable( ctx, { password: 'wrong' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 403 );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});

	it('returns 401 when not logged in', async () => {
		ctx = createMockCtx( null );

		const result = await user_2fa_disable( ctx, { password: 'x' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 401 );
	});
});

describe('user_2fa_admin_disable', () => {
	let ctx : LiWECtx;

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		ctx = createMockCtx( { id: 'admin_1', domain: 'acme', username: 'admin', perms: [ 'user.2fa.manage' ] } );
		vi.mocked( has_perms ).mockResolvedValue( true );
	} );

	it('force-disables 2FA on another user', async () => {
		mockGet.mockResolvedValueOnce( { id: 'user_2' } );

		const result = await user_2fa_admin_disable( ctx, { id_user: 'user_2' } );

		expect( result.ok ).toBe( true );
		expect( result.data ).toBe( true );
		expect( mockSet ).toHaveBeenCalledWith( {
			two_factor_enabled: false,
			two_factor_secret: null,
			two_factor_recovery_codes: null,
		} );
	});

	it('returns 404 when the target user does not exist', async () => {
		mockGet.mockResolvedValueOnce( undefined );

		const result = await user_2fa_admin_disable( ctx, { id_user: 'missing' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 404 );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});

	it('the route is gated on user.2fa.manage', async () => {
		const noPerm = createMockCtx( { id: 'u1', domain: 'acme', username: 'jdoe', perms: [] } );
		const res = await routeBody( user_2fa_admin_disable, { perms: [ USER_PERM_2FA_MANAGE ] } )( fakeC( noPerm, { id_user: 'user_2' } ) as any );

		expect( res.status ).toBe( 403 );
		expect( mockUpdate ).not.toHaveBeenCalled();
	});

	it('returns 401 when not logged in', async () => {
		ctx = createMockCtx( null );

		const result = await user_2fa_admin_disable( ctx, { id_user: 'user_2' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 401 );
	});
});
