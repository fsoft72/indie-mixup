import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * CredentialsItem table schema for Drizzle ORM
 */
export const credentials_items = sqliteTable( 'credentials_items', {
	// CredentialsItem main ID
	id: text( 'id', { length: 64 } ).primaryKey().$defaultFn( () => '' ).notNull(),

	// Credentials domain
	domain: text( 'domain', { length: 64 } ).notNull(),

	// User ID who created the credentials
	id_owner: text( 'id_owner', { length: 64 } ).notNull(),

	// Credentials name
	name: text( 'name', { length: 120 } ).notNull(),

	// Credentials type
	type: text( 'type', { length: 30 } ).notNull(),

	// Public metadata
	metadata: text( 'metadata', { mode: 'json' } ).notNull().$type<any>(),

	// IV + Ciphertext
	data_enc: text( 'data_enc' ),
}, ( table : any ) => [
	// Index on domain field for efficient domain-based queries
	index( 'idx_credentials_items_domain' ).on( table.domain ),

	// Index on id_owner field for efficient id_owner-based queries
	index( 'idx_credentials_items_id_owner' ).on( table.id_owner ),

	// Index on type field for efficient type-based queries
	index( 'idx_credentials_items_type' ).on( table.type ),
] );

/**
 * Type inference for CredentialsItem table select operations
 */
export type CredentialsItemDB = typeof credentials_items.$inferSelect;
