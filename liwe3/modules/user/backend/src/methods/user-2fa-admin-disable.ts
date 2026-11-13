import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Disable a user 2FA
 *
 * @property {string} id_user - The user to disable 2FA (required)
 */
const User2faAdminDisableSchema = z.object( {
	id_user: z.string(),
} );

/** Parameters for user_2fa_admin_disable */
export type User2faAdminDisableParams = z.infer<typeof User2faAdminDisableSchema>;

/*=== f2c_start user_2fa_admin_disable_headers ===*/

import { users } from '../schema';
/*=== f2c_end user_2fa_admin_disable_headers ===*/

/**
 * Disable a user 2FA
 *
 * @permissions user.2fa.manage
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {User2faAdminDisableParams} params - Request parameters
 * @param {string} params.id_user - The user to disable 2FA
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const user_2fa_admin_disable = async ( ctx : LiWECtx, params : User2faAdminDisableParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<User2faAdminDisableParams>( User2faAdminDisableSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_user } = validation.data;

	/*=== f2c_start user_2fa_admin_disable ===*/

	if ( !sys?.skip_permissions_check ) {
		const user = await ctx.user();
		if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );
		// authorization is on the route gate (see index.ts)
	}

	const targetUser = await ctx.app.db.select().from( users ).where( eq( users.id, id_user ) ).get();
	if ( !targetUser ) return responseError( 'User not found', 404, 'USER_NOT_FOUND' );

	await ctx.app.db.update( users ).set( {
		two_factor_enabled: false,
		two_factor_secret: null,
		two_factor_recovery_codes: null,
	} ).where( eq( users.id, id_user ) ).run();

	return responseSuccess( true );
	/*=== f2c_end user_2fa_admin_disable ===*/
};
