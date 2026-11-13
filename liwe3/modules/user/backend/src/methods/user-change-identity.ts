import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserLogin } from '../types';

/**
 * Schema for Change identity and login as a different user
 *
 * @property {string} id_user - New user id (required)
 */
const UserChangeIdentitySchema = z.object( {
	id_user: z.string(),
} );

/** Parameters for user_change_identity */
export type UserChangeIdentityParams = z.infer<typeof UserChangeIdentitySchema>;

/*=== f2c_start user_change_identity_headers ===*/
import { user_create_user_login } from './user-login';
import { user_logout } from './user-logout';
import { users } from '../schema';
import { USER_PERM_CHANGE_IDENTITY } from '../perms';
import { has_perms } from '@backend/liwe3';
/*=== f2c_end user_change_identity_headers ===*/

/**
 * Change identity and login as a different user
 *
 * @permissions user.change_identity
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserChangeIdentityParams} params - Request parameters
 * @param {string} params.id_user - New user id
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserLogin>>} Result object with success status and data or error details
 */
export const user_change_identity = async ( ctx : LiWECtx, params : UserChangeIdentityParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UserLogin>> => {
	const validation = paramsValidation<UserChangeIdentityParams>( UserChangeIdentitySchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_user } = validation.data;

	/*=== f2c_start user_change_identity ===*/
	const user = await ctx.user();
	if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

	// SECURITY: server-side gate for impersonation. Never rely on the UI hiding
	// this action - `has_perms` resolves the real authenticated caller (session
	// built by ctxMiddleware, not from params) and also passes for `system.admin`.
	// `sys` is intentionally NOT consulted here: no skip_permissions_check bypass.
	if ( !await has_perms( ctx, [ USER_PERM_CHANGE_IDENTITY ] ) ) return responseError( 'Permission denied', 403, ERR_PERMISSION_DENIED );

	const newUser : any = await ctx.app.db.select().from( users ).where(
		eq( users.id, id_user ),
	).get();

	if ( !newUser ) return responseError( 'User not found', 404, 'ERROR_USER_NOT_FOUND' );

	// Logs out current user
	await user_logout( ctx );

	const userLogin : UserLogin = await user_create_user_login( ctx, newUser );

	return responseSuccess( userLogin );
	/*=== f2c_end user_change_identity ===*/
};
