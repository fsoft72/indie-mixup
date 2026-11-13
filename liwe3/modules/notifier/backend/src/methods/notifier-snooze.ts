import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for ## Snooze a Notification

Temporarily hides a notification for a specified number of days. After the snooze period expires, the notification will reappear in the `/notifier/list` results.

### Behavior

- Sets the notification `status` to `snoozed`
- Calculates `snooze_until` as the current time plus the specified number of days
- Updates the `updated` timestamp
- Emits the `notifier.snoozed` event with the notification data

### Snooze Expiration

When the `snooze_until` timestamp passes, the notification is automatically picked up again by the `/notifier/list` endpoint. No background job is required - the list query checks for expired snoozes at read time.

### Authorization

- The user can only snooze notifications belonging to them (`id_user` must match the authenticated user)

### Example Request Body

```json
{
  "id": "ntf_abc123",
  "days": 14
}
```

### Returns

The `snooze_until` Unix timestamp indicating when the notification will reappear:

```json
{
  "success": true,
  "snooze_until": 1742342400
}
```
 *
 * @property {string} id - Notification ID to snooze (required)
 * @property {[number]} days - Number of days to snooze
 */
const NotifierSnoozeSchema = z.object( {
	id: z.string(),
	days: z.coerce.number().optional().default( 7 ),
} );

/** Parameters for notifier_snooze */
export type NotifierSnoozeParams = z.infer<typeof NotifierSnoozeSchema>;

/*=== f2c_start notifier_snooze_headers ===*/
import { notifications } from '../schema';
import { has_perms, liwe_event_emit } from '@backend/liwe3';
import { NOTIFIER_PERM_SNOOZE } from '../perms';
import { NOTIFIER_EVENT_SNOOZED } from '../events';
/*=== f2c_end notifier_snooze_headers ===*/

/**
 * ## Snooze a Notification
 *
 * Temporarily hides a notification for a specified number of days. After the snooze period expires, the notification will reappear in the `/notifier/list` results.
 *
 * ### Behavior
 *
 * - Sets the notification `status` to `snoozed`
 * - Calculates `snooze_until` as the current time plus the specified number of days
 * - Updates the `updated` timestamp
 * - Emits the `notifier.snoozed` event with the notification data
 *
 * ### Snooze Expiration
 *
 * When the `snooze_until` timestamp passes, the notification is automatically picked up again by the `/notifier/list` endpoint. No background job is required - the list query checks for expired snoozes at read time.
 *
 * ### Authorization
 *
 * - The user can only snooze notifications belonging to them (`id_user` must match the authenticated user)
 *
 * ### Example Request Body
 *
 * ```json
 * {
 *   "id": "ntf_abc123",
 *   "days": 14
 * }
 * ```
 *
 * ### Returns
 *
 * The `snooze_until` Unix timestamp indicating when the notification will reappear:
 *
 * ```json
 * {
 *   "success": true,
 *   "snooze_until": 1742342400
 * }
 * ```
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {NotifierSnoozeParams} params - Request parameters
 * @param {string} params.id - Notification ID to snooze
 * @param {number} ?params.days - Number of days to snooze
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<any>>} Result object with success status and data or error details
 */
export const notifier_snooze = async ( ctx : LiWECtx, params : NotifierSnoozeParams, sys? : LiWESysParams ) : Promise<LiWEResponse<any>> => {
	const validation = paramsValidation<NotifierSnoozeParams>( NotifierSnoozeSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id, days } = validation.data;

	/*=== f2c_start notifier_snooze ===*/
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );
	if ( !await has_perms( ctx, [ NOTIFIER_PERM_SNOOZE ] ) ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );

	// Verify notification exists and belongs to user
	const notification = await ctx.app.db
		.select()
		.from( notifications )
		.where(
			and(
				eq( notifications.id, id ),
				eq( notifications.id_user, user.id ),
				eq( notifications.domain, user.domain ?? '_' ),
			),
		)
		.get();

	if ( !notification ) return responseError( 'Notification not found', 404, 'NOT_FOUND' );

	// Calculate snooze_until timestamp (days from now)
	const snooze_until = Math.floor( Date.now() / 1000 ) + ( days * 24 * 60 * 60 );

	// Update status to snoozed with snooze_until timestamp
	await ctx.app.db
		.update( notifications )
		.set( {
			status: 'snoozed',
			snooze_until,
		} )
		.where( eq( notifications.id, id ) )
		.run();

	// Emit event
	await liwe_event_emit( ctx, NOTIFIER_EVENT_SNOOZED, {
		id,
		id_user: user.id,
		domain: user.domain,
		event_type: notification.event_type,
		snooze_until,
		days,
	} );

	return responseSuccess( { snooze_until } );
	/*=== f2c_end notifier_snooze ===*/
};
