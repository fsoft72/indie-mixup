import { LOGGED, type LiWEApp, permissions_register, routeBody, routeGet } from '@backend/liwe3';
import { comment_add, comment_del, comments_list } from './methods';
import { COMMENT_PERMISSIONS } from './perms';

// NOTE: this module has no work/modules/comment.json, so it is not regenerated
// by flow2code. The route gates below are hand-maintained. comment_del keeps its
// "permission OR owner" check in-method (the gate is only the necessary minimum).

/*=== f2c_start _module ===*/
import { listeners_init } from './listeners';
/*=== f2c_end _module ===*/

// Module initialization function
export const module_init = async ( app : LiWEApp ) => {
	console.log( '=== Module: comment' );

	/*=== f2c_start module_init ===*/
	listeners_init( app );
	/*=== f2c_end module_init ===*/

	app.hono.get( '/api/comments/list', routeGet( comments_list, { perms: LOGGED } ) );

	app.hono.post( '/api/comment/add', routeBody( comment_add, { perms: LOGGED } ) );

	app.hono.delete( '/api/comment/del', routeBody( comment_del, { perms: LOGGED } ) );

	// Register comment module permissions
	permissions_register( {
		module: 'comment',
		perms: COMMENT_PERMISSIONS,
	} );
};
