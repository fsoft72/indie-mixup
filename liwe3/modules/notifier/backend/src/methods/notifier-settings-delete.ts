import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for ## Delete a Notification Setting

Deletes a notification preference setting by ID. Only the owner of the setting can delete it.

### Behavior

- Verifies the setting exists and belongs to the authenticated user
- Removes the `NotificationSetting` record from the database
- Returns `true` on successful deletion
- Returns 404 if the setting does not exist or does not belong to the user

### Authorization

- The user can only delete settings belonging to them (`id_user` must match the authenticated user)
- Domain scoping is enforced

### Example Request Body

```json
{
  "id": "nts_abc123"
}
```

### Returns

`true` if the setting was successfully deleted.
 *
 * @property {string} id - Setting ID to delete (required)
 */
const NotifierSettingsDeleteSchema = z.object( {
	id: z.string(),
} );

/** Parameters for notifier_settings_delete */
export type NotifierSettingsDeleteParams = z.infer<typeof NotifierSettingsDeleteSchema>;

/*=== f2c_start notifier_settings_delete_headers ===*/
import { notification_settings } from '../schema';
import { has_perms } from '@backend/liwe3';
import { NOTIFIER_PERM_SETTINGS_DELETE } from '../perms';
/*=== f2c_end notifier_settings_delete_headers ===*/

/**
 * ## Delete a Notification Setting
 *
 * Deletes a notification preference setting by ID. Only the owner of the setting can delete it.
 *
 * ### Behavior
 *
 * - Verifies the setting exists and belongs to the authenticated user
 * - Removes the `NotificationSetting` record from the database
 * - Returns `true` on successful deletion
 * - Returns 404 if the setting does not exist or does not belong to the user
 *
 * ### Authorization
 *
 * - The user can only delete settings belonging to them (`id_user` must match the authenticated user)
 * - Domain scoping is enforced
 *
 * ### Example Request Body
 *
 * ```json
 * {
 *   "id": "nts_abc123"
 * }
 * ```
 *
 * ### Returns
 *
 * `true` if the setting was successfully deleted.
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {NotifierSettingsDeleteParams} params - Request parameters
 * @param {string} params.id - Setting ID to delete
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<boolean>>} Result object with success status and data or error details
 */
export const notifier_settings_delete = async ( ctx : LiWECtx, params : NotifierSettingsDeleteParams, sys? : LiWESysParams ) : Promise<LiWEResponse<boolean>> => {
	const validation = paramsValidation<NotifierSettingsDeleteParams>( NotifierSettingsDeleteSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { id } = validation.data;

	/*=== f2c_start notifier_settings_delete ===*/
	const user = await ctx.user();
	if ( !user ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );
	if ( !await has_perms( ctx, [ NOTIFIER_PERM_SETTINGS_DELETE ] ) ) return responseError( 'Unauthorized', 401, 'UNAUTHORIZED' );

	// Verify setting exists and belongs to user
	const existing = await ctx.app.db
		.select()
		.from( notification_settings )
		.where(
			and(
				eq( notification_settings.id, id ),
				eq( notification_settings.id_user, user.id ),
				eq( notification_settings.domain, user.domain ?? '_' ),
			),
		)
		.get();

	if ( !existing ) return responseError( 'Setting not found', 404, 'NOT_FOUND' );

	await ctx.app.db
		.delete( notification_settings )
		.where( eq( notification_settings.id, id ) )
		.run();

	return responseSuccess( true );
	/*=== f2c_end notifier_settings_delete ===*/
};
