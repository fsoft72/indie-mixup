import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Sends a new email verification link to the user. Expires/deletes any previous email_verify tokens for the user and generates a fresh token valid for 7 days. Unauthenticated endpoint that triggers an outbound email, so it is rate limited per IP (RL_AUTH).
 *
 * @property {string} email - User email address (required)
 */
const UserEmailResendSchema = z.object( {
	email: z.string(),
} );

/** Parameters for user_email_resend */
export type UserEmailResendParams = z.infer<typeof UserEmailResendSchema>;

/*=== f2c_start user_email_resend_headers ===*/
import { user_verification_tokens, users } from '../schema';
import { type AwsCredentials, mkid, sendMail } from '@backend/liwe3';
import { getVerificationEmail } from '@backend/liwe3/src/email-templates';
import { email_normalize } from './utils';
import { ERR_ALREADY_EXISTS, ERR_EXTERNAL_SERVICE, ERR_INTERNAL, ERR_RATE_LIMITED } from '@backend/liwe3';
/*=== f2c_end user_email_resend_headers ===*/

/**
 * Sends a new email verification link to the user. Expires/deletes any previous email_verify tokens for the user and generates a fresh token valid for 7 days. Unauthenticated endpoint that triggers an outbound email, so it is rate limited per IP (RL_AUTH).
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserEmailResendParams} params - Request parameters
 * @param {string} params.email - User email address
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const user_email_resend = async ( ctx : LiWECtx, params : UserEmailResendParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<UserEmailResendParams>( UserEmailResendSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { email } = validation.data;

	/*=== f2c_start user_email_resend ===*/
	try {
		// Find user by email
		const user = await ctx.app.db.select()
			.from( users )
			.where( eq( users.email, email_normalize( email ) ) )
			.get();

		if ( !user ) {
			// Don't reveal if email exists or not (security best practice)
			return responseSuccess( true );
		}

		// Check if already verified
		if ( user.email_verified ) return responseError( 'Email is already verified', 400, ERR_ALREADY_EXISTS );

		// Check if there's a recent verification email sent (rate limiting)
		// Allow resend only if last token was created more than 5 minutes ago
		const fiveMinutesAgo = new Date();
		fiveMinutesAgo.setMinutes( fiveMinutesAgo.getMinutes() - 5 );
		const recentToken = await ctx.app.db.select()
			.from( user_verification_tokens )
			.where(
				and(
					eq( user_verification_tokens.id_user, user.id! ),
					eq( user_verification_tokens.type, 'email_verify' ),
					isNull( user_verification_tokens.used_at ), // Not used
				),
			)
			.orderBy( user_verification_tokens.created )
			.get();

		if ( recentToken && recentToken.created > fiveMinutesAgo ) {
			return responseError( 'Please wait a few minutes before requesting another verification email', 429, ERR_RATE_LIMITED );
		}

		// Delete old unused verification tokens for this user
		await ctx.app.db.delete( user_verification_tokens )
			.where(
				and(
					eq( user_verification_tokens.id_user, user.id! ),
					eq( user_verification_tokens.type, 'email_verify' ),
				),
			)
			.run();

		// Generate new verification token (7 days = 604800000 milliseconds)
		const tokenId = mkid( 'emvr' );
		const now = Date.now();
		const expiresAt = now + ( 7 * 24 * 60 * 60 * 1000 ); // 7 days

		await ctx.app.db.insert( user_verification_tokens ).values( {
			id: tokenId,
			id_user: user.id!,
			token: tokenId,
			type: 'email_verify',
			expires_at: expiresAt,
			used_at: null,
		} as any ).run();

		// Build verification URL
		const verificationUrl = `${ctx.app.cfg.ses.verificationUrl}?token=${tokenId}`;

		// Get email template
		const userName = user.name || user.username;
		const emailTemplate = getVerificationEmail( userName, verificationUrl, ctx.app.cfg.site.name );

		// Send email via AWS SES
		const sesCredentials : AwsCredentials = {
			access_key: ctx.app.cfg.ses.access_key,
			secret_key: ctx.app.cfg.ses.secret_key,
			region: ctx.app.cfg.ses.region,
		};

		const mailResult = await sendMail( sesCredentials, {
			fromEmailAddress: `${ctx.app.cfg.ses.fromName} <${ctx.app.cfg.ses.fromEmail}>`,
			toAddresses: [ email ],
			subject: emailTemplate.subject,
			textBody: emailTemplate.textBody,
			htmlBody: emailTemplate.htmlBody,
		} );

		if ( !mailResult.ok ) {
			return responseError( 'Failed to send verification email. Please try again later.', 500, ERR_EXTERNAL_SERVICE );
		}

		ctx.app.log.info( 'Verification email resent', { userId: user.id, email: user.email } );

		return responseSuccess( true );
	} catch ( error : any ) {
		return responseError( 'Failed to resend verification email', 500, ERR_INTERNAL );
	}
	/*=== f2c_end user_email_resend ===*/
};
