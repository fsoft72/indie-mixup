import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Notification table schema for Drizzle ORM
 */
export const notifications = sqliteTable( 'notifications', {
	// main ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// User ID who should receive this notification
	id_user: text( 'id_user', { length: 64 } ).notNull(),

	// Event type that triggered this notification
	event_type: text( 'event_type' ).notNull(),

	// Notification title
	title: text( 'title' ).notNull(),

	// Notification message
	message: text( 'message' ).notNull(),

	// Status: 'pending', 'dismissed', 'snoozed', 'shown'
	status: text( 'status', { length: 20 } ).notNull(),

	// Snooze until timestamp (null if not snoozed)
	snooze_until: integer( 'snooze_until' ),

	// Additional data as JSON
	data: text( 'data', { mode: 'json' } ).$type<any>(),

	// Notification type for UI: 'info', 'success', 'warning', 'error'
	notification_type: text( 'notification_type', { length: 20 } ).notNull(),

	// Domain field for multi-tenancy
	domain: text( 'domain' ).notNull(),

	// Notification created date
	created: integer( 'created' ).notNull().$type<Date>().default( sql`CURRENT_TIMESTAMP` ),

	// Notification updated date
	updated: integer( 'updated' ).notNull().$type<Date>().default( sql`CURRENT_TIMESTAMP` ),
}, ( table : any ) => [
	// Index on created field for sorting by creation date
	index( 'idx_notifications_created' ).on( table.created ),

	// Index on updated field for sorting by update date
	index( 'idx_notifications_updated' ).on( table.updated ),
] );

/**
 * Type inference for Notification table select operations
 */
export type NotificationDB = typeof notifications.$inferSelect;

/**
 * NotificationSetting table schema for Drizzle ORM
 */
export const notification_settings = sqliteTable( 'notification_settings', {
	// main ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// User ID
	id_user: text( 'id_user', { length: 64 } ).notNull(),

	// Event type to configure
	event_type: text( 'event_type' ).notNull(),

	// Whether this event type is enabled for notifications
	enabled: integer( 'enabled', { mode: 'boolean' } ).notNull().default( false ),

	// Domain field for multi-tenancy
	domain: text( 'domain' ).notNull(),
}, ( table : any ) => [] );

/**
 * Type inference for NotificationSetting table select operations
 */
export type NotificationSettingDB = typeof notification_settings.$inferSelect;
