import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const tags = sqliteTable( 'tags', {
	id: integer( 'id', { mode: 'number' } ).primaryKey( { autoIncrement: true } ),
	name: text( 'name', { length: 100 } ).notNull(),
	slug: text( 'slug', { length: 100 } ).notNull(),
	description: text( 'description' ),
	color: text( 'color', { length: 7 } ),
	category: text( 'category', { length: 50 } ),
	weight: real( 'weight' ).default( 1.0 ),
	is_active: integer( 'is_active', { mode: 'boolean' } ).notNull().default( true ),
	created: integer( 'created', { mode: 'timestamp' } ).$defaultFn( () => new Date() ),
	updated: integer( 'updated', { mode: 'timestamp' } ).$defaultFn( () => new Date() ),
	updated_by: text( 'updated_by', { length: 64 } ),
}, ( table ) => ( {
	nameUnique: uniqueIndex( 'tags_name_unique' ).on( table.name ),
	slugUnique: uniqueIndex( 'tags_slug_unique' ).on( table.slug ),
	categoryIndex: index( 'tags_category_index' ).on( table.category ),
	activeIndex: index( 'tags_active_index' ).on( table.is_active ),
	weightIndex: index( 'tags_weight_index' ).on( table.weight ),
	updatedIndex: index( 'tags_updated_index' ).on( table.updated ),
	updatedByIndex: index( 'tags_updated_by_index' ).on( table.updated_by ),
} ) );

export const taggables = sqliteTable( 'taggables', {
	id: integer( 'id', { mode: 'number' } ).primaryKey( { autoIncrement: true } ),
	tag_id: integer( 'tag_id', { mode: 'number' } ).notNull().references( () => tags.id, { onDelete: 'cascade' } ),
	module: text( 'module', { length: 50 } ).notNull(),
	id_object: text( 'id_object', { length: 64 } ).notNull(),
	relevance_score: real( 'relevance_score' ).default( 1.0 ),
	created: integer( 'created', { mode: 'timestamp' } ).$defaultFn( () => new Date() ),
	updated: integer( 'updated', { mode: 'timestamp' } ).$defaultFn( () => new Date() ),
	updated_by: text( 'updated_by', { length: 64 } ),
	auto_tagged: integer( 'auto_tagged', { mode: 'boolean' } ).default( false ),
}, ( table ) => ( {
	entityTagUnique: uniqueIndex( 'taggables_entity_tag_unique' ).on(
		table.module,
		table.id_object,
		table.tag_id,
	),
	tagIndex: index( 'taggables_tag_index' ).on( table.tag_id ),
	entityIndex: index( 'taggables_entity_index' ).on( table.module, table.id_object ),
	moduleIndex: index( 'taggables_module_index' ).on( table.module ),
	relevanceIndex: index( 'taggables_relevance_index' ).on( table.relevance_score ),
	updatedByIndex: index( 'taggables_updated_by_index' ).on( table.updated_by ),
	autoTaggedIndex: index( 'taggables_auto_tagged_index' ).on( table.auto_tagged ),
	createdIndex: index( 'taggables_created_index' ).on( table.created ),
	updatedIndex: index( 'taggables_updated_index' ).on( table.updated ),
	tagRelevanceIndex: index( 'taggables_tag_relevance_index' ).on( table.tag_id, table.relevance_score ),
	entityRelevanceIndex: index( 'taggables_entity_relevance_index' ).on(
		table.module,
		table.id_object,
		table.relevance_score,
	),
	moduleRelevanceIndex: index( 'taggables_module_relevance_index' ).on( table.module, table.relevance_score ),
} ) );

// ===== RELATIONS =====

export const tagsRelations = relations( tags, ( { many } ) => ( {
	taggables: many( taggables ),
} ) );

export const taggablesRelations = relations( taggables, ( { one } ) => ( {
	tag: one( tags, {
		fields: [ taggables.tag_id ],
		references: [ tags.id ],
	} ),
} ) );

// ===== TYPE INFERENCE =====

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Taggable = typeof taggables.$inferSelect;
export type NewTaggable = typeof taggables.$inferInsert;
