import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserInvite } from '../types';

/*=== f2c_start user_invite_create_headers ===*/
import { user_invites } from '../schema';
import { mkid } from '@backend/liwe3';
import { ERR_DB_ERROR } from '@backend/liwe3';
/*=== f2c_end user_invite_create_headers ===*/

/**
 * Create an invite for the current user
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserInvite>>} Result object with success status and data or error details
 */
export const user_invite_create = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<UserInvite>> => {
	/*=== f2c_start user_invite_create ===*/
	const user = await ctx.user();

	if ( !user ) return responseError( 'User not authenticated', 401, ERR_UNAUTHORIZED );

	// first of all, let's see if an invitation has already been created for the current user
	const invOld = await ctx.app.db.select().from( user_invites ).where(
		and(
			eq( user_invites.id_user, user.id ?? 'x' ),
			eq( user_invites.domain, user.domain ?? '_' ),
		),
	).get();

	if ( invOld ) return responseSuccess( invOld );

	// If we get here, the user has no invitation yet, so we create one
	const inv : UserInvite = {
		id: mkid( 'inv' ),
		code: mkid( 'ui' ),
		id_user: user.id,
		domain: user.domain ?? 'x',
		count: 0,
	};

	const res = await ctx.app.db.insert( user_invites ).values( inv );

	if ( !res ) responseError( 'Failed to create user invitation', 500, ERR_DB_ERROR );

	return responseSuccess( inv );
	/*=== f2c_end user_invite_create ===*/
};
