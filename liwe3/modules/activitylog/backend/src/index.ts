import { LOGGED, type LiWEApp, PUBLIC, permissions_register, routeBody, routeGet } from '@backend/liwe3';
import { activity_log_add, activity_log_clear, activity_log_del, activity_log_list } from './methods';
import { ACTIVITYLOG_PERMISSIONS, ACTIVITYLOG_PERM_EVENT_ADD, ACTIVITYLOG_PERM_EVENT_DEL, ACTIVITYLOG_PERM_EVENT_VIEW } from './perms';

/*=== f2c_start _module ===*/
import { listeners_init } from './listeners';
/*=== f2c_end _module ===*/

// Module initialization function
export const module_init = async ( app : LiWEApp ) => {
	console.log( '=== Module: activitylog' );

	/*=== f2c_start module_init ===*/
	listeners_init( app );
	/*=== f2c_end module_init ===*/

	app.hono.get( '/api/activity_log/list', routeGet( activity_log_list, { perms: [ ACTIVITYLOG_PERM_EVENT_VIEW ] } ) );

	app.hono.post( '/api/activity_log/add', routeBody( activity_log_add, { perms: [ ACTIVITYLOG_PERM_EVENT_ADD ] } ) );

	app.hono.delete( '/api/activity_log/del', routeBody( activity_log_del, { perms: [ ACTIVITYLOG_PERM_EVENT_DEL ] } ) );

	app.hono.delete( '/api/activity_log/clear', routeBody( activity_log_clear, { perms: [ ACTIVITYLOG_PERM_EVENT_DEL ] } ) );

	// Register activitylog module permissions
	permissions_register( {
		module: 'activitylog',
		perms: ACTIVITYLOG_PERMISSIONS,
	} );
};
