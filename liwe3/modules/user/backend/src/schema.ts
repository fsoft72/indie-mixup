import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * User table schema for Drizzle ORM
 */
export const users = sqliteTable( 'users', {
	// The user unique id
	id: text( 'id', { length: 64 } ),

	// Domain associated with the user account
	domain: text( 'domain', { length: 64 } ),

	// Email address of the user
	email: text( 'email', { length: 250 } ),

	// Username for the user account (required)
	username: text( 'username', { length: 64 } ).notNull(),

	// User's first name
	name: text( 'name', { length: 50 } ),

	// User's last name
	lastname: text( 'lastname', { length: 50 } ),

	// List of permissions
	perms: text( 'perms', { mode: 'json' } ).$type<string[]>(),

	// If user is enabled
	enabled: integer( 'enabled', { mode: 'boolean' } ).default( false ),

	// User level
	level: integer( 'level' ),

	// User encrypted password
	password: text( 'password', { length: 64 } ),

	// token_version field
	token_version: integer( 'token_version' ),

	// Email verification status
	email_verified: integer( 'email_verified', { mode: 'boolean' } ).default( false ),

	// Timestamp when email was verified
	verified_at: integer( 'verified_at' ),

	// Role assigned to the user, defines a default set of permissions
	id_role: text( 'id_role', { length: 64 } ),

	// Flag T/F is 2FA is enabled
	two_factor_enabled: integer( 'two_factor_enabled', { mode: 'boolean' } ).default( false ),

	// The 2FA secret
	two_factor_secret: text( 'two_factor_secret' ),

	// 2FA Recovery codes
	two_factor_recovery_codes: text( 'two_factor_recovery_codes', { mode: 'json' } ).$type<string[]>(),

	// Flag T/F: the password is expired and must be changed at the next login
	password_expired: integer( 'password_expired', { mode: 'boolean' } ).default( false ),

	// Timestamp (unix ms) of the last password change. Null means unknown: the password never expires automatically
	password_changed_at: integer( 'password_changed_at' ),

	// Days after which this user must change the password. Null: use the global cfg.user.passwordMaxAgeDays. 0: never expires
	password_max_age_days: integer( 'password_max_age_days' ),
}, ( table : any ) => [
	// Index on id field for primary key lookup
	index( 'idx_users_id' ).on( table.id ),

	// Index on domain field for efficient domain-based queries
	index( 'idx_users_domain' ).on( table.domain ),

	// Index on email field for user lookup by email
	index( 'idx_users_email' ).on( table.email ),

	// Index on username field for user lookup by username
	index( 'idx_users_username' ).on( table.username ),

	// Index on enabled field for filtering active/inactive records
	index( 'idx_users_enabled' ).on( table.enabled ),

	// Index on level field for efficient level-based queries
	index( 'idx_users_level' ).on( table.level ),

	// Index on email_verified field for efficient email_verified-based queries
	index( 'idx_users_email_verified' ).on( table.email_verified ),

	// Index on id_role field for efficient id_role-based queries
	index( 'idx_users_id_role' ).on( table.id_role ),
] );

/**
 * Type inference for User table select operations
 */
export type UserDB = typeof users.$inferSelect;

/**
 * UserInvite table schema for Drizzle ORM
 */
export const user_invites = sqliteTable( 'user_invites', {
	// Invite id
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// User id
	id_user: text( 'id_user', { length: 64 } ).notNull(),

	// Domain
	domain: text( 'domain', { length: 32 } ).notNull(),

	// Number of invites accepted
	count: integer( 'count' ).notNull(),

	// User Invitation code
	code: text( 'code', { length: 64 } ).notNull(),
}, ( table : any ) => [
	// Index on id_user field for efficient id_user-based queries
	index( 'idx_user_invites_id_user' ).on( table.id_user ),

	// Index on domain field for efficient domain-based queries
	index( 'idx_user_invites_domain' ).on( table.domain ),
] );

/**
 * Type inference for UserInvite table select operations
 */
export type UserInviteDB = typeof user_invites.$inferSelect;

/**
 * UserRefresh table schema for Drizzle ORM
 */
export const user_refresh_tokens = sqliteTable( 'user_refresh_tokens', {
	// Refresh token record id
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// Owning user id
	id_user: text( 'id_user' ).notNull(),

	// sha256 hex digest of the refresh token
	token_hash: text( 'token_hash' ).notNull(),

	// Rotation family: the chain of successors born from a single login
	family_id: text( 'family_id' ).notNull(),

	// Expiry, unix milliseconds
	expires_at: integer( 'expires_at' ).notNull(),

	// Consumption timestamp, unix ms; non-null means already used
	used_at: integer( 'used_at' ),

	// Creation timestamp, unix milliseconds
	created: integer( 'created' ).notNull().default( sql`(CURRENT_TIMESTAMP)` ),
}, ( table : any ) => [
	// Index on id_user field for efficient id_user-based queries
	index( 'idx_user_refresh_tokens_id_user' ).on( table.id_user ),

	// Index on token_hash field for unique constraint on token_hash
	uniqueIndex( 'idx_user_refresh_tokens_token_hash' ).on( table.token_hash ),

	// Index on family_id field for efficient family_id-based queries
	index( 'idx_user_refresh_tokens_family_id' ).on( table.family_id ),
] );

/**
 * Type inference for UserRefresh table select operations
 */
export type UserRefreshDB = typeof user_refresh_tokens.$inferSelect;

/**
 * UserVerificationToken table schema for Drizzle ORM
 */
export const user_verification_tokens = sqliteTable( 'user_verification_tokens', {
	// UserVerificationToken main ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// UserVerificationToken domain
	domain: text( 'domain', { length: 64 } ).notNull(),

	// id_user field
	id_user: text( 'id_user', { length: 64 } ).notNull(),

	// email_verify or password_reset
	type: text( 'type', { length: 20 } ),

	// expires_at field
	expires_at: integer( 'expires_at' ),

	// UserVerificationToken created date
	created: integer( 'created' ).notNull().$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),

	// used_at field
	used_at: integer( 'used_at' ),

	// token field
	token: text( 'token' ).notNull(),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_user_verification_tokens_domain' ).on( table.domain ),

	// Index on id_user field for efficient id_user-based queries
	index( 'idx_user_verification_tokens_id_user' ).on( table.id_user ),

	// Index on created field for sorting by creation date
	index( 'idx_user_verification_tokens_created' ).on( table.created ),
] );

/**
 * Type inference for UserVerificationToken table select operations
 */
export type UserVerificationTokenDB = typeof user_verification_tokens.$inferSelect;

/**
 * UserRole table schema for Drizzle ORM
 */
export const user_roles = sqliteTable( 'user_roles', {
	// UserRole main ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// UserRole domain
	domain: text( 'domain', { length: 64 } ).notNull(),

	// Role name, unique per domain (required, max 64 chars)
	name: text( 'name', { length: 64 } ).notNull(),

	// Role description
	description: text( 'description', { length: 250 } ),

	// Permissions granted by this role
	perms: text( 'perms', { mode: 'json' } ).notNull().$type<string[]>(),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_user_roles_domain' ).on( table.domain ),
] );

/**
 * Type inference for UserRole table select operations
 */
export type UserRoleDB = typeof user_roles.$inferSelect;

/**
 * UserOAUTHProvider table schema for Drizzle ORM
 */
export const user_oauth_providers = sqliteTable( 'user_oauth_providers', {
	// UserOAUTHProvider main ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// UserOAUTHProvider domain
	domain: text( 'domain', { length: 64 } ).notNull(),

	// Provider name
	provider: text( 'provider', { length: 32 } ).notNull(),

	// Provider Client ID
	client_id: text( 'client_id' ).notNull(),

	// Provider Client Secret
	client_secret: text( 'client_secret' ).notNull(),

	// Flag T/F
	enabled: integer( 'enabled', { mode: 'boolean' } ).default( false ),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_user_oauth_providers_domain' ).on( table.domain ),

	// Index on enabled field for filtering active/inactive records
	index( 'idx_user_oauth_providers_enabled' ).on( table.enabled ),
] );

/**
 * Type inference for UserOAUTHProvider table select operations
 */
export type UserOAUTHProviderDB = typeof user_oauth_providers.$inferSelect;

/**
 * UserOAUTHLink table schema for Drizzle ORM
 */
export const user_oauth_links = sqliteTable( 'user_oauth_links', {
	// UserOAUTHLink main ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// UserOAUTHLink domain
	domain: text( 'domain', { length: 64 } ).notNull(),

	// id_user field
	id_user: text( 'id_user', { length: 64 } ).notNull(),

	// provider field
	provider: text( 'provider', { length: 32 } ).notNull(),

	// provider_user_id field
	provider_user_id: text( 'provider_user_id', { length: 64 } ).notNull(),

	// email field
	email: text( 'email', { length: 128 } ),

	// UserOAUTHLink created date
	created: integer( 'created' ).notNull().$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_user_oauth_links_domain' ).on( table.domain ),

	// Index on created field for sorting by creation date
	index( 'idx_user_oauth_links_created' ).on( table.created ),
] );

/**
 * Type inference for UserOAUTHLink table select operations
 */
export type UserOAUTHLinkDB = typeof user_oauth_links.$inferSelect;
