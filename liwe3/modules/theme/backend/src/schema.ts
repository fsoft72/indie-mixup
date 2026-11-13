import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const themes = sqliteTable( 'themes', {
	id: integer( 'id', { mode: 'number' } ).primaryKey( { autoIncrement: true } ),
	domain: text( 'domain', { length: 100 } ).notNull().default( '_' ),
	name: text( 'name', { length: 100 } ).notNull(),
	is_default: integer( 'is_default', { mode: 'boolean' } ).notNull().default( false ),
	extends: text( 'extends', { length: 50 } ),
	tokens: text( 'tokens' ).notNull(), // JSON string of seed values per variant
	updated_at: integer( 'updated_at', { mode: 'timestamp' } ).$defaultFn( () => new Date() ),
	created_at: integer( 'created_at', { mode: 'timestamp' } ).$defaultFn( () => new Date() ),
}, ( table ) => ( {
	domainIndex: index( 'themes_domain_index' ).on( table.domain ),
	defaultIndex: index( 'themes_default_index' ).on( table.is_default ),
	domainDefaultUnique: uniqueIndex( 'themes_domain_default_unique' ).on( table.domain, table.is_default ),
} ) );

export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;
