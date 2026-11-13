import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Comment table schema for Drizzle ORM
 */
export const comment_comments = sqliteTable( 'comment_comments', {
	// Comment main ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// User ID who wrote the comment
	id_user: text( 'id_user', { length: 64 } ).notNull(),

	// The module being commented
	module: text( 'module', { length: 64 } ).notNull(),

	// The object id being commented
	id_obj: text( 'id_obj', { length: 64 } ).notNull(),

	// The text of the comment
	comment: text( 'comment' ).notNull(),

	// Follow up ID (if this is the comment of another comment)
	id_follow_up: text( 'id_follow_up', { length: 64 } ),

	// Domain code
	domain: text( 'domain', { length: 128 } ).notNull(),

	// Record creation timestamp
	created: integer( 'created' ).$type<Date>().default( sql`CURRENT_TIMESTAMP` ),

	// Record last update timestamp
	updated: integer( 'updated' ).$type<Date>().default( sql`CURRENT_TIMESTAMP` ),
}, ( table : any ) => [] );

/**
 * Type inference for Comment table select operations
 */
export type CommentDB = typeof comment_comments.$inferSelect;
