import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * SystemDomain table schema for Drizzle ORM
 */
export const system_domains = sqliteTable( 'system_domains', {
	// The domain unique code
	code: text( 'code', { length: 30 } ).notNull(),

	// The domain name
	name: text( 'name', { length: 50 } ).notNull(),

	// If the domain is visible
	visible: integer( 'visible', { mode: 'boolean' } ).notNull().default( false ),

	// Maximum number of tiers this domain can handle
	total_max_tiers: integer( 'total_max_tiers' ).notNull(),

	// The sum of `total_max_tiers` values of all **direct children** of this domain. Dynamically updated when children are created or deleted
	tiers_allocated: integer( 'tiers_allocated' ).notNull(),
}, ( table : any ) => [
	// Index on code field for unique constraint on code
	uniqueIndex( 'idx_system_domains_code' ).on( table.code ),

	// Index on visible field for efficient visible-based queries
	index( 'idx_system_domains_visible' ).on( table.visible ),
] );

/**
 * Type inference for SystemDomain table select operations
 */
export type SystemDomainDB = typeof system_domains.$inferSelect;

/**
 * SystemTheme table schema for Drizzle ORM
 */
export const system_themes = sqliteTable( 'system_themes', {
	// The domain code
	code: text( 'code', { length: 30 } ).notNull(),

	// The Theme data
	data: text( 'data', { mode: 'json' } ).notNull().$type<any>(),
}, ( table : any ) => [
	// Index on code field for unique constraint on code
	uniqueIndex( 'idx_system_themes_code' ).on( table.code ),
] );

/**
 * Type inference for SystemTheme table select operations
 */
export type SystemThemeDB = typeof system_themes.$inferSelect;

/**
 * SystemConfigOverride table schema for Drizzle ORM
 */
export const system_config_overrides = sqliteTable( 'system_config_overrides', {
	// Dotted path of the overridden config key (e.g. jwt.expiresIn)
	key: text( 'key', { length: 100 } ).notNull(),

	// The overriding value, stored as JSON so its type is preserved
	value: text( 'value', { mode: 'json' } ).notNull().$type<any>(),
}, ( table : any ) => [
	// Index on key field for unique constraint on key
	uniqueIndex( 'idx_system_config_overrides_key' ).on( table.key ),
] );

/**
 * Type inference for SystemConfigOverride table select operations
 */
export type SystemConfigOverrideDB = typeof system_config_overrides.$inferSelect;
