import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for user_oauth_authorize parameters
 *
 * @property {string} provider - Provider name (required)
 * @property {string} redirect_url - Provider redirect (required)
 */
const UserOauthAuthorizeSchema = z.object( {
	provider: z.string(),
	redirect_url: z.string(),
} );

/** Parameters for user_oauth_authorize */
export type UserOauthAuthorizeParams = z.infer<typeof UserOauthAuthorizeSchema>;

/*=== f2c_start user_oauth_authorize_headers ===*/

import { user_oauth_providers } from '../schema';
import { getOAuthProvider } from '../oauth';
import { mkid } from '@backend/liwe3';
import { resolveDomainFromHost } from './utils';

const OAUTH_STATE_EXPIRY = 300; // 5 minutes, same as the 2FA pending_token
/*=== f2c_end user_oauth_authorize_headers ===*/

/**
 * Authorize an OAUTH
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserOauthAuthorizeParams} params - Request parameters
 * @param {string} params.provider - Provider name
 * @param {string} params.redirect_url - Provider redirect
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<string>>} Result object with success status and data or error details
 */
export const user_oauth_authorize = async ( ctx : LiWECtx, params : UserOauthAuthorizeParams, sys? : LiWESysParams ) : Promise<LiWEResponse<string>> => {
	const validation = paramsValidation<UserOauthAuthorizeParams>( UserOauthAuthorizeSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { provider, redirect_url } = validation.data;

	/*=== f2c_start user_oauth_authorize ===*/

	const adapter = getOAuthProvider( provider );
	if ( !adapter ) return responseError( 'Unsupported OAuth provider', 400, 'OAUTH_PROVIDER_UNSUPPORTED' );

	const domain = resolveDomainFromHost( ctx.app, ctx.c?.req.header( 'host' ) );

	const providerConfig = await ctx.app.db.select().from( user_oauth_providers ).where( and(
		eq( user_oauth_providers.domain, domain ),
		eq( user_oauth_providers.provider, provider ),
		eq( user_oauth_providers.enabled, true ),
	) ).get();

	if ( !providerConfig ) return responseError( 'Provider not configured', 400, 'OAUTH_PROVIDER_NOT_CONFIGURED' );

	const state = mkid( 'oaus' );

	await ctx.app.kv.put(
		`oauth_state:${state}`,
		JSON.stringify( {
			domain,
			provider,
			redirect_url,
		} ),
		{ expirationTtl: OAUTH_STATE_EXPIRY },
	);

	const authorizeUrl = adapter.getAuthorizeUrl( providerConfig.client_id, redirect_url, state );

	return responseSuccess( authorizeUrl );
	/*=== f2c_end user_oauth_authorize ===*/
};
