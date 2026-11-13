import { type LiWEApp, permissions_register, responseError } from '@backend/liwe3';
import {
	theme_add,
	theme_css,
	theme_del,
	theme_export,
	theme_get,
	theme_import,
	theme_list,
	theme_update,
} from './methods';
import { THEME_PERMISSIONS } from './perms';

export const module_init = async ( app : LiWEApp ) => {
	console.log( '=== Module: theme' );

	// Public: Get instance CSS
	app.hono.get( '/api/theme/instance.css', async ( c ) => {
		try {
			const domain = c.req.query( 'domain' );
			const res = await theme_css( app, { domain } );

			if ( !res.ok || !res.data?.css ) {
				return c.text( '/* no theme configured */', 200, {
					'Content-Type': 'text/css',
					'Cache-Control': 'public, max-age=300',
				} );
			}

			return c.text( res.data.css, 200, {
				'Content-Type': 'text/css',
				ETag: res.data.etag,
				'Cache-Control': 'public, max-age=300',
			} );
		} catch ( error ) {
			return c.text( '/* error generating theme */', 500 );
		}
	} );

	// Public: Get active theme JSON
	app.hono.get( '/api/theme/get', async ( c ) => {
		try {
			const domain = c.req.query( 'domain' );
			const res = await theme_get( app, { domain } );
			return c.json( res, res.status );
		} catch ( error ) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return c.json( responseError( errorMessage ) );
		}
	} );

	// Authenticated: List themes
	app.hono.get( '/api/theme/list', async ( c ) => {
		try {
			const domain = c.req.query( 'domain' );
			const res = await theme_list( app, { domain } );
			return c.json( res, res.status );
		} catch ( error ) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return c.json( responseError( errorMessage ) );
		}
	} );

	// Authenticated: Create theme
	app.hono.post( '/api/theme/add', async ( c ) => {
		try {
			const params = await c.req.json();
			const res = await theme_add( app, params );
			return c.json( res, res.status );
		} catch ( error ) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return c.json( responseError( errorMessage ) );
		}
	} );

	// Authenticated: Update theme
	app.hono.patch( '/api/theme/update', async ( c ) => {
		try {
			const params = await c.req.json();
			const res = await theme_update( app, params );
			return c.json( res, res.status );
		} catch ( error ) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return c.json( responseError( errorMessage ) );
		}
	} );

	// Authenticated: Delete theme
	app.hono.delete( '/api/theme/del', async ( c ) => {
		try {
			const params = await c.req.json();
			const res = await theme_del( app, params );
			return c.json( res, res.status );
		} catch ( error ) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return c.json( responseError( errorMessage ) );
		}
	} );

	// Authenticated: Import theme
	app.hono.post( '/api/theme/import', async ( c ) => {
		try {
			const params = await c.req.json();
			const res = await theme_import( app, params );
			return c.json( res, res.status );
		} catch ( error ) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return c.json( responseError( errorMessage ) );
		}
	} );

	// Authenticated: Export theme
	app.hono.get( '/api/theme/export', async ( c ) => {
		try {
			const id = parseInt( c.req.query( 'id' ) || '0' );
			const res = await theme_export( app, { id } );
			return c.json( res, res.status );
		} catch ( error ) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return c.json( responseError( errorMessage ) );
		}
	} );

	// Register permissions
	permissions_register( {
		module: 'theme',
		perms: THEME_PERMISSIONS,
	} );
};
