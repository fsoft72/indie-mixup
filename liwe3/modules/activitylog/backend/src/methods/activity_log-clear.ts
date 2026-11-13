import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Remove all rows in activity log
It is possible to specify an optional `module` to delete only those rows.

If no `module` is specified, all rows are deleted.
 *
 * @property {[string]} module - Module to delete rows
 */
const ActivityLogClearSchema = z.object( {
	module: z.string().optional(),
} );

/** Parameters for activity_log_clear */
export type ActivityLogClearParams = z.infer<typeof ActivityLogClearSchema>;

/*=== f2c_start activity_log_clear_headers ===*/
import { activity_log_events } from '../schema';
/*=== f2c_end activity_log_clear_headers ===*/

/**
 * Remove all rows in activity log
 * It is possible to specify an optional `module` to delete only those rows.
 *
 * If no `module` is specified, all rows are deleted.
 *
 * @permissions activitylog.event_del
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {ActivityLogClearParams} params - Request parameters
 * @param {string} ?params.module - Module to delete rows
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const activity_log_clear = async ( ctx : LiWECtx, params : ActivityLogClearParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<ActivityLogClearParams>( ActivityLogClearSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { module } = validation.data;

	/*=== f2c_start activity_log_clear ===*/
	// permission enforced by the route gate ({ perms: [ ACTIVITYLOG_PERM_EVENT_DEL ] })

	const conds = [];

	if ( module ) conds.push( eq( activity_log_events.module, module ) );

	await ctx.app.db.delete( activity_log_events ).where( and( ...conds ) );

	return responseSuccess( true );
	/*=== f2c_end activity_log_clear ===*/
};
