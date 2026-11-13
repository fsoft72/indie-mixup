import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserOAUTHProvider } from '../types';

/**
 * Schema for Switches a configured provider on or off without touching its credentials
 *
 * @property {string} id - Provider ID (required)
 * @property {boolean} enabled - True to enable, false to disable (required)
 */
const UserOauthProviderEnableSchema = z.object( {
	id: z.string(),
	enabled: zodBoolean,
} );

/** Parameters for user_oauth_provider_enable */
export type UserOauthProviderEnableParams = z.infer<typeof UserOauthProviderEnableSchema>;

/*=== f2c_start user_oauth_provider_enable_headers ===*/

import { user_oauth_providers } from '../schema';
/*=== f2c_end user_oauth_provider_enable_headers ===*/

/**
 * Switches a configured provider on or off without touching its credentials
 *
 * @permissions user.oauth.manage
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserOauthProviderEnableParams} params - Request parameters
 * @param {string} params.id - Provider ID
 * @param {boolean} params.enabled - True to enable, false to disable
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserOAUTHProvider>>} Result object with success status and data or error details
 */
export const user_oauth_provider_enable = async ( ctx : LiWECtx, params : UserOauthProviderEnableParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UserOAUTHProvider>> => {
	const validation = paramsValidation<UserOauthProviderEnableParams>( UserOauthProviderEnableSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, enabled } = validation.data;

	/*=== f2c_start user_oauth_provider_enable ===*/

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

		await ctx.app.db.update( user_oauth_providers ).set( { enabled } ).where( eq( user_oauth_providers.id, existingProvider.id ) ).run();

		// never echo the secret back, not even encrypted
		const savedProvider = { ...existingProvider, enabled, client_secret: null };

		return responseSuccess( savedProvider as any );
	} catch ( error ) {
		if ( error instanceof Error ) return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_oauth_provider_enable ===*/
};
