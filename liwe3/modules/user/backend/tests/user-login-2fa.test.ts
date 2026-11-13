import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiWEApp, type LiWECtx } from '@backend/liwe3';
import { encryptData, hashPassword, jwtVerify, totpGenerate } from '@backend/liwe3/src/crypto';
import { user_login } from '../src/methods/user-login';
import { user_2fa_verify } from '../src/methods/user-2fa-verify';

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
	// user_login lists every account matching the identifier: feed it from the queue of `get` results
	mockAll.mockImplementation( async () => {
		const found = await mockGet();
		return found ? [ found ] : [];
	} );
	mockUpdate.mockReturnValue( { set: mockSet } );
	mockSet.mockReturnValue( { where: mockWhere } );
	mockDelete.mockReturnValue( { where: mockWhere } );
};

const JWT_SECRET = 'test-jwt-secret-for-2fa-login-tests-1234567890';
const TOTP_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

const mockKvPut = vi.fn().mockResolvedValue( undefined );
const mockKvGet = vi.fn().mockResolvedValue( null );

export const createMockApp = () : LiWEApp => {
	const mockApp = new LiWEApp( 'test' );
	Object.defineProperty( mockApp, 'db', {
		get: () => ( { insert: mockInsert, select: mockSelect, update: mockUpdate, delete: mockDelete } ),
	} );
	Object.defineProperty( mockApp, 'kv', { get: () => ( { put: mockKvPut, get: mockKvGet } ) } );
	Object.defineProperty( mockApp, 'cfg', { get: () => ( { system: {}, jwt: { secret: JWT_SECRET, expiresIn: 1800, refreshTokenDuration: 21600 } } ) } );
	return mockApp;
};

export const createMockCtx = ( currentUser : any = null, app : LiWEApp = createMockApp() ) : LiWECtx => ( {
	app,
	c: null,
	sessionId: currentUser ? 'sess_1' : null,
	session: async () => null,
	user: async () => currentUser,
} );

describe('user_login with 2FA enabled', () => {
	let ctx : LiWECtx;

	beforeEach( async () => {
		vi.clearAllMocks();
		resetDbMocks();
		mockKvPut.mockClear();
		mockKvGet.mockClear();
		ctx = createMockCtx();
	} );

	it('returns a pending_token instead of a full login when 2FA is enabled', async () => {
		const passwordHash = await hashPassword( 'my-password' );
		mockGet.mockResolvedValueOnce( {
			id: 'user_1',
			username: 'jdoe',
			password: passwordHash,
			enabled: true,
			email_verified: true,
			two_factor_enabled: true,
		} );

		const result = await user_login( ctx, { username: 'jdoe', password: 'my-password' } );

		expect( result.ok ).toBe( true );
		expect( ( result.data as any ).requires_2fa ).toBe( true );
		expect( ( result.data as any ).pending_token ).toEqual( expect.any( String ) );
		expect( mockKvPut ).not.toHaveBeenCalled(); // no session created yet

		const payload = await jwtVerify( ( result.data as any ).pending_token, JWT_SECRET );
		expect( payload?.purpose ).toBe( '2fa_pending' );
		expect( payload?.id_user ).toBe( 'user_1' );
	});

	it('logs in normally when 2FA is not enabled', async () => {
		const passwordHash = await hashPassword( 'my-password' );
		mockGet.mockResolvedValueOnce( {
			id: 'user_1',
			username: 'jdoe',
			password: passwordHash,
			enabled: true,
			email_verified: true,
			two_factor_enabled: false,
		} );

		const result = await user_login( ctx, { username: 'jdoe', password: 'my-password' } );

		expect( result.ok ).toBe( true );
		expect( ( result.data as any ).token ).toEqual( expect.any( String ) );
		expect( ( result.data as any ).requires_2fa ).toBe( false );
	});

	it('rejects login for a disabled account, even with the correct password', async () => {
		const passwordHash = await hashPassword( 'my-password' );
		mockGet.mockResolvedValueOnce( {
			id: 'user_1',
			username: 'jdoe',
			password: passwordHash,
			enabled: false,
			email_verified: true,
			two_factor_enabled: false,
		} );

		const result = await user_login( ctx, { username: 'jdoe', password: 'my-password' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 403 );
		expect( result.error?.code ).toBe( 'ACCOUNT_DISABLED' );
	});

	it('rejects login when the email is not verified', async () => {
		const passwordHash = await hashPassword( 'my-password' );
		mockGet.mockResolvedValueOnce( {
			id: 'user_1',
			username: 'jdoe',
			password: passwordHash,
			enabled: true,
			email_verified: false,
			two_factor_enabled: false,
		} );

		const result = await user_login( ctx, { username: 'jdoe', password: 'my-password' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 403 );
		expect( result.error?.code ).toBe( 'EMAIL_NOT_VERIFIED' );
	});
});

describe('user_2fa_verify', () => {
	let ctx : LiWECtx;

	beforeEach( async () => {
		vi.clearAllMocks();
		resetDbMocks();
		mockKvPut.mockClear();
		mockKvGet.mockClear();
		ctx = createMockCtx();
	} );

	const makePendingToken = async () => {
		const { jwtCreate } = await import( '@backend/liwe3/src/crypto' );
		return jwtCreate( { purpose: '2fa_pending', id_user: 'user_1' }, JWT_SECRET, 300 );
	};

	it('completes the login when the TOTP code is valid', async () => {
		const encryptedSecret = await encryptData( { secret: TOTP_SECRET }, JWT_SECRET );
		mockGet.mockResolvedValueOnce( {
			id: 'user_1',
			username: 'jdoe',
			email: 'jdoe@example.com',
			perms: [],
			domain: 'acme',
			two_factor_enabled: true,
			two_factor_secret: encryptedSecret,
			two_factor_recovery_codes: [],
		} );
		const pending_token = await makePendingToken();
		const code = await totpGenerate( TOTP_SECRET );

		const result = await user_2fa_verify( ctx, { pending_token, code } );

		expect( result.ok ).toBe( true );
		expect( result.data?.token ).toEqual( expect.any( String ) );
		expect( result.data?.id ).toBe( 'user_1' );
	});

	it('completes the login and consumes a recovery code when used instead of the TOTP code', async () => {
		const encryptedSecret = await encryptData( { secret: TOTP_SECRET }, JWT_SECRET );
		const recoveryCode = 'ABCD123456';
		const otherHash = await hashPassword( 'UNUSEDCODE1' );
		const usedHash = await hashPassword( recoveryCode );
		mockGet.mockResolvedValueOnce( {
			id: 'user_1',
			username: 'jdoe',
			email: 'jdoe@example.com',
			perms: [],
			domain: 'acme',
			two_factor_enabled: true,
			two_factor_secret: encryptedSecret,
			two_factor_recovery_codes: [ otherHash, usedHash ],
		} );
		const pending_token = await makePendingToken();

		const result = await user_2fa_verify( ctx, { pending_token, code: recoveryCode } );

		expect( result.ok ).toBe( true );
		expect( mockSet ).toHaveBeenCalledWith( { two_factor_recovery_codes: [ otherHash ] } );
	});

	it('rejects an invalid code', async () => {
		const encryptedSecret = await encryptData( { secret: TOTP_SECRET }, JWT_SECRET );
		mockGet.mockResolvedValueOnce( {
			id: 'user_1',
			two_factor_enabled: true,
			two_factor_secret: encryptedSecret,
			two_factor_recovery_codes: [],
		} );
		const pending_token = await makePendingToken();

		const result = await user_2fa_verify( ctx, { pending_token, code: '000000' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 400 );
	});

	it('rejects an expired or malformed pending_token', async () => {
		const result = await user_2fa_verify( ctx, { pending_token: 'not-a-valid-token', code: '123456' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 401 );
		expect( mockGet ).not.toHaveBeenCalled();
	});

	it('rejects a pending_token for a user who no longer has 2FA enabled', async () => {
		mockGet.mockResolvedValueOnce( { id: 'user_1', two_factor_enabled: false } );
		const pending_token = await makePendingToken();

		const result = await user_2fa_verify( ctx, { pending_token, code: '123456' } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 400 );
	});
});
