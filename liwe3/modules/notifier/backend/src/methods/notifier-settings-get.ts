import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { NotificationSetting } from '../types';

/*=== f2c_start notifier_settings_get_headers ===*/
import { notification_settings } from '../schema';
import { has_perms } from '@backend/liwe3';
import { NOTIFIER_PERM_SETTINGS_VIEW } from '../perms';
/*=== f2c_end notifier_settings_get_headers ===*/

/**
 * ## Get Notification Settings
 *
 * Retrieves the notification preference settings for the currently authenticated user. Returns a list of event types the user has configured, along with their enabled/disabled state.
 *
 * ### Behavior
 *
 * - Returns all `NotificationSetting` records matching the current user's `id_user` and `domain`
 * - If the user has never configured any settings, an empty array is returned
 * - Event types not present in the response are considered **enabled by default** (opt-out model)
 *
 * ### Use Case
 *
 * This endpoint powers the notification preferences UI where users can toggle which event types they want to receive notifications for (e.g., disable `comment.mention` but keep `system.maintenance`).
 *
 * ### Example Response
 *
 * ```json
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "nst_abc123",
 *       "id_user": "usr_xyz",
 *       "event_type": "comment.mention",
 *       "enabled": true,
 *       "domain": "mydomain"
 *     },
 *     {
 *       "id": "nst_def456",
 *       "id_user": "usr_xyz",
 *       "event_type": "system.maintenance",
 *       "enabled": false,
 *       "domain": "mydomain"
 *     }
 *   ]
 * }
 * ```
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<NotificationSetting[]>>} Result object with success status and data or error details
 */
export const notifier_settings_get = async ( ctx : LiWECtx, sys? : LiWESysParams ) : Promise<LiWEResponse<NotificationSetting[]>> => {
	/*=== f2c_start notifier_settings_get ===*/
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );
	if ( !await has_perms( ctx, [ NOTIFIER_PERM_SETTINGS_VIEW ] ) ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );

	const res = await ctx.app.db
		.select()
		.from( notification_settings )
		.where(
			and(
				eq( notification_settings.id_user, user.id ),
				eq( notification_settings.domain, user.domain ?? '_' ),
			),
		)
		.all() as NotificationSetting[];

	if ( !res ) return responseError( 'DB Error', 501, 'DB_READ_ERROR' );

	return responseSuccess( res );
	/*=== f2c_end notifier_settings_get ===*/
};
