import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { Notification } from '../types';

/**
 * Schema for ## Get Pending Notifications

Retrieves the list of actionable notifications for the currently authenticated user. This endpoint is designed for **frontend polling** (default: every 30 seconds).

### Selection Criteria

A notification is returned if it matches **any** of these conditions:
- Status is `pending` (never shown to the user yet)
- Status is `snoozed` **and** `snooze_until` timestamp has passed (snooze expired)

Notifications with status `dismissed` or `shown` are **never** returned.

### Side Effects

- All returned notifications are automatically updated to `shown` status
- The `updated` timestamp is refreshed for each returned notification

### Ordering & Limits

- Results are ordered by `created` date (newest first)
- The `limit` query parameter controls the maximum number of results (default: 10)

### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "ntf_abc123",
      "id_user": "usr_xyz",
      "event_type": "comment.mention",
      "title": "New Comment",
      "message": "You were mentioned in a comment",
      "status": "pending",
      "notification_type": "info",
      "data": { "id_comment": "cmt_456" },
      "domain": "mydomain",
      "created": "2026-03-13T10:00:00Z",
      "updated": "2026-03-13T10:00:00Z"
    }
  ]
}
```
 *
 * @property {[number]} limit - Maximum number of notifications to return
 */
const NotifierListSchema = z.object( {
	limit: z.coerce.number().optional().default( 10 ),
} );

/** Parameters for notifier_list */
export type NotifierListParams = z.infer<typeof NotifierListSchema>;

/*=== f2c_start notifier_list_headers ===*/
import { notifications } from '../schema';
import { has_perms } from '@backend/liwe3';
import { NOTIFIER_PERM_LIST } from '../perms';
import { desc, inArray, lt } from 'drizzle-orm';
/*=== f2c_end notifier_list_headers ===*/

/**
 * ## Get Pending Notifications
 *
 * Retrieves the list of actionable notifications for the currently authenticated user. This endpoint is designed for **frontend polling** (default: every 30 seconds).
 *
 * ### Selection Criteria
 *
 * A notification is returned if it matches **any** of these conditions:
 * - Status is `pending` (never shown to the user yet)
 * - Status is `snoozed` **and** `snooze_until` timestamp has passed (snooze expired)
 *
 * Notifications with status `dismissed` or `shown` are **never** returned.
 *
 * ### Side Effects
 *
 * - All returned notifications are automatically updated to `shown` status
 * - The `updated` timestamp is refreshed for each returned notification
 *
 * ### Ordering & Limits
 *
 * - Results are ordered by `created` date (newest first)
 * - The `limit` query parameter controls the maximum number of results (default: 10)
 *
 * ### Example Response
 *
 * ```json
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "ntf_abc123",
 *       "id_user": "usr_xyz",
 *       "event_type": "comment.mention",
 *       "title": "New Comment",
 *       "message": "You were mentioned in a comment",
 *       "status": "pending",
 *       "notification_type": "info",
 *       "data": { "id_comment": "cmt_456" },
 *       "domain": "mydomain",
 *       "created": "2026-03-13T10:00:00Z",
 *       "updated": "2026-03-13T10:00:00Z"
 *     }
 *   ]
 * }
 * ```
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {NotifierListParams} params - Request parameters
 * @param {number} ?params.limit - Maximum number of notifications to return
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<Notification[]>>} Result object with success status and data or error details
 */
export const notifier_list = async ( ctx : LiWECtx, params : NotifierListParams, sys? : LiWESysParams ) : Promise<LiWEResponse<Notification[]>> => {
	const validation = paramsValidation<NotifierListParams>( NotifierListSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { limit } = validation.data;

	/*=== f2c_start notifier_list ===*/
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );
	if ( !await has_perms( ctx, [ NOTIFIER_PERM_LIST ] ) ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );

	const now = Math.floor( Date.now() / 1000 );

	// Get pending notifications or snoozed notifications whose time has come
	const res = await ctx.app.db
		.select()
		.from( notifications )
		.where(
			and(
				eq( notifications.id_user, user.id ),
				eq( notifications.domain, user.domain ?? '_' ),
				or(
					eq( notifications.status, 'pending' ),
					and(
						eq( notifications.status, 'snoozed' ),
						lt( notifications.snooze_until, now ),
					),
				),
			),
		)
		.orderBy( desc( notifications.created ) )
		.limit( limit )
		.all() as Notification[];

	if ( !res ) return responseError( 'DB Error', 501, 'DB_READ_ERROR' );

	// Mark these notifications as 'shown'
	if ( res.length > 0 ) {
		const ids = res.map( ( n ) => n.id );
		await ctx.app.db
			.update( notifications )
			.set( { status: 'shown' } )
			.where( inArray( notifications.id, ids ) )
			.run();
	}

	return responseSuccess( res );
	/*=== f2c_end notifier_list ===*/
};
