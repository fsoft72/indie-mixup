import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserLogin } from '../types';

/**
 * Schema for User login
 *
 * @property {string} username - User's username (required)
 * @property {string} password - User's password (required)
 * @property {[string]} domain - Domain to log into. Needed only when the credentials match accounts in more than one domain
 */
const UserLoginSchema = z.object( {
	username: z.string(),
	password: z.string(),
	domain: z.string().optional(),
} );

/** Parameters for user_login */
export type UserLoginParams = z.infer<typeof UserLoginSchema>;

/*=== f2c_start user_login_headers ===*/
import { email_normalize } from './utils';
import { users } from '../schema';
import { User } from '../types';
import { jwtCreate, sha256, verifyPassword } from '@backend/liwe3/src/crypto';
import { liwe_event_emit, logger, sessionCreate } from '@backend/liwe3';
import { USER_EVENT_LOGIN } from '../events';
import { refresh_token_issue } from './utils';

const TWO_FA_PENDING_TOKEN_EXPIRY = 300; // 5 minutes
const PASSWORD_CHANGE_PENDING_EXPIRY = 300; // 5 minutes
const MS_PER_DAY = 86400000;

/** Max accounts checked in one login: bounds the PBKDF2 work an unauthenticated request can cause */
const MAX_LOGIN_CANDIDATES = 10;

/** `purpose` claim of the token that authorizes ONE password change (see user_password_change_expired) */
export const PASSWORD_CHANGE_PURPOSE = 'password_change_pending';

/** Why a password change is required: forced by an admin (`flag`) or too old (`age`) */
export type PasswordChangeReason = 'flag' | 'age';

// Precomputed, valid-format password hash used to run `verifyPassword` even when
// the username does not exist. Without this, the "user not found" branch returns
// immediately while the "user found" branch spends hundreds of ms on PBKDF2,
// letting an attacker enumerate valid usernames by response latency.
// The actual value is irrelevant: it just has to cost the same to verify.
const DUMMY_PASSWORD_HASH = '8e3105fae4790c375ed27da4255a707f$aa2e4543b58dfd13117d448c23ca71a96b5a6552a2ed92c53a5080f4039de845';

/**
 * Returns a short, non-reversible fingerprint of a login identifier for logs.
 * Repeated failed attempts on the same identifier share a fingerprint (useful
 * for spotting brute-force patterns) without writing the raw username/email
 * into the worker logs (wrangler tail, Logpush).
 *
 * @param {string} identifier - The submitted username or email
 * @returns {Promise<string>} First 12 hex chars of its SHA-256 digest
 */
const _fingerprintIdentifier = async ( identifier : string ) : Promise<string> => {
	return ( await sha256( identifier ) ).slice( 0, 12 );
};

export const user_create_user_login = async ( ctx : LiWECtx, user : User ) : Promise<UserLogin> => {
	// Get token expiration from config
	const jwtExpiration = ctx.app.cfg.jwt.expiresIn || 1800; // 30 min default
	const refreshExpiration = ctx.app.cfg.jwt.refreshTokenDuration || 21600; // 6 hours default

	// Create session with user metadata and token version
	const sessionId = await sessionCreate( ctx.app.kv, ctx.app.name, user.id ?? '', {
		expiresIn: jwtExpiration,
		metadata: {
			id: user.id,
			username: user.username,
			email: user.email,
			perms: user.perms || [],
			domain: user.domain,
			loginTime: new Date().toISOString(),
		},
	}, user.token_version ?? 0 );

	// Create JWT with token version embedded
	const jwtSession = await jwtCreate(
		{
			session: sessionId,
			tokenVersion: user.token_version ?? 0,
		},
		ctx.app.cfg.jwt.secret,
		jwtExpiration,
	);

	// Issue a refresh token in a fresh rotation family. Existing tokens of other
	// sessions/devices are intentionally left in place (multi-session support).
	const newRefreshToken = await refresh_token_issue( ctx, user.id ?? '', refreshExpiration );

	const loginResult : UserLogin = {
		id: user.id ?? '',
		username: user.username,
		email: user.email ?? '',
		perms: ( user.perms || [] ) as string[],
		token: jwtSession,
		domain: user.domain || 'default',
		refresh_token: newRefreshToken,
		requires_2fa: false,
		requires_password_change: false,
		requires_domain_choice: false,
	};

	await liwe_event_emit( ctx, USER_EVENT_LOGIN, loginResult );

	return loginResult;
};

/**
 * Tells if the user must choose a new password before getting a session.
 *
 * - `flag`: an admin forced the change (`password_expired`)
 * - `age`: the max age is > 0 and the password is older than that. The max age is the
 *   one set on the user (`password_max_age_days`, 0 = never), or `cfg.user.passwordMaxAgeDays`
 *   when the user has none (null / invalid).
 *   A user with no `password_changed_at` (created before the field existed) never
 *   expires by age, until the first password change records the date.
 *
 * @param {LiWECtx} ctx - The request context (the max age comes from ctx.app.cfg)
 * @param {User} user - The user row
 * @returns {PasswordChangeReason | null} Why the change is required, or null when it is not
 */
export const user_password_change_reason = (
	ctx : LiWECtx,
	user : Pick<User, 'password_expired' | 'password_changed_at' | 'password_max_age_days'>,
) : PasswordChangeReason | null => {
	if ( user.password_expired ) return 'flag';

	// A value on the user (0 included) wins over the global one; null or a bad value falls back to it.
	// Number( undefined ) and Number( 'text' ) are NaN: both fall in the "disabled" case
	const own = user.password_max_age_days;
	const maxAgeDays = typeof own === 'number' && own >= 0 ? own : Number( ctx.app.cfg.user?.passwordMaxAgeDays );
	if ( !( maxAgeDays > 0 ) || !user.password_changed_at ) return null;

	return Date.now() - user.password_changed_at > maxAgeDays * MS_PER_DAY ? 'age' : null;
};

/**
 * Last step of a login, once the credentials (and the 2FA code, if any) are verified.
 * Creates the session, unless the password must be changed first: then NO session is
 * created and a short lived `password_change_pending` token is returned instead, to be
 * exchanged with the new password on `user_password_change_expired`.
 *
 * @param {LiWECtx} ctx - The request context
 * @param {User} user - The user who passed every authentication check
 * @returns {Promise<LiWEResponse<UserLogin>>} The full login, or `requires_password_change` + `pending_token`
 */
export const user_login_complete = async ( ctx : LiWECtx, user : User ) : Promise<LiWEResponse<UserLogin>> => {
	const reason = user_password_change_reason( ctx, user );
	if ( !reason ) return responseSuccess( await user_create_user_login( ctx, user ) );

	const pending_token = await jwtCreate(
		{ purpose: PASSWORD_CHANGE_PURPOSE, id_user: user.id },
		ctx.app.cfg.jwt.secret,
		PASSWORD_CHANGE_PENDING_EXPIRY,
	);

	return responseSuccess( { requires_password_change: true, password_change_reason: reason, pending_token } as UserLogin );
};
/*=== f2c_end user_login_headers ===*/

/**
 * User login
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserLoginParams} params - Request parameters
 * @param {string} params.username - User's username
 * @param {string} params.password - User's password
 * @param {string} ?params.domain - Domain to log into. Needed only when the credentials match accounts in more than one domain
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserLogin>>} Result object with success status and data or error details
 */
export const user_login = async ( ctx : LiWECtx, params : UserLoginParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UserLogin>> => {
	const validation = paramsValidation<UserLoginParams>( UserLoginSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { username, password, domain } = validation.data;

	/*=== f2c_start user_login ===*/

	try {
		// Find every account matching the username or the email (the same email can exist in several domains)
		const candidates = ( await ctx.app.db.select().from( users )
			.where( or( eq( users.username, username ), eq( users.email, email_normalize( username ) ) ) )
			.all() )
			.filter( ( u ) => !domain || ( u.domain ?? '_' ) === domain )
			.slice( 0, MAX_LOGIN_CANDIDATES );

		if ( candidates.length === 0 ) {
			// Burn the same PBKDF2 cost as the real path so response timing does
			// not reveal whether the username exists.
			await verifyPassword( password, DUMMY_PASSWORD_HASH );
			logger.warn( 'Login failed: user not found', {
				module: 'user',
				method: 'user_login',
				identifierFingerprint: await _fingerprintIdentifier( username ),
			} );
			return responseError( 'Invalid credentials', 403 );
		}

		// Verify the password on every candidate: the domains are disclosed only for the accounts it opens
		const matching : typeof candidates = [];
		for ( const candidate of candidates ) {
			if ( await verifyPassword( password, candidate.password ?? '' ) ) matching.push( candidate );
		}

		if ( matching.length === 0 ) {
			logger.warn( 'Login failed: invalid password', {
				module: 'user',
				method: 'user_login',
				id_user: candidates[0].id,
			} );
			return responseError( 'Invalid credentials', 403 );
		}

		// More than one account opens with these credentials: the user must say which domain to enter
		if ( matching.length > 1 ) {
			const domains = matching.map( ( u ) => u.domain ?? '_' );
			return responseSuccess( { requires_2fa: false, requires_password_change: false, requires_domain_choice: true, domains } );
		}

		const user = matching[0];

		// Check if the account is enabled
		if ( !user.enabled ) {
			return responseError( 'This account has been disabled. Contact an administrator for assistance.', 403, 'ACCOUNT_DISABLED' );
		}

		// Check if email is verified
		if ( !user.email_verified ) {
			return responseError( 'Please verify your email address before logging in. Check your inbox for the verification link.', 403, 'EMAIL_NOT_VERIFIED' );
		}

		if ( user.two_factor_enabled ) {
			const pending_token = await jwtCreate(
				{ purpose: '2fa_pending', id_user: user.id },
				ctx.app.cfg.jwt.secret,
				TWO_FA_PENDING_TOKEN_EXPIRY,
			);

			return responseSuccess( { requires_2fa: true, requires_password_change: false, requires_domain_choice: false, pending_token } );
		}

		return await user_login_complete( ctx, user as any );
	} catch ( error ) {
		logger.error( 'Login failed: session creation error', error instanceof Error ? error : undefined, {
			module: 'user',
			method: 'user_login',
		} );
		const errorMessage = error instanceof Error ? error.message : 'Login failed';
		return responseError( errorMessage, 500 );
	}
	/*=== f2c_end user_login ===*/
};
