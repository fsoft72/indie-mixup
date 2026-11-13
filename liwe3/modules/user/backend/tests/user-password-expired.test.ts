import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiWEApp, type LiWECtx } from '@backend/liwe3';
import { encryptData, hashPassword, jwtCreate, jwtVerify, totpGenerate, totpSecretGenerate, verifyPassword } from '@backend/liwe3/src/crypto';
import { user_login } from '../src/methods/user-login';
import { user_2fa_verify } from '../src/methods/user-2fa-verify';
import { user_password_change_expired } from '../src/methods/user-password-change-expired';
import { user_set_password_expired } from '../src/methods/user-set-password_expired';
import { user_set_password_max_age } from '../src/methods/user-set-password_max_age';
import { user_set_password } from '../src/methods/user-set-password';

const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockRun = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockAll = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

const resetDbMocks = () => {
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

// Throwaway values generated on every run: no fixed secret or password lives in the repo
const randomPassword = () => `pw-${crypto.randomUUID()}`;

const JWT_SECRET = totpSecretGenerate( 32 );
const TOTP_SECRET = totpSecretGenerate();
const OLD_PASSWORD = randomPassword();
const WRONG_PASSWORD = randomPassword();
const NEW_PASSWORD = randomPassword();
const ADMIN_RESET_PASSWORD = randomPassword();
const OWN_NEW_PASSWORD = randomPassword();
const SHORT_PASSWORD = 'x'.repeat( 5 );
const DAY_MS = 86400000;

const mockKvPut = vi.fn().mockResolvedValue( undefined );
const mockKvGet = vi.fn().mockResolvedValue( null );

/**
 * Builds a mock ctx.
 *
 * @param maxAgeDays - Value of cfg.user.passwordMaxAgeDays (undefined leaves the `user` section out)
 * @param currentUser - The logged in user returned by ctx.user()
 */
const createCtx = ( maxAgeDays? : number, currentUser : any = null ) : LiWECtx => {
	const app = new LiWEApp( 'test' );
	const cfg : Record<string, any> = { system: {}, jwt: { secret: JWT_SECRET, expiresIn: 1800, refreshTokenDuration: 21600 } };
	if ( maxAgeDays !== undefined ) cfg.user = { passwordMaxAgeDays: maxAgeDays };

	Object.defineProperty( app, 'db', { get: () => ( { insert: mockInsert, select: mockSelect, update: mockUpdate, delete: mockDelete } ) } );
	Object.defineProperty( app, 'kv', { get: () => ( { put: mockKvPut, get: mockKvGet } ) } );
	Object.defineProperty( app, 'cfg', { get: () => cfg } );

	return {
		app,
		c: null,
		sessionId: currentUser ? 'sess_1' : null,
		session: async () => null,
		user: async () => currentUser,
	};
};

/** A DB user row that can log in, with sensible defaults. */
const dbUser = async ( over : Record<string, any> = {} ) => ( {
	id: 'user_1',
	username: 'jdoe',
	email: 'jdoe@example.com',
	password: await hashPassword( OLD_PASSWORD ),
	perms: [],
	domain: 'acme',
	enabled: true,
	email_verified: true,
	two_factor_enabled: false,
	password_expired: false,
	password_changed_at: null,
	token_version: 3,
	...over,
} );

const makePendingToken = ( purpose : string, id_user = 'user_1', ttl = 300 ) => jwtCreate( { purpose, id_user }, JWT_SECRET, ttl );

beforeEach( () => {
	vi.clearAllMocks();
	resetDbMocks();
} );

describe('user_login with a forced password change (flag)', () => {
	it('returns a password change pending token and NO session when password_expired is set', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_expired: true } ) );

		const result = await user_login( createCtx(), { username: 'jdoe', password: OLD_PASSWORD } );

		expect( result.ok ).toBe( true );
		expect( result.data?.requires_password_change ).toBe( true );
		expect( result.data?.password_change_reason ).toBe( 'flag' );
		expect( result.data?.token ).toBeUndefined();
		expect( mockKvPut ).not.toHaveBeenCalled();

		const payload = await jwtVerify( result.data!.pending_token!, JWT_SECRET );
		expect( payload?.purpose ).toBe( 'password_change_pending' );
		expect( payload?.id_user ).toBe( 'user_1' );
	});

	it('does not reveal the expired state when the password is wrong', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_expired: true } ) );

		const result = await user_login( createCtx(), { username: 'jdoe', password: WRONG_PASSWORD } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 403 );
		expect( result.error?.message ).toBe( 'Invalid credentials' );
	});

	it('asks for the 2FA code first: the password change comes only after the second factor', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_expired: true, two_factor_enabled: true } ) );

		const result = await user_login( createCtx(), { username: 'jdoe', password: OLD_PASSWORD } );

		expect( result.data?.requires_2fa ).toBe( true );
		expect( result.data?.requires_password_change ).toBeFalsy();
		const payload = await jwtVerify( result.data!.pending_token!, JWT_SECRET );
		expect( payload?.purpose ).toBe( '2fa_pending' );
	});

	it('user_2fa_verify returns the password change pending token instead of a session', async () => {
		const encryptedSecret = await encryptData( { secret: TOTP_SECRET }, JWT_SECRET );
		mockGet.mockResolvedValueOnce(
			await dbUser( {
				password_expired: true,
				two_factor_enabled: true,
				two_factor_secret: encryptedSecret,
				two_factor_recovery_codes: [],
			} ),
		);

		const result = await user_2fa_verify( createCtx(), {
			pending_token: await makePendingToken( '2fa_pending' ),
			code: await totpGenerate( TOTP_SECRET ),
		} );

		expect( result.ok ).toBe( true );
		expect( result.data?.requires_password_change ).toBe( true );
		expect( result.data?.password_change_reason ).toBe( 'flag' );
		expect( result.data?.token ).toBeUndefined();
		expect( mockKvPut ).not.toHaveBeenCalled();
	});
});

describe('user_login with the automatic password expiry (passwordMaxAgeDays)', () => {
	it('never expires when passwordMaxAgeDays is 0, however old the password is', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_changed_at: Date.now() - 3650 * DAY_MS } ) );

		const result = await user_login( createCtx( 0 ), { username: 'jdoe', password: OLD_PASSWORD } );

		expect( result.ok ).toBe( true );
		expect( result.data?.token ).toEqual( expect.any( String ) );
		expect( result.data?.requires_password_change ).toBeFalsy();
	});

	it('never expires when the cfg.user section is missing', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_changed_at: Date.now() - 3650 * DAY_MS } ) );

		const result = await user_login( createCtx(), { username: 'jdoe', password: OLD_PASSWORD } );

		expect( result.data?.token ).toEqual( expect.any( String ) );
	});

	it('ignores a negative or non numeric passwordMaxAgeDays', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_changed_at: Date.now() - 3650 * DAY_MS } ) );
		const negative = await user_login( createCtx( -5 ), { username: 'jdoe', password: OLD_PASSWORD } );
		expect( negative.data?.token ).toEqual( expect.any( String ) );

		mockGet.mockResolvedValueOnce( await dbUser( { password_changed_at: Date.now() - 3650 * DAY_MS } ) );
		const text = await user_login( createCtx( 'soon' as any ), { username: 'jdoe', password: OLD_PASSWORD } );
		expect( text.data?.token ).toEqual( expect.any( String ) );
	});

	it('lets the user in while the password is younger than the limit', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_changed_at: Date.now() - 29 * DAY_MS } ) );

		const result = await user_login( createCtx( 30 ), { username: 'jdoe', password: OLD_PASSWORD } );

		expect( result.data?.token ).toEqual( expect.any( String ) );
	});

	it('blocks the login with reason "age" once the password is older than the limit', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_changed_at: Date.now() - 31 * DAY_MS } ) );

		const result = await user_login( createCtx( 30 ), { username: 'jdoe', password: OLD_PASSWORD } );

		expect( result.ok ).toBe( true );
		expect( result.data?.requires_password_change ).toBe( true );
		expect( result.data?.password_change_reason ).toBe( 'age' );
		expect( result.data?.token ).toBeUndefined();
	});

	it('never expires a user whose password_changed_at is unknown (null)', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_changed_at: null } ) );

		const result = await user_login( createCtx( 30 ), { username: 'jdoe', password: OLD_PASSWORD } );

		expect( result.data?.token ).toEqual( expect.any( String ) );
	});

	it('reports the flag reason when both the flag and the age apply', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_expired: true, password_changed_at: Date.now() - 400 * DAY_MS } ) );

		const result = await user_login( createCtx( 30 ), { username: 'jdoe', password: OLD_PASSWORD } );

		expect( result.data?.password_change_reason ).toBe( 'flag' );
	});
});

describe('user_password_change_expired', () => {
	it('stores the new password, clears the flag, bumps token_version and returns a full login', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_expired: true } ) );

		const before = Date.now();
		const result = await user_password_change_expired( createCtx(), {
			pending_token: await makePendingToken( 'password_change_pending' ),
			password: NEW_PASSWORD,
		} );

		expect( result.ok ).toBe( true );
		expect( result.data?.token ).toEqual( expect.any( String ) );
		expect( result.data?.refresh_token ).toEqual( expect.any( String ) );
		expect( result.data?.requires_password_change ).toBeFalsy();
		expect( result.data?.id ).toBe( 'user_1' );

		const patch = mockSet.mock.calls[0][0];
		expect( patch.password_expired ).toBe( false );
		expect( patch.token_version ).toBe( 4 );
		expect( patch.password_changed_at ).toBeGreaterThanOrEqual( before );
		expect( await verifyPassword( NEW_PASSWORD, patch.password ) ).toBe( true );
	});

	it('also completes a change required by the automatic expiry', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_changed_at: Date.now() - 31 * DAY_MS } ) );

		const result = await user_password_change_expired( createCtx( 30 ), {
			pending_token: await makePendingToken( 'password_change_pending' ),
			password: NEW_PASSWORD,
		} );

		expect( result.ok ).toBe( true );
		expect( result.data?.token ).toEqual( expect.any( String ) );
	});

	it('rejects a malformed pending_token without touching the DB', async () => {
		const result = await user_password_change_expired( createCtx(), { pending_token: 'garbage', password: NEW_PASSWORD } );

		expect( result.ok ).toBe( false );
		expect( result.status ).toBe( 401 );
		expect( mockGet ).not.toHaveBeenCalled();
	});

	it('rejects an expired pending_token', async () => {
		vi.useFakeTimers( { toFake: [ 'Date' ] } );
		try {
			const pending_token = await makePendingToken( 'password_change_pending', 'user_1', 1 );
			vi.setSystemTime( Date.now() + 10_000 );

			const result = await user_password_change_expired( createCtx(), { pending_token, password: NEW_PASSWORD } );

			expect( result.status ).toBe( 401 );
			expect( mockGet ).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});

	it('rejects a 2FA pending token: the tokens are not interchangeable', async () => {
		const result = await user_password_change_expired( createCtx(), {
			pending_token: await makePendingToken( '2fa_pending' ),
			password: NEW_PASSWORD,
		} );

		expect( result.status ).toBe( 401 );
		expect( mockGet ).not.toHaveBeenCalled();
	});

	it('rejects a password shorter than 8 characters', async () => {
		const result = await user_password_change_expired( createCtx(), {
			pending_token: await makePendingToken( 'password_change_pending' ),
			password: SHORT_PASSWORD,
		} );

		expect( result.status ).toBe( 400 );
		expect( result.error?.code ).toBe( 'PASSWORD_TOO_SHORT' );
		expect( mockSet ).not.toHaveBeenCalled();
	});

	it('rejects a new password equal to the current one', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_expired: true } ) );

		const result = await user_password_change_expired( createCtx(), {
			pending_token: await makePendingToken( 'password_change_pending' ),
			password: OLD_PASSWORD,
		} );

		expect( result.status ).toBe( 400 );
		expect( result.error?.code ).toBe( 'PASSWORD_UNCHANGED' );
		expect( mockSet ).not.toHaveBeenCalled();
	});

	it('cannot be replayed: once changed, the same token no longer works', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_expired: false, password_changed_at: Date.now() } ) );

		const result = await user_password_change_expired( createCtx( 30 ), {
			pending_token: await makePendingToken( 'password_change_pending' ),
			password: NEW_PASSWORD,
		} );

		expect( result.status ).toBe( 400 );
		expect( result.error?.code ).toBe( 'PASSWORD_CHANGE_NOT_REQUIRED' );
		expect( mockSet ).not.toHaveBeenCalled();
	});

	it('rejects a token of a user that was disabled in the meantime', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_expired: true, enabled: false } ) );

		const result = await user_password_change_expired( createCtx(), {
			pending_token: await makePendingToken( 'password_change_pending' ),
			password: NEW_PASSWORD,
		} );

		expect( result.status ).toBe( 403 );
		expect( mockSet ).not.toHaveBeenCalled();
	});

	it('rejects a token of a user that no longer exists', async () => {
		mockGet.mockResolvedValueOnce( undefined );

		const result = await user_password_change_expired( createCtx(), {
			pending_token: await makePendingToken( 'password_change_pending' ),
			password: NEW_PASSWORD,
		} );

		expect( result.status ).toBe( 401 );
	});
});

describe('user_set_password_expired (admin)', () => {
	const admin = { id: 'admin_1', domain: 'acme', perms: [ 'user.password' ] };

	it('sets the flag on a user of the same domain', async () => {
		mockGet
			.mockResolvedValueOnce( await dbUser() ) // existing user
			.mockResolvedValueOnce( await dbUser( { password_expired: true } ) ); // re-read after update

		const result = await user_set_password_expired( createCtx( undefined, admin ), { id: 'user_1', password_expired: true } );

		expect( result.ok ).toBe( true );
		expect( mockSet ).toHaveBeenCalledWith( { password_expired: true } );
		expect( result.data?.password ).toBeNull();
	});

	it('clears the flag', async () => {
		mockGet
			.mockResolvedValueOnce( await dbUser( { password_expired: true } ) )
			.mockResolvedValueOnce( await dbUser() );

		const result = await user_set_password_expired( createCtx( undefined, admin ), { id: 'user_1', password_expired: false } );

		expect( result.ok ).toBe( true );
		expect( mockSet ).toHaveBeenCalledWith( { password_expired: false } );
	});

	it('answers 404 for an unknown user', async () => {
		mockGet.mockResolvedValueOnce( undefined );

		const result = await user_set_password_expired( createCtx( undefined, admin ), { id: 'nope', password_expired: true } );

		expect( result.status ).toBe( 404 );
	});

	it('refuses to act on a user of another domain', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { domain: 'other' } ) );

		const result = await user_set_password_expired( createCtx( undefined, admin ), { id: 'user_1', password_expired: true } );

		expect( result.status ).toBe( 403 );
		expect( mockSet ).not.toHaveBeenCalled();
	});

	it('answers 401 when nobody is logged in', async () => {
		const result = await user_set_password_expired( createCtx(), { id: 'user_1', password_expired: true } );

		expect( result.status ).toBe( 401 );
	});
});

describe('user_set_password keeps the expiry data in sync', () => {
	it('records password_changed_at when someone changes the password', async () => {
		const admin = { id: 'admin_1', domain: 'acme', perms: [ 'user.password' ] };
		mockGet
			.mockResolvedValueOnce( await dbUser( { password_expired: true } ) )
			.mockResolvedValueOnce( await dbUser() );

		const before = Date.now();
		const result = await user_set_password( createCtx( undefined, admin ), { id: 'user_1', password: ADMIN_RESET_PASSWORD } );

		expect( result.ok ).toBe( true );
		const patch = mockSet.mock.calls[0][0];
		expect( patch.password_changed_at ).toBeGreaterThanOrEqual( before );
		// an admin reset must not silently lift the forced change
		expect( 'password_expired' in patch ).toBe( false );
	});

	it('clears password_expired when the owner changes their own password', async () => {
		const owner = { id: 'user_1', domain: 'acme', perms: [] };
		mockGet
			.mockResolvedValueOnce( await dbUser( { password_expired: true } ) )
			.mockResolvedValueOnce( await dbUser() );

		const result = await user_set_password( createCtx( undefined, owner ), { id: 'user_1', password: OWN_NEW_PASSWORD } );

		expect( result.ok ).toBe( true );
		expect( mockSet.mock.calls[0][0].password_expired ).toBe( false );
	});
});

describe('per user password max age (password_max_age_days)', () => {
	const login = async ( maxAgeGlobal : number | undefined, over : Record<string, any> ) => {
		mockGet.mockResolvedValueOnce( await dbUser( over ) );
		return user_login( createCtx( maxAgeGlobal ), { username: 'jdoe', password: OLD_PASSWORD } );
	};

	it('0 means this user never expires, even when the global limit is on', async () => {
		const result = await login( 30, { password_max_age_days: 0, password_changed_at: Date.now() - 400 * DAY_MS } );

		expect( result.data?.token ).toEqual( expect.any( String ) );
	});

	it('a value on the user wins over a global limit of 0', async () => {
		const result = await login( 0, { password_max_age_days: 10, password_changed_at: Date.now() - 11 * DAY_MS } );

		expect( result.data?.requires_password_change ).toBe( true );
		expect( result.data?.password_change_reason ).toBe( 'age' );
	});

	it('a value on the user wins over a longer global limit', async () => {
		const result = await login( 365, { password_max_age_days: 10, password_changed_at: Date.now() - 11 * DAY_MS } );

		expect( result.data?.password_change_reason ).toBe( 'age' );
	});

	it('a value on the user wins over a shorter global limit', async () => {
		const result = await login( 30, { password_max_age_days: 90, password_changed_at: Date.now() - 40 * DAY_MS } );

		expect( result.data?.token ).toEqual( expect.any( String ) );
	});

	it('null on the user falls back to the global limit', async () => {
		const result = await login( 30, { password_max_age_days: null, password_changed_at: Date.now() - 40 * DAY_MS } );

		expect( result.data?.password_change_reason ).toBe( 'age' );
	});

	it('a negative value on the user is ignored: the global limit applies', async () => {
		const result = await login( 30, { password_max_age_days: -5, password_changed_at: Date.now() - 40 * DAY_MS } );

		expect( result.data?.password_change_reason ).toBe( 'age' );
	});

	it('still never expires when the password date is unknown', async () => {
		const result = await login( 0, { password_max_age_days: 10, password_changed_at: null } );

		expect( result.data?.token ).toEqual( expect.any( String ) );
	});

	it('the forced flag wins over a user with 0 days', async () => {
		const result = await login( 0, { password_max_age_days: 0, password_expired: true } );

		expect( result.data?.password_change_reason ).toBe( 'flag' );
	});
});

describe('user_set_password_max_age (admin)', () => {
	const admin = { id: 'admin_1', domain: 'acme', perms: [ 'user.password' ] };
	const call = ( params : { id : string; days? : number }, caller : any = admin ) => user_set_password_max_age( createCtx( undefined, caller ), params );

	it('stores the number of days', async () => {
		mockGet.mockResolvedValueOnce( await dbUser() ).mockResolvedValueOnce( await dbUser( { password_max_age_days: 45 } ) );

		const result = await call( { id: 'user_1', days: 45 } );

		expect( result.ok ).toBe( true );
		expect( mockSet ).toHaveBeenCalledWith( { password_max_age_days: 45 } );
		expect( result.data?.password ).toBeNull();
	});

	it('stores 0 (never expires) and does not confuse it with "not set"', async () => {
		mockGet.mockResolvedValueOnce( await dbUser() ).mockResolvedValueOnce( await dbUser( { password_max_age_days: 0 } ) );

		await call( { id: 'user_1', days: 0 } );

		expect( mockSet ).toHaveBeenCalledWith( { password_max_age_days: 0 } );
	});

	it('a missing days clears the value (null: use the global default)', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_max_age_days: 45 } ) ).mockResolvedValueOnce( await dbUser() );

		const result = await call( { id: 'user_1' } );

		expect( result.ok ).toBe( true );
		expect( mockSet ).toHaveBeenCalledWith( { password_max_age_days: null } );
	});

	it('a null days also clears the value: the schema would coerce it to 0 (never expires), it must not', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { password_max_age_days: 45 } ) ).mockResolvedValueOnce( await dbUser() );

		const result = await call( { id: 'user_1', days: null as any } );

		expect( result.ok ).toBe( true );
		expect( mockSet ).toHaveBeenCalledWith( { password_max_age_days: null } );
	});

	it.each( [ -1, 1.5, 3651 ] )( 'rejects %s days', async ( days ) => {
		const result = await call( { id: 'user_1', days } );

		expect( result.status ).toBe( 400 );
		expect( result.error?.code ).toBe( 'INVALID_PASSWORD_MAX_AGE' );
		expect( mockSet ).not.toHaveBeenCalled();
	} );

	it('answers 404 for an unknown user', async () => {
		mockGet.mockResolvedValueOnce( undefined );

		const result = await call( { id: 'nope', days: 30 } );

		expect( result.status ).toBe( 404 );
	});

	it('refuses to act on a user of another domain', async () => {
		mockGet.mockResolvedValueOnce( await dbUser( { domain: 'other' } ) );

		const result = await call( { id: 'user_1', days: 30 } );

		expect( result.status ).toBe( 403 );
		expect( mockSet ).not.toHaveBeenCalled();
	});

	it('answers 401 when nobody is logged in', async () => {
		const result = await call( { id: 'user_1', days: 30 }, null );

		expect( result.status ).toBe( 401 );
	});
});
