import { LiWEApp, type LiWECtx, LiWEResponse, liwe_event_emit, liwe_event_register, mkid, responseError, responseSuccess } from '@backend/liwe3';
import { notification_settings, notifications } from './schema';
import { NOTIFIER_CALL_CREATE, NOTIFIER_EVENT_CREATED } from './events';
import { z } from 'zod';
import { logger } from '@backend/liwe3/src/logger';
import { and, eq } from 'drizzle-orm';

export const ZNotificationCreateSchema = z.object( {
	id_user: z.string().max( 64 ),
	event_type: z.string(),
	title: z.string(),
	message: z.string(),
	notification_type: z.enum( [ 'info', 'success', 'warning', 'error' ] ).optional().default( 'info' ),
	data: z.any().optional(),
	domain: z.string(),
} );

/**
 * Check if user has notifications enabled for this event type
 */
const is_notification_enabled = async ( ctx : LiWECtx, id_user : string, event_type : string, domain : string ) : Promise<boolean> => {
	const setting = await ctx.app.db
		.select()
		.from( notification_settings )
		.where(
			and(
				eq( notification_settings.id_user, id_user ),
				eq( notification_settings.event_type, event_type ),
				eq( notification_settings.domain, domain ),
			),
		)
		.get();

	// If no setting exists, default to enabled
	if ( !setting ) return true;

	return setting.enabled;
};

/**
 * Create a notification in the database
 */
const create_notification = async ( ctx : LiWECtx, data : any ) => {
	logger.debug( 'Creating notification:', data );

	// Check if user has this notification type enabled
	const enabled = await is_notification_enabled( ctx, data.id_user, data.event_type, data.domain );

	if ( !enabled ) {
		logger.debug( `Notification skipped - user has disabled event_type: ${data.event_type}` );
		return null;
	}

	const notification = {
		id: mkid( 'ntf' ),
		id_user: data.id_user,
		event_type: data.event_type,
		title: data.title,
		message: data.message,
		notification_type: data.notification_type || 'info',
		status: 'pending',
		data: data.data,
		domain: data.domain,
	};

	await ctx.app.db.insert( notifications ).values( notification ).run();

	return notification;
};

export const listeners_init = ( app : LiWEApp ) => {
	console.log( '    - listeners' );

	/**
	 * Event listener for creating notifications
	 * Other modules can emit NOTIFIER_CALL_CREATE to create a notification
	 */
	liwe_event_register( NOTIFIER_CALL_CREATE, async ( ctx : LiWECtx, event_data : any ) => {
		const validated : any = ZNotificationCreateSchema.safeParse( event_data );

		if ( !validated.success ) {
			logger.error( 'Invalid notification data:', validated.error.message );
			return responseError( validated.error.message, 400, 'ERROR_INVALID_NOTIFICATION_DATA' );
		}

		const notification = await create_notification( ctx, validated.data );

		if ( !notification ) {
			return responseSuccess( { skipped: true, reason: 'User has disabled this notification type' } );
		}

		// Emit event that notification was created
		// This could be used by other modules (e.g., WebSocket service) to push real-time notifications
		await liwe_event_emit( ctx, NOTIFIER_EVENT_CREATED, notification );

		return responseSuccess( notification );
	} );
};
