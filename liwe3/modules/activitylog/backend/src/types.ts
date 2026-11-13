import { z } from 'zod';
import { zodBoolean } from '@backend/liwe3';

/*=== f2c_start __types ===*/

/*=== f2c_end __types ===*/

/**
 * Schema for ActivityLogEvent
 *
 * @property {str} id -  main ID (required, max 64 chars)
 * @property {[str]} id_user - User ID (if any) (max 64 chars)
 * @property {str} event - The event description (required)
 * @property {[none]} data - Event data object
 * @property {str} module - The module name (required)
 * @property {str} domain - domain field (required)
 * @property {[str]} id_obj - Id of the object the event is about (e.g. a kanban card), used to list the events of one object (max 64 chars)
 * @property {datetime} created - Creation timestamp (required)
 */
const ZActivityLogEvent = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ).optional(),
	event: z.string(),
	data: z.any().optional(),
	module: z.string(),
	domain: z.string(),
	id_obj: z.string().max( 64, 'Id_obj must be at most 64 characters' ).optional(),
	created: z.coerce.date(),
} );

export type ActivityLogEvent = z.infer<typeof ZActivityLogEvent>;
export { ZActivityLogEvent };
