import { LOGGED, type LiWEApp, PUBLIC, permissions_register, routeBody, routeGet } from '@backend/liwe3';
import {
	system_admin_config_fields,
	system_admin_config_reset,
	system_admin_config_set,
	system_admin_domain_add,
	system_admin_domain_create_root,
	system_admin_domain_del,
	system_admin_domains_list,
	system_admin_permissions_list,
	system_domain_create_invite,
	system_domain_subdomain_create,
	system_domain_subdomain_list_managed,
	system_domain_user_assign_role,
	system_domains_list,
	system_email_test,
	system_uptime,
} from './methods';
import { SYSTEM_PERMISSIONS, SYSTEM_PERM_DOMAIN, SYSTEM_PERM_MULTI_TIER, SYSTEM_PERM_MULTI_TIER_CREATE_SUB } from './perms';

/*=== f2c_start _module ===*/
import { listeners_init } from './listeners';
import { system_create_default_domain } from './internals';
import { systemConfigOverridesRefresh } from './config-overrides';
// Hand-maintained: /system/admin/test/{enter,exit} are not in system.json.
// They drive the useTestDB() dev switch and are slated for removal together
// with it (see P0-6); kept here so regeneration does not drop them.
import { system_test_enter, system_test_exit } from './methods';

/**
 * Data-only initialization: creates default domain.
 * Does NOT register routes. Used for test DB re-seeding.
 */
export const module_seed = async ( app : LiWEApp ) => {
	console.log( '    [seed] system: default domain' );
	await system_create_default_domain( app );
};
/*=== f2c_end _module ===*/

// Module initialization function
export const module_init = async ( app : LiWEApp ) => {
	console.log( '=== Module: system' );

	/*=== f2c_start module_init ===*/
	listeners_init( app );
	system_create_default_domain( app );

	// Runtime config overrides: load them now, then keep them fresh (cached, see config-overrides.ts).
	// Registered before the routes so every /api request sees the current values.
	await systemConfigOverridesRefresh( app, { force: true } );
	app.hono.use( '/api/*', async ( _c, next ) => {
		await systemConfigOverridesRefresh( app );
		await next();
	} );

	// hand-maintained routes (not in system.json), see the _module import note
	app.hono.post( '/api/system/admin/test/enter', routeBody( system_test_enter, { perms: [ 'system.admin' ] } ) );
	app.hono.post( '/api/system/admin/test/exit', routeBody( system_test_exit, { perms: [ 'system.admin' ] } ) );
	/*=== f2c_end module_init ===*/

	app.hono.get( '/api/system/domains/list', routeGet( system_domains_list, { perms: [ SYSTEM_PERM_DOMAIN ] } ) );

	app.hono.post( '/api/system/admin/domain/add', routeBody( system_admin_domain_add, { perms: [ SYSTEM_PERM_DOMAIN ] } ) );

	app.hono.delete( '/api/system/admin/domain/del', routeBody( system_admin_domain_del, { perms: [ SYSTEM_PERM_DOMAIN ] } ) );

	app.hono.get( '/api/system/admin/domains/list', routeGet( system_admin_domains_list, { perms: [ SYSTEM_PERM_DOMAIN ] } ) );

	app.hono.post( '/api/system/email/test', routeBody( system_email_test, { perms: LOGGED } ) );

	app.hono.get( '/api/system/admin/permissions/list', routeGet( system_admin_permissions_list, { perms: LOGGED } ) );

	app.hono.get( '/api/system/domain/create/invite', routeGet( system_domain_create_invite, { perms: LOGGED } ) );

	app.hono.get( '/api/system/uptime', routeGet( system_uptime, { perms: PUBLIC } ) );

	app.hono.post( '/api/system/admin/domain/create_root', routeBody( system_admin_domain_create_root, { perms: [ 'system.admin' ] } ) );

	app.hono.post( '/api/system/domain/subdomain/create', routeBody( system_domain_subdomain_create, { perms: [ SYSTEM_PERM_MULTI_TIER_CREATE_SUB ] } ) );

	app.hono.get( '/api/system/domain/subdomain/list_managed', routeGet( system_domain_subdomain_list_managed, { perms: [ SYSTEM_PERM_MULTI_TIER ] } ) );

	app.hono.post( '/api/system/domain/user/assign_role', routeBody( system_domain_user_assign_role, { perms: [ SYSTEM_PERM_MULTI_TIER_CREATE_SUB ] } ) );

	app.hono.get( '/api/system/admin/config/fields', routeGet( system_admin_config_fields, { perms: [ 'system.admin' ] } ) );

	app.hono.post( '/api/system/admin/config/set', routeBody( system_admin_config_set, { perms: [ 'system.admin' ] } ) );

	app.hono.post( '/api/system/admin/config/reset', routeBody( system_admin_config_reset, { perms: [ 'system.admin' ] } ) );

	// Register system module permissions
	permissions_register( {
		module: 'system',
		perms: SYSTEM_PERMISSIONS,
	} );
};
