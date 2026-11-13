import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, liwe_event_register, logger, mkid, responseError, responseSuccess } from '@backend/liwe3';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { activity_log_events } from './schema';
import { ACTIVITYLOG_CALL_EVENT_ADD, ACTIVITYLOG_CALL_EVENT_LIST } from './events';
import { z } from 'zod';

export const ZActivityLogEventSchema = z.object( {
	domain: z.string(),
	module: z.string(),
	event: z.string(),
	data: z.any().optional(),
	id_user: z.string(),
	id_obj: z.string().max( 64 ).optional(),
} );

/** Maximum number of events returned by one `activitylog.call.event.list` */
const EVENT_LIST_MAX = 100;

/** Payload of `activitylog.call.event.list` */
export const ZActivityLogEventListSchema = z.object( {
	domain: z.string(),
	module: z.string(),
	id_obj: z.string(),
	offset: z.coerce.number().int().min( 0 ).optional().default( 0 ),
	limit: z.coerce.number().int().min( 1 ).optional().default( 50 ),
	sort: z.enum( [ 'asc', 'desc' ] ).optional().default( 'desc' ),
} );

const add_activity = async ( ctx : LiWECtx, data : any ) => {
	logger.debug( 'Activity log:', data );
	await ctx.app.db.insert( activity_log_events ).values( data ).run();
};

export const listeners_init = ( app : LiWEApp ) => {
	console.log( '    - listeners' );

	liwe_event_register( 'user.login', async ( ctx : LiWECtx, event_data : any ) => {
		await add_activity( ctx, {
			id: mkid( 'evt' ),
			module: 'user',
			id_user: event_data.id,
			domain: event_data.domain,
			event: 'user.login',
			data: {
				username: event_data.username,
			},
		} );

		return responseSuccess( true );
	} );

	liwe_event_register( ACTIVITYLOG_CALL_EVENT_ADD, async ( ctx : LiWECtx, event_data : any ) => {
		// validate event_data with zod
		const validated : any = ZActivityLogEventSchema.safeParse( event_data );
		console.log( '=== AL Event Add: ', validated, validated.success );
		if ( !validated.success ) return responseError( validated.error.message, 400, 'ERROR_INVALID_EVENT_DATA' );

		const evt = {
			id: mkid( 'evt' ),
			domain: validated.data.domain,
			module: validated.data.module,
			event: validated.data.event,
			data: validated.data.data,
			id_user: validated.data.id_user,
			id_obj: validated.data.id_obj,
		};

		await add_activity( ctx, evt );

		return responseSuccess( evt );
	} );

	// The caller is responsible for the access check on the object: the event only filters by domain, module and object
	liwe_event_register( ACTIVITYLOG_CALL_EVENT_LIST, async ( ctx : LiWECtx, event_data : any ) => {
		const validated = ZActivityLogEventListSchema.safeParse( event_data );
		if ( !validated.success ) return responseError( validated.error.message, 400, 'ERROR_INVALID_EVENT_LIST_DATA' );

		const { domain, module, id_obj, offset, sort } = validated.data;
		const limit = Math.min( validated.data.limit, EVENT_LIST_MAX );
		const order = sort === 'asc' ? asc : desc;

		const events = await ctx.app.db.select().from( activity_log_events )
			.where( and( eq( activity_log_events.domain, domain ), eq( activity_log_events.module, module ), eq( activity_log_events.id_obj, id_obj ) ) )
			.orderBy( order( activity_log_events.created ), order( sql`rowid` ) )
			.limit( limit )
			.offset( offset );

		return responseSuccess( { events } );
	} );
};
