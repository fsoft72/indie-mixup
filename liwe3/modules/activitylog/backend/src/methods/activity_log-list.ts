import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { ActivityLogEvent } from '../types';

/**
 * Schema for Return list of events in `DESC`ending order (can be changed with the `sort` parameter)
This endpoint uses pagination with `offset` (row start) and `limit` (how many rows to return once)
If `full` is `true`, event data will be returned along with event itself. Since event data can be huge, `full` is `false` by default.





 *
 * @property {[number]} offset - Pagination row start
 * @property {[number]} limit - Pagination rows size
 * @property {[string]} module - Filter by module name
 * @property {[string]} date_start - Initial date and time of events
 * @property {[string]} date_end - Final date and time of events
 * @property {[boolean]} full - If `true`, event data is returned as well
 * @property {[string]} sort - Sort (`asc` | `desc`)
 */
const ActivityLogListSchema = z.object( {
	offset: z.coerce.number().optional().default( 0 ),
	limit: z.coerce.number().optional().default( 50 ),
	module: z.string().optional(),
	date_start: z.coerce.date().optional(),
	date_end: z.coerce.date().optional(),
	full: zodBoolean.optional(),
	sort: z.string().optional(),
} );

/** Parameters for activity_log_list */
export type ActivityLogListParams = z.infer<typeof ActivityLogListSchema>;

/*=== f2c_start activity_log_list_headers ===*/
import { activity_log_events } from '../schema';
/*=== f2c_end activity_log_list_headers ===*/

/**
 * Return list of events in `DESC`ending order (can be changed with the `sort` parameter)
 * This endpoint uses pagination with `offset` (row start) and `limit` (how many rows to return once)
 * If `full` is `true`, event data will be returned along with event itself. Since event data can be huge, `full` is `false` by default.
 *
 * @permissions activitylog.event_view
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {ActivityLogListParams} params - Request parameters
 * @param {number} ?params.offset - Pagination row start
 * @param {number} ?params.limit - Pagination rows size
 * @param {string} ?params.module - Filter by module name
 * @param {string} ?params.date_start - Initial date and time of events
 * @param {string} ?params.date_end - Final date and time of events
 * @param {boolean} ?params.full - If `true`, event data is returned as well
 * @param {string} ?params.sort - Sort (`asc` | `desc`)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<ActivityLogEvent[]>>} Result object with success status and data or error details
 */
export const activity_log_list = async ( ctx : LiWECtx, params : ActivityLogListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<ActivityLogEvent[]>> => {
	const validation = paramsValidation<ActivityLogListParams>( ActivityLogListSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { offset, limit, module, date_start, date_end, full, sort } = validation.data;

	/*=== f2c_start activity_log_list ===*/
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );
	// permission enforced by the route gate ({ perms: [ ACTIVITYLOG_PERM_EVENT_VIEW ] })

	const res = await ctx.app.db.select().from( activity_log_events ) as ActivityLogEvent[];
	if ( !res ) return responseError( 'DB Error', 501, 'DB_READ_ERROR' );

	return responseSuccess( res );
	/*=== f2c_end activity_log_list ===*/
};
