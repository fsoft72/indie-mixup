import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * ActivityLogEvent table schema for Drizzle ORM
 */
export const activity_log_events = sqliteTable( 'activity_log_events', {
	//  main ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// User ID (if any)
	id_user: text( 'id_user', { length: 64 } ),

	// The event description
	event: text( 'event' ).notNull(),

	// Event data object
	data: text( 'data', { mode: 'json' } ).$type<any>(),

	// The module name
	module: text( 'module' ).notNull(),

	// domain field
	domain: text( 'domain' ).notNull(),

	// Id of the object the event is about (e.g. a kanban card), used to list the events of one object
	id_obj: text( 'id_obj', { length: 64 } ),

	// Creation timestamp
	created: integer( 'created' ).notNull().$type<Date>().default( sql`(CURRENT_TIMESTAMP)` ),
}, ( table : any ) => [
	// Index on id_obj field for efficient id_obj-based queries
	index( 'idx_activity_log_events_id_obj' ).on( table.id_obj ),
] );

/**
 * Type inference for ActivityLogEvent table select operations
 */
export type ActivityLogEventDB = typeof activity_log_events.$inferSelect;
