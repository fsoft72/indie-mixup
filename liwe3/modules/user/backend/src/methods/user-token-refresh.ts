import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { TokenRefreshResponse } from '../types';

/**
 * Schema for Refresh access token using refresh token
 *
 * @property {string} refresh_token - The refresh token (required)
 */
const UserTokenRefreshSchema = z.object( {
	refresh_token: z.string(),
} );

/** Parameters for user_token_refresh */
export type UserTokenRefreshParams = z.infer<typeof UserTokenRefreshSchema>;

/*=== f2c_start user_token_refresh_headers ===*/
import { user_refresh_tokens, users } from '../schema';
import { jwtCreate, logger, sessionCreate, sha256 } from '@backend/liwe3';
import { ERR_INTERNAL, ERR_NOT_FOUND } from '@backend/liwe3';
import { bump_token_version, refresh_token_issue } from './utils';
/*=== f2c_end user_token_refresh_headers ===*/

/**
 * Refresh access token using refresh token
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserTokenRefreshParams} params - Request parameters
 * @param {string} params.refresh_token - The refresh token
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<TokenRefreshResponse>>} Result object with success status and data or error details
 */
export const user_token_refresh = async ( ctx : LiWECtx, params : UserTokenRefreshParams, sys? : LiWESysParams ) : Promise<LiWEResponse<TokenRefreshResponse>> => {
	const validation = paramsValidation<UserTokenRefreshParams>( UserTokenRefreshSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { refresh_token } = validation.data;

	/*=== f2c_start user_token_refresh ===*/
	try {
		// tokens are stored as their sha256 hex digest, never in cleartext
		const hash = await sha256( refresh_token );

		const rec = await ctx.app.db.select()
			.from( user_refresh_tokens )
			.where( eq( user_refresh_tokens.token_hash, hash ) )
			.get();

		if ( !rec ) return responseError( 'Invalid refresh token', 401, ERR_UNAUTHORIZED );

		// REUSE DETECTION: a token already consumed means the family is compromised.
		// Drop the whole rotation chain and bump the user's token version so every
		// JWT already issued stops validating.
		if ( rec.used_at ) {
			await ctx.app.db.delete( user_refresh_tokens ).where( eq( user_refresh_tokens.family_id, rec.family_id ) ).run();
			await bump_token_version( ctx, rec.id_user );
			logger.warn( 'Refresh token reuse detected', { module: 'user', method: 'user_token_refresh', id_user: rec.id_user, family: rec.family_id } );
			return responseError( 'Invalid refresh token', 401, ERR_UNAUTHORIZED );
		}

		const now = Date.now();
		if ( rec.expires_at < now ) {
			await ctx.app.db.delete( user_refresh_tokens ).where( eq( user_refresh_tokens.id, rec.id ) ).run();
			return responseError( 'Refresh token expired', 401, ERR_UNAUTHORIZED );
		}

		const user = await ctx.app.db.select()
			.from( users )
			.where( eq( users.id, rec.id_user ) )
			.get();

		if ( !user ) return responseError( 'User not found', 404, ERR_NOT_FOUND );

		// Get token expiration from config
		const jwtExpiration = ctx.app.cfg.jwt.expiresIn || 1800; // 30 min default
		const refreshExpiration = ctx.app.cfg.jwt.refreshTokenDuration || 21600; // 6 hours default

		// Create new session with user's current token version
		const sessionId = await sessionCreate( ctx.app.kv, ctx.app.name, user.id ?? '', {
			expiresIn: jwtExpiration,
			metadata: {
				id: user.id,
				username: user.username,
				email: user.email,
				perms: user.perms || [],
				domain: user.domain,
				refreshTime: new Date().toISOString(),
			},
		}, user.token_version ?? 0 );

		// Generate new JWT with token version
		const newToken = await jwtCreate(
			{
				session: sessionId,
				tokenVersion: user.token_version ?? 0,
			},
			ctx.app.cfg.jwt.secret,
			jwtExpiration,
		);

		// consume the presented token (keep the row so a replay is detectable) and
		// issue its successor in the same rotation family
		await ctx.app.db.update( user_refresh_tokens ).set( { used_at: now } ).where( eq( user_refresh_tokens.id, rec.id ) ).run();
		const newRefreshToken = await refresh_token_issue( ctx, user.id ?? '', refreshExpiration, rec.family_id );

		return responseSuccess( {
			token: newToken,
			refresh_token: newRefreshToken,
			expiresIn: jwtExpiration,
		} );
	} catch ( error ) {
		console.error( '=== ERROR: Token refresh failed:', error );
		const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
		return responseError( errorMessage, 500, ERR_INTERNAL );
	}
	/*=== f2c_end user_token_refresh ===*/
};
