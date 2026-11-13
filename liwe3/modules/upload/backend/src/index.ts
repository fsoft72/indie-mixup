import { LOGGED, type LiWEApp, PUBLIC, permissions_register, routeBody, routeGet, routeRaw } from '@backend/liwe3';
import { upload_abort, upload_complete, upload_del, upload_get, upload_initiate, upload_list, upload_part } from './methods';
import { UPLOAD_PERMISSIONS } from './perms';

/*=== f2c_start _module ===*/

// Re-exported so other backend modules can build a valid Upload-module
// file key when writing a file directly to the R2 bucket (e.g. a
// generation provider storing a downloaded video), without duplicating
// the key format.
export { keyBuild } from './methods/utils';
import { listeners_init } from './listeners';
/*=== f2c_end _module ===*/

// Module initialization function
export const module_init = async ( app : LiWEApp ) => {
	console.log( '=== Module: upload' );

	/*=== f2c_start module_init ===*/
	listeners_init( app );

	// Dynamically imported so merely importing this module (e.g. for the
	// re-exported keyBuild) doesn't eagerly load the thumbnailer's WASM
	// image codecs, which only work in the Workers runtime.
	const { queue_init } = await import( './queue' );
	queue_init( app );
	/*=== f2c_end module_init ===*/

	// Phase 1 (Kanban): every logged user uploads and deletes files of their own domain (work/modules/upload.json).
	// The methods refuse keys and folders of another domain (keyInDomain).
	app.hono.post( '/api/upload/initiate', routeBody( upload_initiate, { perms: LOGGED } ) );

	// routeRaw, not routeBody: upload_part reads the raw binary body via ctx.c.req.arrayBuffer(),
	// which a JSON parse in routeBody would consume and corrupt.
	app.hono.post( '/api/upload/part', routeRaw( upload_part, { perms: LOGGED } ) );

	app.hono.post( '/api/upload/complete', routeBody( upload_complete, { perms: LOGGED } ) );

	app.hono.post( '/api/upload/abort', routeBody( upload_abort, { perms: LOGGED } ) );

	app.hono.get( '/api/upload/list', routeGet( upload_list, { perms: LOGGED } ) );

	app.hono.delete( '/api/upload/del', routeBody( upload_del, { perms: LOGGED } ) );

	app.hono.get( '/api/upload/get', routeGet( upload_get, { perms: PUBLIC } ) );

	// Register upload module permissions
	permissions_register( {
		module: 'upload',
		perms: UPLOAD_PERMISSIONS,
	} );
};
