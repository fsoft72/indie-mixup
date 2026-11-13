import { LiWEApp, type LiWECtx, type LiWEResponse, liwe_event_register, logger, responseError, responseSuccess } from '@backend/liwe3';
import { and, count, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { COMMENT_CALL_ADD, COMMENT_CALL_COUNT, COMMENT_CALL_DEL, COMMENT_CALL_LIST } from './events';
import { comment_add, comment_del, comments_list } from './methods';
import { comment_comments } from './schema';

// Max bound parameters per query is 100 on D1: keep ids chunks well below it
const IDS_CHUNK_SIZE = 50;

export const ZCommentCountSchema = z.object( {
	domain: z.string().min( 1 ),
	module: z.string().min( 1 ),
	ids: z.array( z.string() ),
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

/** Handler of a call event: forwards the context and the payload to a method */
type CallMethod = ( ctx : LiWECtx, params : any ) => Promise<LiWEResponse<unknown>>;

/** Methods exposed as `comment.call.*` events, keyed by event name */
export const COMMENT_CALL_METHODS : Record<string, CallMethod> = {
	[COMMENT_CALL_LIST]: comments_list,
	[COMMENT_CALL_ADD]: comment_add,
	[COMMENT_CALL_DEL]: comment_del,
};

/**
 * Registers one handler per entry of `COMMENT_CALL_METHODS`. The handler returns the method response untouched
 * and never throws: an unexpected exception becomes a 500 `responseError`.
 */
const _call_listeners = () : void => {
	for ( const [ name, method ] of Object.entries( COMMENT_CALL_METHODS ) ) {
		liwe_event_register( name, async ( ctx : LiWECtx, event_data : unknown ) => {
			try {
				return await method( ctx, event_data );
			} catch ( err ) {
				// the thrown text may carry internals: log it, answer a generic message
				logger.error( 'Comment call failed', err instanceof Error ? err : undefined, { event: name } );
				return responseError( 'Comment call failed', 500, 'ERROR_COMMENT_CALL' );
			}
		} );
	}
};

/**
 * Registers the comment listeners: the `comment.call.*` calls and the events of other modules.
 *
 * @param app - the LiWE application
 */
export const listeners_init = ( app : LiWEApp ) => {
	console.log( '    - listeners' );

	_call_listeners();

	liwe_event_register( 'user.del', async ( ctx : LiWECtx, event_data : any ) => {
		console.log( '=== COMMENT: user.del event' );

		return responseSuccess( true );
	} );

	/**
	 * comment.call.count
	 * Payload: { domain, module, ids }. Returns { counts: Record<id, number> } with an entry
	 * (0 when empty) for every requested id. Only comments of the given domain and module count.
	 */
	liwe_event_register( COMMENT_CALL_COUNT, async ( ctx : LiWECtx, event_data : unknown ) => {
		const validated = ZCommentCountSchema.safeParse( event_data );
		if ( !validated.success ) return responseError( validated.error.message, 400, 'ERROR_INVALID_COMMENT_COUNT_DATA' );

		const { domain, module, ids } = validated.data;
		const counts : Record<string, number> = {};
		ids.forEach( ( id ) => counts[id] = 0 );

		for ( const chunk of _chunk( ids, IDS_CHUNK_SIZE ) ) {
			const rows = await ctx.app.db
				.select( { id_obj: comment_comments.id_obj, total: count() } )
				.from( comment_comments )
				.where( and( eq( comment_comments.domain, domain ), eq( comment_comments.module, module ), inArray( comment_comments.id_obj, chunk ) ) )
				.groupBy( comment_comments.id_obj )
				.all();

			rows.forEach( ( row ) => counts[row.id_obj] = row.total );
		}

		return responseSuccess( { counts } );
	} );
};
