import { LOGGED, type LiWEApp, PUBLIC, permissions_register, routeBody, routeGet } from '@backend/liwe3';
import {
	user_2fa_admin_disable,
	user_2fa_disable,
	user_2fa_enable,
	user_2fa_setup,
	user_2fa_verify,
	user_add,
	user_change_identity,
	user_create_admin,
	user_delete,
	user_email_resend,
	user_email_verify,
	user_invite_create,
	user_list,
	user_login,
	user_logout,
	user_me,
	user_oauth_authorize,
	user_oauth_callback,
	user_oauth_provider_add,
	user_oauth_provider_del,
	user_oauth_provider_list,
	user_password_change_expired,
	user_perms_set,
	user_register,
	user_register_config,
	user_role_add,
	user_role_assign,
	user_role_del,
	user_role_list,
	user_set_email_verified,
	user_set_enabled,
	user_set_password,
	user_set_password_expired,
	user_set_password_max_age,
	user_token_refresh,
} from './methods';
import {
	USER_PERMISSIONS,
	USER_PERM_2FA_MANAGE,
	USER_PERM_CHANGE_IDENTITY,
	USER_PERM_CREATE,
	USER_PERM_DELETE,
	USER_PERM_ENABLE,
	USER_PERM_LIST,
	USER_PERM_OAUTH_MANAGE,
	USER_PERM_PASSWORD,
	USER_PERM_PERMS,
	USER_PERM_ROLE_MANAGE,
	USER_PERM_VERIFY,
} from './perms';

/*=== f2c_start _module ===*/
import { listeners_init } from './listeners';
import { user_create_default_users } from './internals';
import { ipKey, ipPathKey, rateLimitMiddleware } from '@backend/liwe3';

// Exposed for the host worker's scheduled handler (refresh-token GC).
export { refresh_tokens_gc } from './methods/utils';

/**
 * Data-only initialization: creates default admin user.
 * Does NOT register routes. Used for test DB re-seeding.
 */
export const module_seed = async ( app : LiWEApp ) => {
	console.log( '    [seed] user: default users' );
	await user_create_default_users( app );
};
/*=== f2c_end _module ===*/

// Module initialization function
export const module_init = async ( app : LiWEApp ) => {
	console.log( '=== Module: user' );

	/*=== f2c_start module_init ===*/
	listeners_init( app );
	await user_create_default_users( app );

	// Rate limit the credential-verifying endpoints. Registered before the
	// routes below so it always runs first; no-op when the RL_* bindings are
	// absent (local dev). RL_AUTH: login / token refresh / password set.
	// RL_2FA: the 2FA code check, keyed per IP+path to bound a 6-digit brute force.
	app.hono.use( '/api/user/login', rateLimitMiddleware( 'RL_AUTH', ipKey ) );
	app.hono.use( '/api/user/token/refresh', rateLimitMiddleware( 'RL_AUTH', ipKey ) );
	app.hono.use( '/api/user/set/password', rateLimitMiddleware( 'RL_AUTH', ipKey ) );
	// Unauthenticated (the pending token is the credential) and it hashes a password
	app.hono.use( '/api/user/password/change-expired', rateLimitMiddleware( 'RL_AUTH', ipKey ) );
	app.hono.use( '/api/user/2fa/verify', rateLimitMiddleware( 'RL_2FA', ipPathKey ) );
	// Unauthenticated and it triggers an outbound email: rate limit per IP.
	app.hono.use( '/api/user/email/resend', rateLimitMiddleware( 'RL_AUTH', ipKey ) );
	// Unauthenticated, hashes a password, sends an email and checks the auth code: rate limit per IP.
	app.hono.use( '/api/user/register', rateLimitMiddleware( 'RL_AUTH', ipKey ) );
	/*=== f2c_end module_init ===*/

	app.hono.post( '/api/user/add', routeBody( user_add, { perms: [ USER_PERM_CREATE ] } ) );

	app.hono.get( '/api/user/create/admin', routeGet( user_create_admin, { perms: PUBLIC } ) );

	app.hono.delete( '/api/user/delete', routeBody( user_delete, { perms: [ USER_PERM_DELETE ] } ) );

	app.hono.get( '/api/user/list', routeGet( user_list, { perms: [ USER_PERM_LIST ] } ) );

	app.hono.post( '/api/user/login', routeBody( user_login, { perms: PUBLIC } ) );

	app.hono.get( '/api/user/logout', routeGet( user_logout, { perms: LOGGED } ) );

	app.hono.get( '/api/user/me', routeGet( user_me, { perms: LOGGED } ) );

	app.hono.post( '/api/user/perms/set', routeBody( user_perms_set, { perms: [ USER_PERM_PERMS ] } ) );

	app.hono.post( '/api/user/invite/create', routeBody( user_invite_create, { perms: LOGGED } ) );

	app.hono.get( '/api/user/change/identity', routeGet( user_change_identity, { perms: [ USER_PERM_CHANGE_IDENTITY ] } ) );

	app.hono.post( '/api/user/token/refresh', routeBody( user_token_refresh, { perms: PUBLIC } ) );

	app.hono.post( '/api/user/role/add', routeBody( user_role_add, { perms: [ USER_PERM_ROLE_MANAGE ] } ) );

	app.hono.delete( '/api/user/role/del', routeBody( user_role_del, { perms: [ USER_PERM_ROLE_MANAGE ] } ) );

	app.hono.get( '/api/user/role/list', routeGet( user_role_list, { perms: [ USER_PERM_ROLE_MANAGE ] } ) );

	app.hono.post( '/api/user/role/assign', routeBody( user_role_assign, { perms: [ USER_PERM_PERMS ] } ) );

	app.hono.post( '/api/user/2fa/setup', routeBody( user_2fa_setup, { perms: LOGGED } ) );

	app.hono.post( '/api/user/2fa/enable', routeBody( user_2fa_enable, { perms: LOGGED } ) );

	app.hono.post( '/api/user/2fa/disable', routeBody( user_2fa_disable, { perms: LOGGED } ) );

	app.hono.post( '/api/user/2fa/verify', routeBody( user_2fa_verify, { perms: PUBLIC } ) );

	app.hono.post( '/api/user/2fa/admin/disable', routeBody( user_2fa_admin_disable, { perms: [ USER_PERM_2FA_MANAGE ] } ) );

	app.hono.post( '/api/user/oauth/provider/add', routeBody( user_oauth_provider_add, { perms: [ USER_PERM_OAUTH_MANAGE ] } ) );

	app.hono.get( '/api/user/oauth/provider/list', routeGet( user_oauth_provider_list, { perms: [ USER_PERM_OAUTH_MANAGE ] } ) );

	app.hono.delete( '/api/user/oauth/provider/del', routeBody( user_oauth_provider_del, { perms: [ USER_PERM_OAUTH_MANAGE ] } ) );

	app.hono.get( '/api/user/oauth/authorize', routeGet( user_oauth_authorize, { perms: PUBLIC } ) );

	app.hono.get( '/api/user/oauth/callback', routeGet( user_oauth_callback, { perms: PUBLIC } ) );

	app.hono.post( '/api/user/set/enabled', routeBody( user_set_enabled, { perms: [ USER_PERM_ENABLE ] } ) );

	app.hono.post( '/api/user/set/email_verified', routeBody( user_set_email_verified, { perms: [ USER_PERM_VERIFY ] } ) );

	app.hono.post( '/api/user/set/password', routeBody( user_set_password, { perms: [ USER_PERM_PASSWORD ] } ) );

	app.hono.post( '/api/user/email/verify', routeBody( user_email_verify, { perms: PUBLIC } ) );

	app.hono.post( '/api/user/email/resend', routeBody( user_email_resend, { perms: PUBLIC } ) );

	app.hono.post( '/api/user/set/password_expired', routeBody( user_set_password_expired, { perms: [ USER_PERM_PASSWORD ] } ) );

	app.hono.post( '/api/user/password/change-expired', routeBody( user_password_change_expired, { perms: PUBLIC } ) );

	app.hono.post( '/api/user/set/password_max_age', routeBody( user_set_password_max_age, { perms: [ USER_PERM_PASSWORD ] } ) );

	app.hono.post( '/api/user/register', routeBody( user_register, { perms: PUBLIC } ) );

	app.hono.get( '/api/user/register/config', routeGet( user_register_config, { perms: PUBLIC } ) );

	// Register user module permissions
	permissions_register( {
		module: 'user',
		perms: USER_PERMISSIONS,
	} );
};
