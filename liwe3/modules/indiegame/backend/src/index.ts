import { LOGGED, type LiWEApp, PUBLIC, permissions_register, routeBody, routeGet } from '@backend/liwe3';
import {
	indiegame_add,
	indiegame_admin_hide,
	indiegame_admin_remix_decide,
	indiegame_admin_report_close,
	indiegame_admin_reports,
	indiegame_del,
	indiegame_developer_get,
	indiegame_get,
	indiegame_list,
	indiegame_mine,
	indiegame_ranking_developers,
	indiegame_ranking_games,
	indiegame_remix_answer,
	indiegame_remix_inbox,
	indiegame_remix_report,
	indiegame_report,
	indiegame_track,
} from './methods';
import { INDIEGAME_PERMISSIONS, INDIEGAME_PERM_MODERATE } from './perms';

/*=== f2c_start _module ===*/

/*=== f2c_end _module ===*/

// Module initialization function
export const module_init = async ( app : LiWEApp ) => {
	console.log( '=== Module: indiegame' );

	/*=== f2c_start module_init ===*/

	/*=== f2c_end module_init ===*/

	app.hono.get( '/api/indiegame/list', routeGet( indiegame_list, { perms: PUBLIC } ) );

	app.hono.get( '/api/indiegame/get', routeGet( indiegame_get, { perms: PUBLIC } ) );

	app.hono.post( '/api/indiegame/track', routeBody( indiegame_track, { perms: PUBLIC } ) );

	app.hono.get( '/api/indiegame/ranking/games', routeGet( indiegame_ranking_games, { perms: PUBLIC } ) );

	app.hono.get( '/api/indiegame/ranking/developers', routeGet( indiegame_ranking_developers, { perms: PUBLIC } ) );

	app.hono.get( '/api/indiegame/developer/get', routeGet( indiegame_developer_get, { perms: PUBLIC } ) );

	app.hono.post( '/api/indiegame/add', routeBody( indiegame_add, { perms: LOGGED } ) );

	app.hono.delete( '/api/indiegame/del', routeBody( indiegame_del, { perms: LOGGED } ) );

	app.hono.get( '/api/indiegame/mine', routeGet( indiegame_mine, { perms: LOGGED } ) );

	app.hono.post( '/api/indiegame/report', routeBody( indiegame_report, { perms: LOGGED } ) );

	app.hono.post( '/api/indiegame/remix/report', routeBody( indiegame_remix_report, { perms: LOGGED } ) );

	app.hono.get( '/api/indiegame/remix/inbox', routeGet( indiegame_remix_inbox, { perms: LOGGED } ) );

	app.hono.post( '/api/indiegame/remix/answer', routeBody( indiegame_remix_answer, { perms: LOGGED } ) );

	app.hono.get( '/api/indiegame/admin/reports', routeGet( indiegame_admin_reports, { perms: [ INDIEGAME_PERM_MODERATE ] } ) );

	app.hono.post( '/api/indiegame/admin/hide', routeBody( indiegame_admin_hide, { perms: [ INDIEGAME_PERM_MODERATE ] } ) );

	app.hono.post( '/api/indiegame/admin/remix/decide', routeBody( indiegame_admin_remix_decide, { perms: [ INDIEGAME_PERM_MODERATE ] } ) );

	app.hono.post( '/api/indiegame/admin/report/close', routeBody( indiegame_admin_report_close, { perms: [ INDIEGAME_PERM_MODERATE ] } ) );

	// Register indiegame module permissions
	permissions_register( {
		module: 'indiegame',
		perms: INDIEGAME_PERMISSIONS,
	} );
};
