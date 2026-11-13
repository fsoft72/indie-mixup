import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for Set email verification status
 *
 * @property {string} id - User ID (required)
 * @property {boolean} verified - If the email is verified or not (required)
 */
const UserSetEmailVerifiedSchema = z.object( {
	id: z.string(),
	verified: zodBoolean,
} );

/** Parameters for user_set_email_verified */
export type UserSetEmailVerifiedParams = z.infer<typeof UserSetEmailVerifiedSchema>;

/*=== f2c_start user_set_email_verified_headers ===*/

import { users } from '../schema';

import { ERR_DB_ERROR } from '@backend/liwe3';
/*=== f2c_end user_set_email_verified_headers ===*/

/**
 * Set email verification status
 *
 * @permissions user.verify
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserSetEmailVerifiedParams} params - Request parameters
 * @param {string} params.id - User ID
 * @param {boolean} params.verified - If the email is verified or not
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_set_email_verified = async ( ctx : LiWECtx, params : UserSetEmailVerifiedParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	const validation = paramsValidation<UserSetEmailVerifiedParams>( UserSetEmailVerifiedSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, verified } = validation.data;

	/*=== f2c_start user_set_email_verified ===*/
	try {
		if ( !sys?.skip_permissions_check ) {
			const user = await ctx.user();
			if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

			// authorization is on the route gate (see index.ts)
		}

		const existingUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !existingUser ) {
			return responseError( 'User not found', 404, 'USER_NOT_FOUND' );
		}

		// Administrative override: bypasses the real email-ownership verification
		// flow (user-email-verify.ts). verified_at tracks when this was set.
		await ctx.app.db
			.update( users )
			.set( {
				email_verified: verified,
				verified_at: verified ? Date.now() : null,
			} )
			.where( eq( users.id, id ) )
			.run();

		const updatedUser = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !updatedUser ) return responseError( 'Failed to retrieve updated user', 500, ERR_DB_ERROR );

		updatedUser.password = null;
		updatedUser.domain = null;
		return responseSuccess( updatedUser as any );
	} catch ( error ) {
		if ( error instanceof Error ) {
			return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		}
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_set_email_verified ===*/
};
