import { z } from 'zod';
import { zodBoolean } from '@backend/liwe3';

/*=== f2c_start __types ===*/

// Add custom imports or types here
/*=== f2c_end __types ===*/

/**
 * Schema for User
 *
 * @property {[str]} id - The user unique id (max 64 chars)
 * @property {[str]} domain - Domain associated with the user account (max 64 chars)
 * @property {[str]} email - Email address of the user (max 250 chars)
 * @property {str} username - Username for the user account (required) (required, max 64 chars)
 * @property {[str]} name - User's first name (max 50 chars)
 * @property {[str]} lastname - User's last name (max 50 chars)
 * @property {[str[]]} perms - List of permissions
 * @property {[bool]} enabled - If user is enabled
 * @property {[num]} level - User level
 * @property {[str]} password - User encrypted password (max 64 chars)
 * @property {[num]} token_version - token_version field
 * @property {[bool]} email_verified - Email verification status
 * @property {[num]} verified_at - Timestamp when email was verified
 * @property {[str]} id_role - Role assigned to the user, defines a default set of permissions (max 64 chars)
 * @property {[bool]} two_factor_enabled - Flag T/F is 2FA is enabled
 * @property {[str]} two_factor_secret - The 2FA secret
 * @property {[str[]]} two_factor_recovery_codes - 2FA Recovery codes
 * @property {[bool]} password_expired - Flag T/F: the password is expired and must be changed at the next login
 * @property {[num]} password_changed_at - Timestamp (unix ms) of the last password change. Null means unknown: the password never expires automatically
 * @property {[num]} password_max_age_days - Days after which this user must change the password. Null: use the global cfg.user.passwordMaxAgeDays. 0: never expires
 */
const ZUser = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ).optional(),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ).optional(),
	email: z.string().max( 250, 'Email must be at most 250 characters' ).optional(),
	username: z.string().max( 64, 'Username must be at most 64 characters' ),
	name: z.string().max( 50, 'Name must be at most 50 characters' ).optional(),
	lastname: z.string().max( 50, 'Lastname must be at most 50 characters' ).optional(),
	perms: z.string().array().optional(),
	enabled: zodBoolean.optional().default( false ),
	level: z.coerce.number().optional(),
	password: z.string().max( 64, 'Password must be at most 64 characters' ).optional(),
	token_version: z.coerce.number().optional(),
	email_verified: zodBoolean.optional().default( false ),
	verified_at: z.coerce.number().optional(),
	id_role: z.string().max( 64, 'Id_role must be at most 64 characters' ).optional(),
	two_factor_enabled: zodBoolean.optional().default( false ),
	two_factor_secret: z.string().optional(),
	two_factor_recovery_codes: z.string().array().optional(),
	password_expired: zodBoolean.optional().default( false ),
	password_changed_at: z.coerce.number().optional(),
	password_max_age_days: z.coerce.number().optional(),
} );

export type User = z.infer<typeof ZUser>;
export { ZUser };

/**
 * Schema for UserInvite
 *
 * @property {str} id - Invite id (required, max 64 chars)
 * @property {str} id_user - User id (required, max 64 chars)
 * @property {str} domain - Domain (required, max 32 chars)
 * @property {num} count - Number of invites accepted (required)
 * @property {str} code - User Invitation code (required, max 64 chars)
 */
const ZUserInvite = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	domain: z.string().max( 32, 'Domain must be at most 32 characters' ),
	count: z.coerce.number(),
	code: z.string().max( 64, 'Code must be at most 64 characters' ),
} );

export type UserInvite = z.infer<typeof ZUserInvite>;
export { ZUserInvite };

/**
 * Schema for UserLogin
 *
 * @property {[str]} id - User id
 * @property {[str]} username - The user's username
 * @property {[str]} email - User's email
 * @property {[str[]]} perms - User's permissions
 * @property {[str]} token - Authentication token
 * @property {[str]} domain - User domain
 * @property {[str]} refresh_token - User refresh token
 * @property {[bool]} requires_2fa - Flag T/F if 2FA is needed
 * @property {[str]} pending_token - pending_token field
 * @property {[bool]} requires_password_change - Flag T/F if the user must change the password before getting a session (pending_token is the change token)
 * @property {[str]} password_change_reason - Why the password change is required: 'flag' (forced by an admin) or 'age' (older than the configured max age)
 * @property {[bool]} requires_domain_choice - Flag T/F if the credentials are valid in more than one domain and the user must choose one (see domains)
 * @property {[str[]]} domains - The domains where the credentials are valid, when requires_domain_choice is true
 */
const ZUserLogin = z.object( {
	id: z.string().optional(),
	username: z.string().optional(),
	email: z.string().optional(),
	perms: z.string().array().optional(),
	token: z.string().optional(),
	domain: z.string().optional(),
	refresh_token: z.string().optional(),
	requires_2fa: zodBoolean.optional().default( false ),
	pending_token: z.string().optional(),
	requires_password_change: zodBoolean.optional().default( false ),
	password_change_reason: z.string().optional(),
	requires_domain_choice: zodBoolean.optional().default( false ),
	domains: z.string().array().optional(),
} );

export type UserLogin = z.infer<typeof ZUserLogin>;
export { ZUserLogin };

/**
 * Schema for UserLogout
 *
 * @property {bool} success - If log out was successful (required)
 * @property {str} message - The logout message (required)
 */
const ZUserLogout = z.object( {
	success: zodBoolean.default( false ),
	message: z.string(),
} );

export type UserLogout = z.infer<typeof ZUserLogout>;
export { ZUserLogout };

/**
 * Schema for UserMe
 *
 * @property {str} id_user - The user id (required)
 * @property {datetime} created - Session creation date (required)
 * @property {datetime} updated - Session updated date (required)
 * @property {[none]} metadata - Session metadata
 */
const ZUserMe = z.object( {
	id_user: z.string(),
	created: z.coerce.date(),
	updated: z.coerce.date(),
	metadata: z.any().optional(),
} );

export type UserMe = z.infer<typeof ZUserMe>;
export { ZUserMe };

/**
 * Schema for UserRefresh
 *
 * @property {str} id - Refresh token record id (required, max 64 chars)
 * @property {str} id_user - Owning user id (required)
 * @property {str} token_hash - sha256 hex digest of the refresh token (required)
 * @property {str} family_id - Rotation family: the chain of successors born from a single login (required)
 * @property {num} expires_at - Expiry, unix milliseconds (required)
 * @property {[num]} used_at - Consumption timestamp, unix ms; non-null means already used
 * @property {num} created - Creation timestamp, unix milliseconds (required)
 */
const ZUserRefresh = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	id_user: z.string(),
	token_hash: z.string(),
	family_id: z.string(),
	expires_at: z.coerce.number(),
	used_at: z.coerce.number().optional(),
	created: z.coerce.number(),
} );

export type UserRefresh = z.infer<typeof ZUserRefresh>;
export { ZUserRefresh };

/**
 * Schema for TokenRefreshResponse
 *
 * @property {str} token - token field (required)
 * @property {str} refresh_token - refresh_token field (required)
 * @property {num} expiresIn - expiresIn field (required)
 */
const ZTokenRefreshResponse = z.object( {
	token: z.string(),
	refresh_token: z.string(),
	expiresIn: z.coerce.number(),
} );

export type TokenRefreshResponse = z.infer<typeof ZTokenRefreshResponse>;
export { ZTokenRefreshResponse };

/**
 * Schema for UserVerificationToken
 *
 * @property {str} id - UserVerificationToken main ID (required, max 64 chars)
 * @property {str} domain - UserVerificationToken domain (required, max 64 chars)
 * @property {str} id_user - id_user field (required, max 64 chars)
 * @property {[str]} type - email_verify or password_reset (max 20 chars)
 * @property {[num]} expires_at - expires_at field
 * @property {datetime} created - UserVerificationToken created date (required)
 * @property {[num]} used_at - used_at field
 * @property {str} token - token field (required)
 */
const ZUserVerificationToken = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	type: z.string().max( 20, 'Type must be at most 20 characters' ).optional(),
	expires_at: z.coerce.number().optional(),
	created: z.coerce.date(),
	used_at: z.coerce.number().optional(),
	token: z.string(),
} );

export type UserVerificationToken = z.infer<typeof ZUserVerificationToken>;
export { ZUserVerificationToken };

/**
 * Schema for UserRole
 *
 * @property {str} id - UserRole main ID (required, max 64 chars)
 * @property {str} domain - UserRole domain (required, max 64 chars)
 * @property {str} name - Role name, unique per domain (required, max 64 chars) (required, max 64 chars)
 * @property {[str]} description - Role description (max 250 chars)
 * @property {str[]} perms - Permissions granted by this role (required)
 */
const ZUserRole = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	name: z.string().max( 64, 'Name must be at most 64 characters' ),
	description: z.string().max( 250, 'Description must be at most 250 characters' ).optional(),
	perms: z.string().array(),
} );

export type UserRole = z.infer<typeof ZUserRole>;
export { ZUserRole };

/**
 * Schema for User2FASetup
 *
 * @property {str} secret - secret field (required)
 * @property {str} otpauth_url - otpauth_url field (required)
 */
const ZUser2FASetup = z.object( {
	secret: z.string(),
	otpauth_url: z.string(),
} );

export type User2FASetup = z.infer<typeof ZUser2FASetup>;
export { ZUser2FASetup };

/**
 * Schema for UserOAUTHProvider
 *
 * @property {str} id - UserOAUTHProvider main ID (required, max 64 chars)
 * @property {str} domain - UserOAUTHProvider domain (required, max 64 chars)
 * @property {str} provider - Provider name (required, max 32 chars)
 * @property {str} client_id - Provider Client ID (required)
 * @property {str} client_secret - Provider Client Secret (required)
 * @property {[bool]} enabled - Flag T/F
 */
const ZUserOAUTHProvider = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	provider: z.string().max( 32, 'Provider must be at most 32 characters' ),
	client_id: z.string(),
	client_secret: z.string(),
	enabled: zodBoolean.optional().default( false ),
} );

export type UserOAUTHProvider = z.infer<typeof ZUserOAUTHProvider>;
export { ZUserOAUTHProvider };

/**
 * Schema for UserOAUTHLink
 *
 * @property {str} id - UserOAUTHLink main ID (required, max 64 chars)
 * @property {str} domain - UserOAUTHLink domain (required, max 64 chars)
 * @property {str} id_user - id_user field (required, max 64 chars)
 * @property {str} provider - provider field (required, max 32 chars)
 * @property {str} provider_user_id - provider_user_id field (required, max 64 chars)
 * @property {[str]} email - email field (max 128 chars)
 * @property {datetime} created - UserOAUTHLink created date (required)
 */
const ZUserOAUTHLink = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	provider: z.string().max( 32, 'Provider must be at most 32 characters' ),
	provider_user_id: z.string().max( 64, 'Provider_user_id must be at most 64 characters' ),
	email: z.string().max( 128, 'Email must be at most 128 characters' ).optional(),
	created: z.coerce.date(),
} );

export type UserOAUTHLink = z.infer<typeof ZUserOAUTHLink>;
export { ZUserOAUTHLink };

/**
 * Schema for UserRegisterConfig
 *
 * @property {bool} enabled - True when the registration is open (required)
 * @property {bool} create_domain - True when a registration creates a new domain (required)
 * @property {bool} auth_code_required - True when the registration asks for an auth code (required)
 */
const ZUserRegisterConfig = z.object( {
	enabled: zodBoolean.default( false ),
	create_domain: zodBoolean.default( false ),
	auth_code_required: zodBoolean.default( false ),
} );

export type UserRegisterConfig = z.infer<typeof ZUserRegisterConfig>;
export { ZUserRegisterConfig };
