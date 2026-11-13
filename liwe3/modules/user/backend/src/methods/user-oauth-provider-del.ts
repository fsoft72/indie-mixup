import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for user_oauth_provider_del parameters
 *
 * @property {string} id - Provider ID (required)
 */
const UserOauthProviderDelSchema = z.object( {
	id: z.string(),
} );

/** Parameters for user_oauth_provider_del */
export type UserOauthProviderDelParams = z.infer<typeof UserOauthProviderDelSchema>;

/*=== f2c_start user_oauth_provider_del_headers ===*/

import { user_oauth_providers } from '../schema';
/*=== f2c_end user_oauth_provider_del_headers ===*/

/**
 * Removes a provider
 *
 * @permissions user.oauth.manage
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserOauthProviderDelParams} params - Request parameters
 * @param {string} params.id - Provider ID
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const user_oauth_provider_del = async ( ctx : LiWECtx, params : UserOauthProviderDelParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<UserOauthProviderDelParams>( UserOauthProviderDelSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start user_oauth_provider_del ===*/

	if ( !sys?.skip_permissions_check ) {
		const user = await ctx.user();
		if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );
		// authorization is on the route gate (see index.ts)
	}

	try {
		const domain = sys?.domain || ( await ctx.user() )?.domain || '__no_domain';

		const existingProvider = await ctx.app.db.select().from( user_oauth_providers ).where(
			sys?.skip_permissions_check
				? eq( user_oauth_providers.id, id )
				: and( eq( user_oauth_providers.id, id ), eq( user_oauth_providers.domain, domain ) ),
		).get();

		if ( !existingProvider ) return responseError( 'Provider not found', 404, 'OAUTH_PROVIDER_NOT_FOUND' );

		await ctx.app.db.delete( user_oauth_providers ).where( eq( user_oauth_providers.id, id ) ).run();

		return responseSuccess( true );
	} catch ( error ) {
		if ( error instanceof Error ) return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_oauth_provider_del ===*/
};
