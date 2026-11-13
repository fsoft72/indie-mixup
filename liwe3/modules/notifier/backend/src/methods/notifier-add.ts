import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { Notification } from '../types';

/**
 * Schema for ## Create a New Notification

Creates a new notification for a specific user. The notification is stored with `pending` status and will be delivered on the next frontend polling cycle.

### Behavior

- The notification `status` is automatically set to `pending`
- The `created` and `updated` timestamps are set to the current time
- A unique `id` is auto-generated for the notification
- The `domain` is inherited from the authenticated user's context
- After creation, the `notifier.created` event is emitted

### Notification Types

| Type | UI Style | Use Case |
|------|----------|----------|
| `info` | Blue | General information |
| `success` | Green | Positive confirmation |
| `warning` | Yellow | Caution or expiring items |
| `error` | Red | Critical alerts |

If `notification_type` is omitted, it defaults to `info`.

### The `data` Field

The optional `data` parameter accepts arbitrary JSON for passing extra context to the frontend (e.g., IDs for deep linking, counts, metadata).

### Example Request Body

```json
{
  "id_user": "usr_abc123",
  "event_type": "comment.mention",
  "title": "You were mentioned",
  "message": "John mentioned you in a comment",
  "notification_type": "info",
  "data": { "id_comment": "cmt_456" }
}
```
 *
 * @property {string} id_user - User ID who should receive the notification (required)
 * @property {string} event_type - Event type that triggered this notification (required)
 * @property {string} title - Notification title (required)
 * @property {string} message - Notification message (required)
 * @property {[string]} notification_type - Notification type for UI styling: 'info', 'success', 'warning', 'error'
 * @property {[string]} data - Additional data as JSON
 */
const NotifierAddSchema = z.object( {
	id_user: z.string(),
	event_type: z.string(),
	title: z.string(),
	message: z.string(),
	notification_type: z.string().optional().default( 'info' ),
	data: z.any().optional(),
} );

/** Parameters for notifier_add */
export type NotifierAddParams = z.infer<typeof NotifierAddSchema>;

/*=== f2c_start notifier_add_headers ===*/
import { notifications } from '../schema';
import { has_perms, liwe_event_emit, mkid } from '@backend/liwe3';
import { NOTIFIER_PERM_ADD } from '../perms';
import { NOTIFIER_EVENT_CREATED } from '../events';
/*=== f2c_end notifier_add_headers ===*/

/**
 * ## Create a New Notification
 *
 * Creates a new notification for a specific user. The notification is stored with `pending` status and will be delivered on the next frontend polling cycle.
 *
 * ### Behavior
 *
 * - The notification `status` is automatically set to `pending`
 * - The `created` and `updated` timestamps are set to the current time
 * - A unique `id` is auto-generated for the notification
 * - The `domain` is inherited from the authenticated user's context
 * - After creation, the `notifier.created` event is emitted
 *
 * ### Notification Types
 *
 * | Type | UI Style | Use Case |
 * |------|----------|----------|
 * | `info` | Blue | General information |
 * | `success` | Green | Positive confirmation |
 * | `warning` | Yellow | Caution or expiring items |
 * | `error` | Red | Critical alerts |
 *
 * If `notification_type` is omitted, it defaults to `info`.
 *
 * ### The `data` Field
 *
 * The optional `data` parameter accepts arbitrary JSON for passing extra context to the frontend (e.g., IDs for deep linking, counts, metadata).
 *
 * ### Example Request Body
 *
 * ```json
 * {
 *   "id_user": "usr_abc123",
 *   "event_type": "comment.mention",
 *   "title": "You were mentioned",
 *   "message": "John mentioned you in a comment",
 *   "notification_type": "info",
 *   "data": { "id_comment": "cmt_456" }
 * }
 * ```
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {NotifierAddParams} params - Request parameters
 * @param {string} params.id_user - User ID who should receive the notification
 * @param {string} params.event_type - Event type that triggered this notification
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} ?params.notification_type - Notification type for UI styling: 'info', 'success', 'warning', 'error'
 * @param {string} ?params.data - Additional data as JSON
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<Notification>>} Result object with success status and data or error details
 */
export const notifier_add = async ( ctx : LiWECtx, params : NotifierAddParams, sys? : LiWESysParams ) : Promise<LiWEResponse<Notification>> => {
	const validation = paramsValidation<NotifierAddParams>( NotifierAddSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id_user, event_type, title, message, notification_type, data } = validation.data;

	/*=== f2c_start notifier_add ===*/
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );
	if ( !await has_perms( ctx, [ NOTIFIER_PERM_ADD ] ) ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );

	const notification = {
		id: mkid( 'ntf' ),
		id_user,
		event_type,
		title,
		message,
		notification_type: notification_type || 'info',
		status: 'pending',
		data,
		domain: user.domain ?? '_',
	};

	await ctx.app.db.insert( notifications ).values( notification ).run();

	// Emit event
	await liwe_event_emit( ctx, NOTIFIER_EVENT_CREATED, notification );

	return responseSuccess( notification as Notification );
	/*=== f2c_end notifier_add ===*/
};
