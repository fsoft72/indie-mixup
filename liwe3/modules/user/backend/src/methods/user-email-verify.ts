import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Validates an email verification token and marks the user's email as verified. Tokens expire after 7 days and can only be used once (used_at is set on success and re-checked on every call). The token is sent in the request body, never as a query parameter, so it does not leak into proxy/CDN access logs or browser history.
 *
 * @property {string} token - The email verification token (required)
 */
const UserEmailVerifySchema = z.object( {
	token: z.string(),
} );

/** Parameters for user_email_verify */
export type UserEmailVerifyParams = z.infer<typeof UserEmailVerifySchema>;

/*=== f2c_start user_email_verify_headers ===*/
import { ERR_ALREADY_EXISTS, ERR_INTERNAL, ERR_INVALID_INPUT, ERR_NOT_FOUND, ERR_TIMEOUT } from '@backend/liwe3';
import { user_verification_tokens, users } from '../schema';
/*=== f2c_end user_email_verify_headers ===*/

/**
 * Validates an email verification token and marks the user's email as verified. Tokens expire after 7 days and can only be used once (used_at is set on success and re-checked on every call). The token is sent in the request body, never as a query parameter, so it does not leak into proxy/CDN access logs or browser history.
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserEmailVerifyParams} params - Request parameters
 * @param {string} params.token - The email verification token
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const user_email_verify = async ( ctx : LiWECtx, params : UserEmailVerifyParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<UserEmailVerifyParams>( UserEmailVerifySchema as any, params );
	if ( !validation.success ) return validation.error;

	const { token } = validation.data;

	/*=== f2c_start user_email_verify ===*/
	try {
		// Find verification token
		const tokenRecord = await ctx.app.db.select()
			.from( user_verification_tokens )
			.where(
				and(
					eq( user_verification_tokens.token, token ),
					eq( user_verification_tokens.type, 'email_verify' ),
				),
			)
			.get();

		if ( !tokenRecord ) return responseError( 'Invalid or expired verification token', 400, ERR_INVALID_INPUT );

		// Check if token has already been used
		if ( tokenRecord.used_at ) return responseError( 'This verification link has already been used', 400, ERR_ALREADY_EXISTS );

		// Check if token has expired (7 days = 604800000 milliseconds)
		const now = Date.now();
		// A token without expiry date counts as expired
		if ( ( tokenRecord.expires_at ?? 0 ) < now ) {
			// Delete expired token
			await ctx.app.db.delete( user_verification_tokens )
				.where( eq( user_verification_tokens.id, tokenRecord.id ) )
				.run();

			return responseError( 'Verification token has expired. Please request a new one.', 400, ERR_TIMEOUT );
		}

		// Get user
		const user = await ctx.app.db.select()
			.from( users )
			.where( eq( users.id, tokenRecord.id_user ) )
			.get();

		if ( !user ) return responseError( 'User not found', 404, ERR_NOT_FOUND );

		// Check if email is already verified
		if ( user.email_verified ) {
			// Mark token as used
			await ctx.app.db.update( user_verification_tokens )
				.set( { used_at: now } )
				.where( eq( user_verification_tokens.id, tokenRecord.id ) )
				.run();

			return responseSuccess( true );
		}

		// Update user to mark email as verified
		await ctx.app.db.update( users )
			.set( {
				email_verified: true,
				verified_at: now,
			} )
			.where( eq( users.id, tokenRecord.id_user ) )
			.run();

		// Mark token as used
		await ctx.app.db.update( user_verification_tokens )
			.set( { used_at: now } )
			.where( eq( user_verification_tokens.id, tokenRecord.id ) )
			.run();

		ctx.app.log.info( 'Email verified successfully', { userId: user.id, username: user.username } );

		return responseSuccess( true );
	} catch ( error : any ) {
		// ctx.app.log.error( 'Error verifying email', { error: error.message } );
		return responseError( 'Failed to verify email', 500, ERR_INTERNAL );
	}
	/*=== f2c_end user_email_verify ===*/
};
