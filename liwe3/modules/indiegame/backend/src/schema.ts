import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * IndieGame table schema for Drizzle ORM
 */
export const indiegame_games = sqliteTable( 'indiegame_games', {
	// Unique identifier
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// Domain
	domain: text( 'domain', { length: 64 } ).notNull(),

	// Author (user id)
	id_user: text( 'id_user', { length: 64 } ).notNull(),

	// Game name
	name: text( 'name', { length: 255 } ).notNull(),

	// Game description
	description: text( 'description' ).notNull(),

	// Canonical public GitHub repo url
	repo_url: text( 'repo_url', { length: 255 } ).notNull(),

	// Numeric GitHub repo id (unique)
	repo_id: text( 'repo_id', { length: 32 } ).notNull(),

	// Screenshot urls (array of strings)
	screenshots: text( 'screenshots', { mode: 'json' } ).$type<any>(),

	// Gallery image urls (array of strings)
	gallery: text( 'gallery', { mode: 'json' } ).$type<any>(),

	// Gameplay video urls (array of strings)
	video_urls: text( 'video_urls', { mode: 'json' } ).$type<any>(),

	// Game this one is a remix of (empty for originals)
	id_remix_of: text( 'id_remix_of', { length: 64 } ),

	// True once the remix link was accepted or confirmed after a report
	remix_locked: integer( 'remix_locked', { mode: 'boolean' } ).default( false ),

	// visible, hidden or deleted
	status: text( 'status', { length: 16 } ).notNull(),

	// Creation date
	created: integer( 'created' ).notNull().$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),

	// Last update date
	updated: integer( 'updated' ).$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_indiegame_games_domain' ).on( table.domain ),

	// Index on id_user field for efficient id_user-based queries
	index( 'idx_indiegame_games_id_user' ).on( table.id_user ),

	// Index on repo_id field for unique constraint on repo_id
	uniqueIndex( 'idx_indiegame_games_repo_id' ).on( table.repo_id ),

	// Index on id_remix_of field for efficient id_remix_of-based queries
	index( 'idx_indiegame_games_id_remix_of' ).on( table.id_remix_of ),

	// Index on status field for efficient status-based queries
	index( 'idx_indiegame_games_status' ).on( table.status ),
] );

/**
 * Type inference for IndieGame table select operations
 */
export type IndieGameDB = typeof indiegame_games.$inferSelect;

/**
 * IndieGameEvent table schema for Drizzle ORM
 */
export const indiegame_events = sqliteTable( 'indiegame_events', {
	// Unique identifier
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// Domain
	domain: text( 'domain', { length: 64 } ).notNull(),

	// Game id
	id_game: text( 'id_game', { length: 64 } ).notNull(),

	// view or download
	kind: text( 'kind', { length: 16 } ).notNull(),

	// UTC day, format YYYY-MM-DD
	day: text( 'day', { length: 10 } ).notNull(),

	// Hash of the anonymous visitor
	visitor: text( 'visitor', { length: 64 } ).notNull(),

	// Creation date
	created: integer( 'created' ).notNull().$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),

	// Last update date
	updated: integer( 'updated' ).$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_indiegame_events_domain' ).on( table.domain ),

	// Index on id_game field for efficient id_game-based queries
	index( 'idx_indiegame_events_id_game' ).on( table.id_game ),

	// Index on kind field for efficient kind-based queries
	index( 'idx_indiegame_events_kind' ).on( table.kind ),

	// Index on day field for efficient day-based queries
	index( 'idx_indiegame_events_day' ).on( table.day ),
] );

/**
 * Type inference for IndieGameEvent table select operations
 */
export type IndieGameEventDB = typeof indiegame_events.$inferSelect;

/**
 * IndieRemixReport table schema for Drizzle ORM
 */
export const indiegame_remix_reports = sqliteTable( 'indiegame_remix_reports', {
	// Unique identifier
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// Domain
	domain: text( 'domain', { length: 64 } ).notNull(),

	// Reported game (the suspected remix)
	id_game: text( 'id_game', { length: 64 } ).notNull(),

	// Original game of the reporter
	id_original: text( 'id_original', { length: 64 } ).notNull(),

	// User who reports (author of the original)
	id_reporter: text( 'id_reporter', { length: 64 } ).notNull(),

	// Author of the reported game
	id_owner: text( 'id_owner', { length: 64 } ).notNull(),

	// pending, accepted, contested, confirmed or rejected
	status: text( 'status', { length: 16 } ).notNull(),

	// Moderator who decided a contested report
	decided_by: text( 'decided_by', { length: 64 } ),

	// Creation date
	created: integer( 'created' ).notNull().$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),

	// Last update date
	updated: integer( 'updated' ).$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_indiegame_remix_reports_domain' ).on( table.domain ),

	// Index on id_game field for efficient id_game-based queries
	index( 'idx_indiegame_remix_reports_id_game' ).on( table.id_game ),

	// Index on id_original field for efficient id_original-based queries
	index( 'idx_indiegame_remix_reports_id_original' ).on( table.id_original ),

	// Index on id_reporter field for efficient id_reporter-based queries
	index( 'idx_indiegame_remix_reports_id_reporter' ).on( table.id_reporter ),

	// Index on id_owner field for efficient id_owner-based queries
	index( 'idx_indiegame_remix_reports_id_owner' ).on( table.id_owner ),

	// Index on status field for efficient status-based queries
	index( 'idx_indiegame_remix_reports_status' ).on( table.status ),
] );

/**
 * Type inference for IndieRemixReport table select operations
 */
export type IndieRemixReportDB = typeof indiegame_remix_reports.$inferSelect;

/**
 * IndieGameReport table schema for Drizzle ORM
 */
export const indiegame_reports = sqliteTable( 'indiegame_reports', {
	// Unique identifier
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// Domain
	domain: text( 'domain', { length: 64 } ).notNull(),

	// Reported game
	id_game: text( 'id_game', { length: 64 } ).notNull(),

	// User who reports
	id_reporter: text( 'id_reporter', { length: 64 } ).notNull(),

	// Reason of the report
	reason: text( 'reason' ).notNull(),

	// open or closed
	status: text( 'status', { length: 16 } ).notNull(),

	// Creation date
	created: integer( 'created' ).notNull().$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),

	// Last update date
	updated: integer( 'updated' ).$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_indiegame_reports_domain' ).on( table.domain ),

	// Index on id_game field for efficient id_game-based queries
	index( 'idx_indiegame_reports_id_game' ).on( table.id_game ),

	// Index on id_reporter field for efficient id_reporter-based queries
	index( 'idx_indiegame_reports_id_reporter' ).on( table.id_reporter ),

	// Index on status field for efficient status-based queries
	index( 'idx_indiegame_reports_status' ).on( table.status ),
] );

/**
 * Type inference for IndieGameReport table select operations
 */
export type IndieGameReportDB = typeof indiegame_reports.$inferSelect;
