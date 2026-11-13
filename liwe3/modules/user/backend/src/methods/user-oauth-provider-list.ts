import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserOAUTHProvider } from '../types';

/**
 * Schema for user_oauth_provider_list parameters
 *
 * @property {[number]} offset - Pagination offset
 * @property {[number]} limit - Pagination limit
 */
const UserOauthProviderListSchema = z.object( {
	offset: z.coerce.number().optional(),
	limit: z.coerce.number().optional(),
} );

/** Parameters for user_oauth_provider_list */
export type UserOauthProviderListParams = z.infer<typeof UserOauthProviderListSchema>;

/*=== f2c_start user_oauth_provider_list_headers ===*/

import { user_oauth_providers } from '../schema';
/*=== f2c_end user_oauth_provider_list_headers ===*/

/**
 * List all available providers
 *
 * @permissions user.oauth.manage
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserOauthProviderListParams} params - Request parameters
 * @param {number} ?params.offset - Pagination offset
 * @param {number} ?params.limit - Pagination limit
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserOAUTHProvider[]>>} Result object with success status and data or error details
 */
export const user_oauth_provider_list = async ( ctx : LiWECtx, params : UserOauthProviderListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UserOAUTHProvider[]>> => {
	const validation = paramsValidation<UserOauthProviderListParams>( UserOauthProviderListSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { offset, limit } = validation.data;

	/*=== f2c_start user_oauth_provider_list ===*/

	const u = await ctx.user();

	if ( !sys?.skip_permissions_check ) {
		if ( !u ) return responseError( 'User not authenticated', 401, ERR_UNAUTHORIZED );
		// authorization is on the route gate (see index.ts)
	}

	try {
		const domain = sys?.domain || u?.domain;

		let query = ctx.app.db.select().from( user_oauth_providers ).where( eq( user_oauth_providers.domain, domain ?? '--' ) );

		if ( offset !== undefined ) query = query.offset( offset ) as any;
		if ( limit !== undefined ) query = query.limit( limit ) as any;

		const providers = await query.all();

		// never expose the secret, not even encrypted
		for ( const p of providers ) p.client_secret = null as any;

		return responseSuccess( providers as any );
	} catch ( error ) {
		if ( error instanceof Error ) return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_oauth_provider_list ===*/
};
