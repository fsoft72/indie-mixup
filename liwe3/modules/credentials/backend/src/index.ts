import { LOGGED, type LiWEApp, PUBLIC, permissions_register, routeBody, routeGet } from '@backend/liwe3';
import { credentials_add, credentials_del, credentials_edit, credentials_list } from './methods';
import { CREDENTIALS_PERMISSIONS, CREDENTIALS_PERM_CREATE, CREDENTIALS_PERM_DELETE } from './perms';

/*=== f2c_start _module ===*/

export { get_domain_secret, type DomainSecret } from './secret';

/*=== f2c_end _module ===*/

// Module initialization function
export const module_init = async ( app : LiWEApp ) => {
	console.log( '=== Module: credentials' );

	/*=== f2c_start module_init ===*/

	/*=== f2c_end module_init ===*/

	app.hono.post( '/api/credentials/add', routeBody( credentials_add, { perms: [ CREDENTIALS_PERM_CREATE ] } ) );

	app.hono.patch( '/api/credentials/edit', routeBody( credentials_edit, { perms: [ CREDENTIALS_PERM_CREATE ] } ) );

	app.hono.delete( '/api/credentials/del', routeBody( credentials_del, { perms: [ CREDENTIALS_PERM_DELETE ] } ) );

	app.hono.get( '/api/credentials/list', routeGet( credentials_list, { perms: LOGGED } ) );

	// Register credentials module permissions
	permissions_register( {
		module: 'credentials',
		perms: CREDENTIALS_PERMISSIONS,
	} );
};
