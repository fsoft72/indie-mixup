import { LOGGED, type LiWEApp, PUBLIC, permissions_register, routeBody, routeGet } from '@backend/liwe3';
import { wallet_balance, wallet_create, wallet_credit, wallet_debit, wallet_del, wallet_edit, wallet_get, wallet_list, wallet_transaction_list, wallet_transfer } from './methods';
import { WALLET_PERMISSIONS, WALLET_PERM_CREATE, WALLET_PERM_DELETE, WALLET_PERM_EDIT, WALLET_PERM_TRANSACT, WALLET_PERM_TRANSFER } from './perms';

/*=== f2c_start _module ===*/
import { listeners_init } from './listeners';
/*=== f2c_end _module ===*/

// Module initialization function
export const module_init = async ( app : LiWEApp ) => {
	console.log( '=== Module: wallet' );

	/*=== f2c_start module_init ===*/
	listeners_init();
	/*=== f2c_end module_init ===*/

	app.hono.post( '/api/wallet/create', routeBody( wallet_create, { perms: [ WALLET_PERM_CREATE ] } ) );

	app.hono.get( '/api/wallet/list', routeGet( wallet_list, { perms: LOGGED } ) );

	app.hono.get( '/api/wallet/get', routeGet( wallet_get, { perms: LOGGED } ) );

	app.hono.patch( '/api/wallet/edit', routeBody( wallet_edit, { perms: [ WALLET_PERM_EDIT ] } ) );

	app.hono.delete( '/api/wallet/del', routeBody( wallet_del, { perms: [ WALLET_PERM_DELETE ] } ) );

	app.hono.post( '/api/wallet/credit', routeBody( wallet_credit, { perms: [ WALLET_PERM_TRANSACT ] } ) );

	app.hono.post( '/api/wallet/debit', routeBody( wallet_debit, { perms: [ WALLET_PERM_TRANSACT ] } ) );

	app.hono.post( '/api/wallet/transfer', routeBody( wallet_transfer, { perms: [ WALLET_PERM_TRANSFER ] } ) );

	app.hono.get( '/api/wallet/transaction/list', routeGet( wallet_transaction_list, { perms: LOGGED } ) );

	app.hono.get( '/api/wallet/balance', routeGet( wallet_balance, { perms: LOGGED } ) );

	// Register wallet module permissions
	permissions_register( {
		module: 'wallet',
		perms: WALLET_PERMISSIONS,
	} );
};
