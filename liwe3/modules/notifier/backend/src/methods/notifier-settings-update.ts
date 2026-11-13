import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

import { NotificationSetting } from '../types';

/**
 * Schema for ## Update Notification Setting

Creates or updates a notification preference for a specific event type. Allows users to opt in or out of notifications for individual event types.

### Behavior

- If a setting for the given `event_type` already exists for the user, it is **updated** (upsert)
- If no setting exists, a new `NotificationSetting` record is **created**
- The `domain` is inherited from the authenticated user's context
- When `enabled` is set to `false`, future notifications of that `event_type` will **not** be created for this user

### Opt-Out Model

The system uses an **opt-out** model: all event types are enabled by default. Users explicitly disable the ones they do not want. Setting `enabled: true` restores the default behavior.

### Example Request Body

```json
{
  "event_type": "comment.mention",
  "enabled": false
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "nst_abc123",
    "id_user": "usr_xyz",
    "event_type": "comment.mention",
    "enabled": false,
    "domain": "mydomain"
  }
}
```
 *
 * @property {string} event_type - Event type to configure (required)
 * @property {boolean} enabled - Whether to enable or disable notifications for this event type (required)
 */
const NotifierSettingsUpdateSchema = z.object( {
	event_type: z.string(),
	enabled: zodBoolean,
} );

/** Parameters for notifier_settings_update */
export type NotifierSettingsUpdateParams = z.infer<typeof NotifierSettingsUpdateSchema>;

/*=== f2c_start notifier_settings_update_headers ===*/
import { notification_settings } from '../schema';
import { has_perms, mkid } from '@backend/liwe3';
import { NOTIFIER_PERM_SETTINGS_UPDATE } from '../perms';
/*=== f2c_end notifier_settings_update_headers ===*/

/**
 * ## Update Notification Setting
 *
 * Creates or updates a notification preference for a specific event type. Allows users to opt in or out of notifications for individual event types.
 *
 * ### Behavior
 *
 * - If a setting for the given `event_type` already exists for the user, it is **updated** (upsert)
 * - If no setting exists, a new `NotificationSetting` record is **created**
 * - The `domain` is inherited from the authenticated user's context
 * - When `enabled` is set to `false`, future notifications of that `event_type` will **not** be created for this user
 *
 * ### Opt-Out Model
 *
 * The system uses an **opt-out** model: all event types are enabled by default. Users explicitly disable the ones they do not want. Setting `enabled: true` restores the default behavior.
 *
 * ### Example Request Body
 *
 * ```json
 * {
 *   "event_type": "comment.mention",
 *   "enabled": false
 * }
 * ```
 *
 * ### Example Response
 *
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "nst_abc123",
 *     "id_user": "usr_xyz",
 *     "event_type": "comment.mention",
 *     "enabled": false,
 *     "domain": "mydomain"
 *   }
 * }
 * ```
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {NotifierSettingsUpdateParams} params - Request parameters
 * @param {string} params.event_type - Event type to configure
 * @param {boolean} params.enabled - Whether to enable or disable notifications for this event type
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<NotificationSetting>>} Result object with success status and data or error details
 */
export const notifier_settings_update = async ( ctx : LiWECtx, params : NotifierSettingsUpdateParams, sys? : LiWESysParams ) : Promise<LiWEResponse<NotificationSetting>> => {
	const validation = paramsValidation<NotifierSettingsUpdateParams>( NotifierSettingsUpdateSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { event_type, enabled } = validation.data;

	/*=== f2c_start notifier_settings_update ===*/
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );
	if ( !await has_perms( ctx, [ NOTIFIER_PERM_SETTINGS_UPDATE ] ) ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );

	// Check if setting already exists
	const existing = await ctx.app.db
		.select()
		.from( notification_settings )
		.where(
			and(
				eq( notification_settings.id_user, user.id ),
				eq( notification_settings.event_type, event_type ),
				eq( notification_settings.domain, user.domain ?? '_' ),
			),
		)
		.get();

	let result : NotificationSetting;

	if ( existing ) {
		// Update existing setting
		await ctx.app.db
			.update( notification_settings )
			.set( { enabled: enabled as any } )
			.where( eq( notification_settings.id, existing.id ) )
			.run();

		result = { ...existing, enabled } as NotificationSetting;
	} else {
		// Create new setting
		const newSetting = {
			id: mkid( 'nts' ),
			id_user: user.id,
			event_type,
			enabled: enabled as any,
			domain: user.domain ?? '_',
		};

		await ctx.app.db
			.insert( notification_settings )
			.values( newSetting )
			.run();

		result = newSetting as NotificationSetting;
	}

	return responseSuccess( result );
	/*=== f2c_end notifier_settings_update ===*/
};
