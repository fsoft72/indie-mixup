import { z } from 'zod';
import { zodBoolean } from '@backend/liwe3';

/*=== f2c_start __types ===*/

/*=== f2c_end __types ===*/

/**
 * Schema for Notification
 *
 * @property {str} id - main ID (required, max 64 chars)
 * @property {str} id_user - User ID who should receive this notification (required, max 64 chars)
 * @property {str} event_type - Event type that triggered this notification (required)
 * @property {str} title - Notification title (required)
 * @property {str} message - Notification message (required)
 * @property {str} status - Status: 'pending', 'dismissed', 'snoozed', 'shown' (required, max 20 chars)
 * @property {[num]} snooze_until - Snooze until timestamp (null if not snoozed)
 * @property {[none]} data - Additional data as JSON
 * @property {str} notification_type - Notification type for UI: 'info', 'success', 'warning', 'error' (required, max 20 chars)
 * @property {str} domain - Domain field for multi-tenancy (required)
 * @property {datetime} created - Notification created date (required)
 * @property {datetime} updated - Notification updated date (required)
 */
const ZNotification = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	event_type: z.string(),
	title: z.string(),
	message: z.string(),
	status: z.string().max( 20, 'Status must be at most 20 characters' ),
	snooze_until: z.coerce.number().optional(),
	data: z.any().optional(),
	notification_type: z.string().max( 20, 'Notification_type must be at most 20 characters' ),
	domain: z.string(),
	created: z.coerce.date(),
	updated: z.coerce.date(),
} );

export type Notification = z.infer<typeof ZNotification>;
export { ZNotification };

/**
 * Schema for NotificationSetting
 *
 * @property {str} id - main ID (required, max 64 chars)
 * @property {str} id_user - User ID (required, max 64 chars)
 * @property {str} event_type - Event type to configure (required)
 * @property {bool} enabled - Whether this event type is enabled for notifications (required)
 * @property {str} domain - Domain field for multi-tenancy (required)
 */
const ZNotificationSetting = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	event_type: z.string(),
	enabled: zodBoolean.default( false ),
	domain: z.string(),
} );

export type NotificationSetting = z.infer<typeof ZNotificationSetting>;
export { ZNotificationSetting };
