import { LiWEApp, type LiWECtx, type LiWEResponse, liwe_event_register, logger, responseError, responseSuccess } from '@backend/liwe3';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { TAGS_CALL_FIND_OBJECTS_BY_TAG, TAGS_CALL_LIST_BY_OBJECTS, TAGS_CALL_OBJ_ADD, TAGS_CALL_OBJ_DEL, TAGS_CALL_TAG_ADD } from './events';
import { tag_add, tag_object, tag_remove_object } from './methods';
import { type Tag, taggables, tags } from './schema';

// Max bound parameters per query is 100 on D1: keep ids chunks well below it
const IDS_CHUNK_SIZE = 50;

export const ZListByObjectsSchema = z.object( {
	module: z.string().min( 1 ),
	ids: z.array( z.string() ),
} );

export const ZFindObjectsByTagSchema = z.object( {
	module: z.string().min( 1 ),
	tag_slug: z.string().min( 1 ),
} );

/**
 * Splits a list in chunks of at most `size` items.
 *
 * @param items - the list to split
 * @param size - max items per chunk
 */
const _chunk = <T>( items : T[], size : number ) : T[][] => {
	const out : T[][] = [];
	for ( let i = 0; i < items.length; i += size ) out.push( items.slice( i, i + size ) );
	return out;
};

/** Handler of a forwarding call event: runs a legacy (app, params) method with the caller app */
type CallMethod = ( app : LiWEApp, params : any ) => Promise<LiWEResponse<unknown>>;

/** Methods exposed as forwarding `tags.call.*` events, keyed by event name */
export const TAGS_CALL_METHODS : Record<string, CallMethod> = {
	[TAGS_CALL_TAG_ADD]: tag_add,
	[TAGS_CALL_OBJ_ADD]: tag_object,
	[TAGS_CALL_OBJ_DEL]: tag_remove_object,
};

/**
 * Registers one handler per entry of `TAGS_CALL_METHODS`. The handler returns the method response untouched
 * and never throws: an unexpected exception becomes a 500 `responseError`.
 */
const _call_listeners = () : void => {
	for ( const [ name, method ] of Object.entries( TAGS_CALL_METHODS ) ) {
		liwe_event_register( name, async ( ctx : LiWECtx, event_data : unknown ) => {
			try {
				return await method( ctx.app, event_data );
			} catch ( err ) {
				// the thrown text may carry internals: log it, answer a generic message
				logger.error( 'Tags call failed', err instanceof Error ? err : undefined, { event: name } );
				return responseError( 'Tags call failed', 500, 'ERROR_TAGS_CALL' );
			}
		} );
	}
};

/**
 * Registers the tags.call.* listeners (callable by other modules via liwe_event_call).
 *
 * @param app - the LiWE application
 */
export const listeners_init = ( app : LiWEApp ) => {
	console.log( '    - listeners' );

	_call_listeners();

	/**
	 * tags.call.list_by_objects
	 * Payload: { module, ids }. Returns { tags: Record<id, Tag[]> } with active tags only
	 * and an entry (possibly empty) for every requested id.
	 */
	liwe_event_register( TAGS_CALL_LIST_BY_OBJECTS, async ( ctx : LiWECtx, event_data : unknown ) => {
		const validated = ZListByObjectsSchema.safeParse( event_data );
		if ( !validated.success ) return responseError( validated.error.message, 400, 'ERROR_INVALID_TAGS_CALL_DATA' );

		const { module, ids } = validated.data;
		const res : Record<string, Tag[]> = {};
		ids.forEach( ( id ) => res[id] = [] );

		for ( const chunk of _chunk( ids, IDS_CHUNK_SIZE ) ) {
			const rows = await ctx.app.db
				.select( { id_object: taggables.id_object, tag: tags } )
				.from( taggables )
				.innerJoin( tags, eq( taggables.tag_id, tags.id ) )
				.where( and( eq( taggables.module, module ), inArray( taggables.id_object, chunk ), eq( tags.is_active, true ) ) )
				.orderBy( asc( tags.name ) )
				.all();

			rows.forEach( ( row ) => res[row.id_object].push( row.tag ) );
		}

		return responseSuccess( { tags: res } );
	} );

	/**
	 * tags.call.find_objects_by_tag
	 * Payload: { module, tag_slug }. Returns { ids: string[] } for an active tag.
	 * Tags are not domain scoped: callers MUST intersect the ids with their own domain-filtered rows.
	 */
	liwe_event_register( TAGS_CALL_FIND_OBJECTS_BY_TAG, async ( ctx : LiWECtx, event_data : unknown ) => {
		const validated = ZFindObjectsByTagSchema.safeParse( event_data );
		if ( !validated.success ) return responseError( validated.error.message, 400, 'ERROR_INVALID_TAGS_CALL_DATA' );

		const { module, tag_slug } = validated.data;

		const rows = await ctx.app.db
			.select( { id_object: taggables.id_object } )
			.from( taggables )
			.innerJoin( tags, eq( taggables.tag_id, tags.id ) )
			.where( and( eq( taggables.module, module ), eq( tags.slug, tag_slug ), eq( tags.is_active, true ) ) )
			.all();

		return responseSuccess( { ids: rows.map( ( r ) => r.id_object ) } );
	} );
};
