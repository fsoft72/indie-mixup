import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for ## Dismiss a Notification

Permanently dismisses a notification. Once dismissed, the notification will **never** be returned by the `/notifier/list` endpoint again.

### Behavior

- Sets the notification `status` to `dismissed`
- Updates the `updated` timestamp
- Emits the `notifier.dismissed` event with the notification data
- The notification remains in the database for audit purposes but is excluded from all queries

### Authorization

- The user can only dismiss notifications belonging to them (`id_user` must match the authenticated user)
- Returns `false` if the notification does not exist or does not belong to the user

### Example Request Body

```json
{
  "id": "ntf_abc123"
}
```

### Returns

`true` if the notification was successfully dismissed, `false` otherwise.
 *
 * @property {string} id - Notification ID to dismiss (required)
 */
const NotifierDismissSchema = z.object( {
	id: z.string(),
} );

/** Parameters for notifier_dismiss */
export type NotifierDismissParams = z.infer<typeof NotifierDismissSchema>;

/*=== f2c_start notifier_dismiss_headers ===*/
import { notifications } from '../schema';
import { has_perms, liwe_event_emit } from '@backend/liwe3';
import { NOTIFIER_PERM_DISMISS } from '../perms';
import { NOTIFIER_EVENT_DISMISSED } from '../events';
/*=== f2c_end notifier_dismiss_headers ===*/

/**
 * ## Dismiss a Notification
 *
 * Permanently dismisses a notification. Once dismissed, the notification will **never** be returned by the `/notifier/list` endpoint again.
 *
 * ### Behavior
 *
 * - Sets the notification `status` to `dismissed`
 * - Updates the `updated` timestamp
 * - Emits the `notifier.dismissed` event with the notification data
 * - The notification remains in the database for audit purposes but is excluded from all queries
 *
 * ### Authorization
 *
 * - The user can only dismiss notifications belonging to them (`id_user` must match the authenticated user)
 * - Returns `false` if the notification does not exist or does not belong to the user
 *
 * ### Example Request Body
 *
 * ```json
 * {
 *   "id": "ntf_abc123"
 * }
 * ```
 *
 * ### Returns
 *
 * `true` if the notification was successfully dismissed, `false` otherwise.
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {NotifierDismissParams} params - Request parameters
 * @param {string} params.id - Notification ID to dismiss
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const notifier_dismiss = async ( ctx : LiWECtx, params : NotifierDismissParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<NotifierDismissParams>( NotifierDismissSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start notifier_dismiss ===*/
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );
	if ( !await has_perms( ctx, [ NOTIFIER_PERM_DISMISS ] ) ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );

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

	// Update status to dismissed
	await ctx.app.db
		.update( notifications )
		.set( { status: 'dismissed' } )
		.where( eq( notifications.id, id ) )
		.run();

	// Emit event
	await liwe_event_emit( ctx, NOTIFIER_EVENT_DISMISSED, {
		id,
		id_user: user.id,
		domain: user.domain,
		event_type: notification.event_type,
	} );

	return responseSuccess( true );
	/*=== f2c_end notifier_dismiss ===*/
};
