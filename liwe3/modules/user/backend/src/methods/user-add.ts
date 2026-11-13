import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { User } from '../types';

/**
 * Schema for Add or updates a user to the system.
If the `id` is specified, the user is updated.
If the `id` field is missing, the user is created as new.

A few checks are made:

For new users:

- if `username` + `domain` are already in the system, then the new user is rejected
- if `email` + `domain` are already in the system, then the new user is rejected

For existing users:

- if `username` + `domain` are already in the system and the `id` is different from current user, then the new user is rejected
- if `email` + `domain` are already in the system and the `id` is different from current user, then the new user is rejected


 *
 * @property {[string]} username - The user name
 * @property {[string]} id - The user unique id
 * @property {[string]} email - The user email
 * @property {[string]} name - User name
 * @property {[string]} lastname - User lastname
 * @property {[string[]]} perms - User perms
 * @property {[boolean]} enabled - If the user is enabled
 * @property {[string]} password - User password
 * @property {[boolean]} email_verified - Flag T/F to set email already verified
 */
const UserAddSchema = z.object( {
	username: z.string().optional(),
	id: z.string().optional(),
	email: z.string().optional(),
	name: z.string().optional(),
	lastname: z.string().optional(),
	perms: z.string().array().optional(),
	enabled: zodBoolean.optional(),
	password: z.string().optional(),
	email_verified: zodBoolean.optional(),
} );

/** Parameters for user_add */
export type UserAddParams = z.infer<typeof UserAddSchema>;

/*=== f2c_start user_add_headers ===*/
import { email_normalize } from './utils';
import { user_verification_tokens, users } from '../schema';
import { type AwsCredentials, liwe_event_emit, mkid, sendMail } from '@backend/liwe3';
import { hashPassword } from '@backend/liwe3/src/crypto';
import { getVerificationEmail } from '@backend/liwe3/src/email-templates';
import { USER_PERM_CREATE } from '../perms';
import { USER_EVENT_CREATE } from '../events';
/*=== f2c_end user_add_headers ===*/

/**
 * Add or updates a user to the system.
 * If the `id` is specified, the user is updated.
 * If the `id` field is missing, the user is created as new.
 *
 * A few checks are made:
 *
 * For new users:
 *
 * - if `username` + `domain` are already in the system, then the new user is rejected
 * - if `email` + `domain` are already in the system, then the new user is rejected
 *
 * For existing users:
 *
 * - if `username` + `domain` are already in the system and the `id` is different from current user, then the new user is rejected
 * - if `email` + `domain` are already in the system and the `id` is different from current user, then the new user is rejected
 *
 * @permissions user.create
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {UserAddParams} params - Request parameters
 * @param {string} ?params.username - The user name
 * @param {string} ?params.id - The user unique id
 * @param {string} ?params.email - The user email
 * @param {string} ?params.name - User name
 * @param {string} ?params.lastname - User lastname
 * @param {string[]} ?params.perms - User perms
 * @param {boolean} ?params.enabled - If the user is enabled
 * @param {string} ?params.password - User password
 * @param {boolean} ?params.email_verified - Flag T/F to set email already verified
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<User>>} Result object with success status and data or error details
 */
export const user_add = async ( ctx : LiWECtx, params : UserAddParams, sys? : LiWESysParams ) : Promise<LiWEResponse<User>> => {
	const validation = paramsValidation<UserAddParams>( UserAddSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { username, id, email, name, lastname, perms, enabled, password, email_verified } = validation.data;

	/*=== f2c_start user_add ===*/
	let userDomain : string = '';
	if ( sys?.skip_permissions_check == true ) {
		userDomain = sys?.domain || '__no_domain';
	} else {
		userDomain = ( await ctx.user() )?.domain || '__no_domain';
	}

	// if ( !await has_perms( ctx, [ USER_PERM_CREATE ] ) ) email_verified = false; // if no perms to create users, email verification is needed

	const userData : User = {
		id: id ?? '',
		username: username ?? '',
		email: email_normalize( email ),
		name: name ?? '',
		lastname: lastname ?? '',
		perms: ( perms as any ) ?? '',
		enabled: enabled === undefined ? true : enabled,
		password: '',
		domain: userDomain,
		level: 0,
		email_verified: email_verified === undefined ? false : email_verified,
		verified_at: 0,
		two_factor_enabled: false,
		password_expired: false,
	};

	// if there is a forced domain in SysParams, use it
	if ( sys?.domain ) userData.domain = sys.domain;

	// Generate ID if not provided
	if ( !userData.id ) {
		userData.id = mkid( 'user' );
		// Update the original params object for testing
		params.id = userData.id;
	}

	// check if duplicate username + domain or email + domain exists
	const duplicateCheck = await ctx.app.db.select( { id: users.id } ).from( users ).where( and(
		or(
			and(
				like( users.username, userData.username ),
				eq( users.domain, userData.domain! ),
			),
			and(
				eq( users.email, userData.email! ),
				eq( users.domain, userData.domain! ),
			),
		),
	) ).get();

	if ( duplicateCheck ) {
		return responseError( 'Username or email already exists in the system for the specified domain', 400 );
	}

	// Hash the password before storing it
	userData.password = await hashPassword( password ?? 'n0p4ssw0rd' );
	userData.password_changed_at = Date.now();

	// Insert user into database
	await ctx.app.db.insert( users ).values( userData ).run();
	const user = await ctx.app.db.select().from( users ).where( eq( users.id, userData.id ) ).get();

	if ( !user ) return responseError( 'User creation failed', 500 );

	await liwe_event_emit( ctx, USER_EVENT_CREATE, { id_user: user.id, domain: user.domain } );

	// Generate and send email verification token
	if ( user.email && !user.email_verified ) {
		try {
			// Generate verification token (7 days = 604800000 milliseconds)
			const tokenId = mkid( 'emvr' );
			const now = Date.now();
			const expiresAt = now + ( 7 * 24 * 60 * 60 * 1000 ); // 7 days

			await ctx.app.db.insert( user_verification_tokens ).values( {
				id: tokenId,
				domain: user.domain,
				id_user: user.id,
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
				toAddresses: [ user.email ],
				subject: emailTemplate.subject,
				textBody: emailTemplate.textBody,
				htmlBody: emailTemplate.htmlBody,
			} );

			if ( !mailResult.ok ) {
				ctx.app.log.warn( 'Failed to send verification email after user creation', {
					userId: user.id,
					email: user.email,
					error: mailResult.error,
				} );
				// Don't fail user creation if email fails
			} else {
				ctx.app.log.info( 'Verification email sent', { userId: user.id, email: user.email } );
			}
		} catch ( emailError : any ) {
			/*
			ctx.app.log.error( 'Error sending verification email', {
				userId: user.id!,
				error: emailError.message,
			} );
			// Don't fail user creation if email fails
			*/
		}
	}

	// Return user data without sensitive fields
	user.domain = null;
	user.password = null;

	return responseSuccess( user as any );
	/*=== f2c_end user_add ===*/
};
