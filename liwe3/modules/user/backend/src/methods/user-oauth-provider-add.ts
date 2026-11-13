import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserOAUTHProvider } from '../types';

/**
 * Schema for user_oauth_provider_add parameters
 *
 * @property {[string]} id - The Provider ID (if any)
 * @property {string} provider - The provider name (required)
 * @property {string} client_id - Client ID (required)
 * @property {string} client_secret - Client Secret (required)
 * @property {[boolean]} enabled - Flag T/F for enabled
 */
const UserOauthProviderAddSchema = z.object( {
	id: z.string().optional(),
	provider: z.string(),
	client_id: z.string(),
	client_secret: z.string(),
	enabled: zodBoolean.optional(),
} );

/** Parameters for user_oauth_provider_add */
export type UserOauthProviderAddParams = z.infer<typeof UserOauthProviderAddSchema>;

/*=== f2c_start user_oauth_provider_add_headers ===*/

import { user_oauth_providers } from '../schema';

import { getOAuthProvider } from '../oauth';
import { mkid } from '@backend/liwe3';
import { encryptData } from '@backend/liwe3/src/crypto';
/*=== f2c_end user_oauth_provider_add_headers ===*/

/**
 * Add a new Provider
 *
 * @permissions user.oauth.manage
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserOauthProviderAddParams} params - Request parameters
 * @param {string} ?params.id - The Provider ID (if any)
 * @param {string} params.provider - The provider name
 * @param {string} params.client_id - Client ID
 * @param {string} params.client_secret - Client Secret
 * @param {boolean} ?params.enabled - Flag T/F for enabled
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserOAUTHProvider>>} Result object with success status and data or error details
 */
export const user_oauth_provider_add = async ( ctx : LiWECtx, params : UserOauthProviderAddParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UserOAUTHProvider>> => {
	const validation = paramsValidation<UserOauthProviderAddParams>( UserOauthProviderAddSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, provider, client_id, client_secret, enabled } = validation.data;

	/*=== f2c_start user_oauth_provider_add ===*/

	if ( !sys?.skip_permissions_check ) {
		const user = await ctx.user();
		if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );
		// authorization is on the route gate (see index.ts)
	}

	if ( !getOAuthProvider( provider ) ) return responseError( 'Unsupported OAuth provider', 400, 'OAUTH_PROVIDER_UNSUPPORTED' );

	try {
		const domain = sys?.domain || ( await ctx.user() )?.domain || '__no_domain';

		const existingProvider = id
			? await ctx.app.db.select().from( user_oauth_providers ).where(
				sys?.skip_permissions_check
					? eq( user_oauth_providers.id, id )
					: and( eq( user_oauth_providers.id, id ), eq( user_oauth_providers.domain, domain ) ),
			).get()
			: undefined;

		if ( id && !existingProvider ) return responseError( 'Provider not found', 404, 'OAUTH_PROVIDER_NOT_FOUND' );

		const duplicate = await ctx.app.db.select( { id: user_oauth_providers.id } ).from( user_oauth_providers ).where( and(
			eq( user_oauth_providers.domain, domain ),
			eq( user_oauth_providers.provider, provider ),
		) ).get();

		if ( duplicate && duplicate.id !== id ) return responseError( 'Provider already configured for this domain', 400, 'OAUTH_PROVIDER_DUPLICATE' );

		const encryptedSecret = await encryptData( { client_secret }, ctx.app.cfg.jwt.secret );

		if ( existingProvider ) {
			await ctx.app.db.update( user_oauth_providers ).set( {
				client_id,
				client_secret: encryptedSecret,
				enabled: enabled === undefined ? existingProvider.enabled : enabled,
			} ).where( eq( user_oauth_providers.id, existingProvider.id ) ).run();
		} else {
			await ctx.app.db.insert( user_oauth_providers ).values( {
				id: mkid( 'oaup' ),
				domain,
				provider,
				client_id,
				client_secret: encryptedSecret,
				enabled: enabled === undefined ? true : enabled,
			} ).run();
		}

		const savedProvider = await ctx.app.db.select().from( user_oauth_providers ).where( and(
			eq( user_oauth_providers.domain, domain ),
			eq( user_oauth_providers.provider, provider ),
		) ).get();

		if ( !savedProvider ) return responseError( 'Provider save failed', 500 );

		// never echo the secret back, not even encrypted
		savedProvider.client_secret = null as any;

		return responseSuccess( savedProvider as any );
	} catch ( error ) {
		if ( error instanceof Error ) return responseError( `Database error: ${error.message}`, 500, 'DATABASE_ERROR' );
		return responseError( 'Unknown error occurred', 500 );
	}
	/*=== f2c_end user_oauth_provider_add ===*/
};
