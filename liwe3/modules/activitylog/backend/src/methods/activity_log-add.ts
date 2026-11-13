import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { ActivityLogEvent } from '../types';

/**
 * Schema for Add a new event to the system.

Only users with permission `activitylogs.event_add` can add a new event with this endpoint.

 *
 * @property {string} event - Event description (required)
 * @property {[string]} data - Event data
 * @property {string} module - module parameter (required)
 */
const ActivityLogAddSchema = z.object( {
	event: z.string(),
	data: z.any().optional(),
	module: z.string(),
} );

/** Parameters for activity_log_add */
export type ActivityLogAddParams = z.infer<typeof ActivityLogAddSchema>;

/*=== f2c_start activity_log_add_headers ===*/
import { has_perms, mkid } from '@backend/liwe3';
import { activity_log_events } from '../schema';
/*=== f2c_end activity_log_add_headers ===*/

/**
 * Add a new event to the system.
 *
 * Only users with permission `activitylogs.event_add` can add a new event with this endpoint.
 *
 * @permissions activitylogs.event_add
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {ActivityLogAddParams} params - Request parameters
 * @param {string} params.event - Event description
 * @param {string} ?params.data - Event data
 * @param {string} params.module - module parameter
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<ActivityLogEvent>>} Result object with success status and data or error details
 */
export const activity_log_add = async ( ctx : LiWECtx, params : ActivityLogAddParams, sys? : LiWESysParams ) : Promise<LiWEResponse<ActivityLogEvent>> => {
	const validation = paramsValidation<ActivityLogAddParams>( ActivityLogAddSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { event, data, module } = validation.data;

	/*=== f2c_start activity_log_add ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );
	if ( !await has_perms( ctx, [ 'system.admin' ] ) ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );

	// `created` is left to the DB default (CURRENT_TIMESTAMP): the column has no timestamp mode, so a Date would reach D1 unconverted
	const evt : Omit<ActivityLogEvent, 'created'> = {
		id: mkid( 'evt' ),
		id_user: user.id,
		domain: user.domain ?? '_',
		module: module,
		data: data,
		event: event,
	};

	await ctx.app.db.insert( activity_log_events ).values( evt );
	const res : ActivityLogEvent = await ctx.app.db.select().from( activity_log_events ).where( eq( activity_log_events.id, evt.id ) ).get() as ActivityLogEvent;
	if ( !res ) return responseError( 'Could not create record', 501, 'DBERROR' );

	return responseSuccess( res );
	/*=== f2c_end activity_log_add ===*/
};
