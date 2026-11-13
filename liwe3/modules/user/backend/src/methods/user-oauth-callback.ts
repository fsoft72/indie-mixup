import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { UserLogin } from '../types';

/**
 * Schema for user_oauth_callback parameters
 *
 * @property {string} state - state parameter (required)
 * @property {string} code - code parameter (required)
 */
const UserOauthCallbackSchema = z.object( {
	state: z.string(),
	code: z.string(),
} );

/** Parameters for user_oauth_callback */
export type UserOauthCallbackParams = z.infer<typeof UserOauthCallbackSchema>;

/*=== f2c_start user_oauth_callback_headers ===*/
import { email_normalize } from './utils';

import { user_oauth_links, user_oauth_providers, users } from '../schema';
import { getOAuthProvider } from '../oauth';
import { mkid } from '@backend/liwe3';
import { decryptData, hashPassword, jwtCreate } from '@backend/liwe3/src/crypto';
import { user_create_user_login } from './user-login';

const TWO_FA_PENDING_TOKEN_EXPIRY = 300; // 5 minutes, same as user_login

interface OAuthState {
	domain : string;
	provider : string;
	redirect_url : string;
}
/*=== f2c_end user_oauth_callback_headers ===*/

/**
 * Callback for OAUTH
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserOauthCallbackParams} params - Request parameters
 * @param {string} params.state - state parameter
 * @param {string} params.code - code parameter
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<UserLogin>>} Result object with success status and data or error details
 */
export const user_oauth_callback = async ( ctx : LiWECtx, params : UserOauthCallbackParams, sys? : LiWESysParams ) : Promise<LiWEResponse<UserLogin>> => {
	const validation = paramsValidation<UserOauthCallbackParams>( UserOauthCallbackSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { state, code } = validation.data;

	/*=== f2c_start user_oauth_callback ===*/

	try {
		const stateKey = `oauth_state:${state}`;
		const stateJson = await ctx.app.kv.get( stateKey );
		if ( !stateJson ) return responseError( 'Invalid or expired OAuth state', 400, 'OAUTH_STATE_INVALID' );

		await ctx.app.kv.delete( stateKey );

		const { domain, provider, redirect_url } : OAuthState = JSON.parse( stateJson );

		const adapter = getOAuthProvider( provider );
		if ( !adapter ) return responseError( 'Unsupported OAuth provider', 400, 'OAUTH_PROVIDER_UNSUPPORTED' );

		const providerConfig = await ctx.app.db.select().from( user_oauth_providers ).where( and(
			eq( user_oauth_providers.domain, domain ),
			eq( user_oauth_providers.provider, provider ),
			eq( user_oauth_providers.enabled, true ),
		) ).get();

		if ( !providerConfig ) return responseError( 'Provider not configured', 400, 'OAUTH_PROVIDER_NOT_CONFIGURED' );

		const { client_secret } = await decryptData( providerConfig.client_secret, ctx.app.cfg.jwt.secret ) as { client_secret : string };

		let accessToken : string;
		try {
			const tokens = await adapter.exchangeCode( providerConfig.client_id, client_secret, code, redirect_url );
			accessToken = tokens.accessToken;
		} catch ( error ) {
			return responseError( 'OAuth exchange failed', 502, 'OAUTH_EXCHANGE_FAILED' );
		}

		let profile;
		try {
			profile = await adapter.fetchProfile( accessToken );
		} catch ( error ) {
			return responseError( 'OAuth exchange failed', 502, 'OAUTH_EXCHANGE_FAILED' );
		}

		if ( !profile.email || !profile.emailVerified ) {
			return responseError( 'Email not verified by provider', 400, 'OAUTH_EMAIL_UNVERIFIED' );
		}

		// Emails are stored lowercase
		const email = email_normalize( profile.email );

		// 1. an existing link for this exact provider identity wins, it's the durable source of truth
		const existingLink = await ctx.app.db.select().from( user_oauth_links ).where( and(
			eq( user_oauth_links.provider, provider ),
			eq( user_oauth_links.provider_user_id, profile.providerUserId ),
		) ).get();

		let user = existingLink
			? await ctx.app.db.select().from( users ).where( eq( users.id, existingLink.id_user ) ).get()
			: undefined;

		if ( !user ) {
			// 2. auto-link onto an existing account matched by verified email within the same domain
			const existingUser = await ctx.app.db.select().from( users ).where( and(
				eq( users.domain, domain ),
				eq( users.email, email ),
			) ).get();

			if ( existingUser ) {
				user = existingUser;
			} else {
				// 3. no match anywhere: provision a new user, already enabled and verified
				const newUserId = mkid( 'user' );

				await ctx.app.db.insert( users ).values( {
					id: newUserId,
					domain,
					username: email,
					email,
					name: profile.name ?? '',
					perms: [],
					enabled: true,
					level: 0,
					password: await hashPassword( mkid( 'pwd' ) ),
					email_verified: true,
					verified_at: Date.now(),
					two_factor_enabled: false,
				} ).run();

				user = await ctx.app.db.select().from( users ).where( eq( users.id, newUserId ) ).get();
			}

			if ( !user ) return responseError( 'User resolution failed', 500 );

			await ctx.app.db.insert( user_oauth_links ).values( {
				id: mkid( 'oaul' ),
				domain,
				id_user: user.id ?? '',
				provider,
				provider_user_id: profile.providerUserId,
				email,
			} ).run();
		}

		if ( user.two_factor_enabled ) {
			const pending_token = await jwtCreate(
				{ purpose: '2fa_pending', id_user: user.id },
				ctx.app.cfg.jwt.secret,
				TWO_FA_PENDING_TOKEN_EXPIRY,
			);

			return responseSuccess( { requires_2fa: true, requires_password_change: false, requires_domain_choice: false, pending_token } );
		}

		const loginResult = await user_create_user_login( ctx, user as any );
		return responseSuccess( loginResult );
	} catch ( error ) {
		const errorMessage = error instanceof Error ? error.message : 'OAuth login failed';
		return responseError( errorMessage, 500 );
	}
	/*=== f2c_end user_oauth_callback ===*/
};
