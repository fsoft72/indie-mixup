import { LOGGED, type LiWEApp, PUBLIC, permissions_register, routeBody, routeGet } from '@backend/liwe3';
import { notifier_add, notifier_dismiss, notifier_list, notifier_settings_delete, notifier_settings_get, notifier_settings_update, notifier_snooze } from './methods';
import { NOTIFIER_PERMISSIONS } from './perms';

/*=== f2c_start _module ===*/
import { listeners_init } from './listeners';
/*=== f2c_end _module ===*/

// Module initialization function
export const module_init = async ( app : LiWEApp ) => {
	console.log( '=== Module: notifier' );

	/*=== f2c_start module_init ===*/
	listeners_init( app );
	/*=== f2c_end module_init ===*/

	app.hono.post( '/api/notifier/add', routeBody( notifier_add, { perms: LOGGED } ) );

	app.hono.get( '/api/notifier/list', routeGet( notifier_list, { perms: LOGGED } ) );

	app.hono.post( '/api/notifier/dismiss', routeBody( notifier_dismiss, { perms: LOGGED } ) );

	app.hono.post( '/api/notifier/snooze', routeBody( notifier_snooze, { perms: LOGGED } ) );

	app.hono.delete( '/api/notifier/settings/delete', routeBody( notifier_settings_delete, { perms: LOGGED } ) );

	app.hono.get( '/api/notifier/settings/get', routeGet( notifier_settings_get, { perms: LOGGED } ) );

	app.hono.patch( '/api/notifier/settings/update', routeBody( notifier_settings_update, { perms: LOGGED } ) );

	// Register notifier module permissions
	permissions_register( {
		module: 'notifier',
		perms: NOTIFIER_PERMISSIONS,
	} );
};
