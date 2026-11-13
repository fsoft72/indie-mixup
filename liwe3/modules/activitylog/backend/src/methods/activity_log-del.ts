import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for activity_log_del parameters
 *
 * @property {string} id - Event id (required)
 */
const ActivityLogDelSchema = z.object( {
	id: z.string(),
} );

/** Parameters for activity_log_del */
export type ActivityLogDelParams = z.infer<typeof ActivityLogDelSchema>;

/*=== f2c_start activity_log_del_headers ===*/
import { activity_log_events } from '../schema';
/*=== f2c_end activity_log_del_headers ===*/

/**
 * Deletes an event
 *
 * @permissions activitylog.event_del
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {ActivityLogDelParams} params - Request parameters
 * @param {string} params.id - Event id
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const activity_log_del = async ( ctx : LiWECtx, params : ActivityLogDelParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<ActivityLogDelParams>( ActivityLogDelSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start activity_log_del ===*/
	// permission enforced by the route gate ({ perms: [ ACTIVITYLOG_PERM_EVENT_DEL ] })
	await ctx.app.db.delete( activity_log_events ).where( eq( activity_log_events.id, id ) );
	return responseSuccess( true );
	/*=== f2c_end activity_log_del ===*/
};
