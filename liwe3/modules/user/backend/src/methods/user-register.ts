import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for Public sign up. Rejected with 403 unless the config `user.allowRegistration` is true; when `user.registrationAuthCode` is not empty, `auth_code` must match it (403 otherwise). With `user.createDomain` true the user creates a new domain with the same code as the (lowercased) username, rejected with 400 if the username is not a valid domain code or the domain already exists, and becomes its owner with every user.* permission; with it false the user joins the system domain with no permission. The user is created with email_verified=false and a verification email is sent. Returns the created User (no password). Unauthenticated and sending an email, so it is rate limited per IP (RL_AUTH).
 *
 * @property {string} username - Username (min 3 characters) (required)
 * @property {string} email - Email address (also the unique key in the domain) (required)
 * @property {string} password - Password (min 8 characters) (required)
 * @property {[string]} name - First name
 * @property {[string]} lastname - Last name
 * @property {[string]} auth_code - Registration auth code. Required when `user.registrationAuthCode` is set
 */
const UserRegisterSchema = z.object( {
	username: z.string(),
	email: z.string(),
	password: z.string(),
	name: z.string().optional(),
	lastname: z.string().optional(),
	auth_code: z.string().optional(),
} );

/** Parameters for user_register */
export type UserRegisterParams = z.infer<typeof UserRegisterSchema>;

/*=== f2c_start user_register_headers ===*/
import { liwe_event_call } from '@backend/liwe3';
import { user_add } from './user-add';

const USERNAME_MIN_LENGTH = 3;
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A new domain code: lowercase, no `:` (reserved to the sub-domains), short enough for the 64 chars column
const DOMAIN_PATTERN = /^[a-z0-9][a-z0-9_-]{1,31}$/;

/**
 * Compares two texts without stopping at the first difference, so the time taken
 * does not tell how much of a guessed auth code was right.
 *
 * @param a - First text
 * @param b - Second text
 * @returns True when the texts are equal
 */
const _safe_equal = ( a : string, b : string ) : boolean => {
	let diff = a.length ^ b.length;
	const len = Math.max( a.length, b.length );
	for ( let i = 0; i < len; i++ ) diff |= ( a.charCodeAt( i ) || 0 ) ^ ( b.charCodeAt( i ) || 0 );
	return diff === 0;
};
/*=== f2c_end user_register_headers ===*/

/**
 * Public sign up. Rejected with 403 unless the config `user.allowRegistration` is true; when `user.registrationAuthCode` is not empty, `auth_code` must match it (403 otherwise). With `user.createDomain` true the user creates a new domain with the same code as the (lowercased) username, rejected with 400 if the username is not a valid domain code or the domain already exists, and becomes its owner with every user.* permission; with it false the user joins the system domain with no permission. The user is created with email_verified=false and a verification email is sent. Returns the created User (no password). Unauthenticated and sending an email, so it is rate limited per IP (RL_AUTH).
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserRegisterParams} params - Request parameters
 * @param {string} params.username - Username (min 3 characters)
 * @param {string} params.email - Email address (also the unique key in the domain)
 * @param {string} params.password - Password (min 8 characters)
 * @param {string} ?params.name - First name
 * @param {string} ?params.lastname - Last name
 * @param {string} ?params.auth_code - Registration auth code. Required when `user.registrationAuthCode` is set
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_register = async ( ctx : LiWECtx, params : UserRegisterParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	const validation = paramsValidation<UserRegisterParams>( UserRegisterSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { username, email, password, name, lastname, auth_code } = validation.data;

	/*=== f2c_start user_register ===*/
	const cfg = ctx.app.cfg.user;

	if ( !cfg?.allowRegistration ) return responseError( 'User registration is not allowed', 403, 'ERR_REGISTRATION_DISABLED' );

	const expected_code = cfg.registrationAuthCode ?? '';
	if ( expected_code !== '' && !_safe_equal( auth_code ?? '', expected_code ) ) return responseError( 'Invalid registration auth code', 403, 'ERR_INVALID_AUTH_CODE' );

	if ( username.trim().length < USERNAME_MIN_LENGTH ) return responseError( `The username must be at least ${USERNAME_MIN_LENGTH} characters long`, 400, 'ERR_INVALID_USERNAME' );
	if ( !EMAIL_PATTERN.test( email.trim() ) ) return responseError( 'Invalid email address', 400, 'ERR_INVALID_EMAIL' );
	if ( password.length < PASSWORD_MIN_LENGTH ) return responseError( `The password must be at least ${PASSWORD_MIN_LENGTH} characters long`, 400, 'ERR_INVALID_PASSWORD' );

	const user_data = { username: username.trim(), email: email.trim(), password, name, lastname };

	// Without a new domain the user joins the system domain, with no permission
	if ( !cfg.createDomain ) {
		const sys_domain = ctx.app.cfg.system?.domain ?? '_';
		return user_add( ctx, user_data, { skip_permissions_check: true, domain: sys_domain } );
	}

	// The domain is named after the username: an existing domain is rejected by the register call below
	const new_domain = user_data.username.toLowerCase();
	if ( !DOMAIN_PATTERN.test( new_domain ) )
		return responseError( 'This username cannot be used as a domain: use 2-32 lowercase letters, numbers, - and _', 400, 'ERR_INVALID_DOMAIN' );

	// The call rejects a domain that already has users and makes the new user its owner
	return liwe_event_call<User>( ctx, 'user', 'user.register', { ...user_data, domain: new_domain } );
	/*=== f2c_end user_register ===*/
};
