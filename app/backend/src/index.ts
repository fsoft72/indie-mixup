import { WorkerEntrypoint } from 'cloudflare:workers';
import { LiWEApp } from '@backend/liwe3';
import { app_init } from '@backend/liwe3/src/app';
import { module_init as user_init, module_seed as user_seed } from '@backend-modules/user';
import { module_init as tags_init } from '@backend-modules/tags';
import { module_init as indiegame_init } from '@backend-modules/indiegame';
import { module_init as system_init, module_seed as system_seed } from '@backend-modules/system';

import configJson from '../config.json';

let app : LiWEApp | null = null;
let initPromise : Promise<LiWEApp> | null = null;

const initializeApp = async ( env : Env ) : Promise<LiWEApp> => {
	console.log( '[APP] Starting initialization...' );

	app = app_init( 'app', env );

	try {
		app.loadConfigFromString( JSON.stringify( configJson ) );
		console.log( '[APP] Configuration loaded successfully' );
	} catch ( error ) {
		console.error( '[APP] Failed to load configuration:', error );
		throw error;
	}

	// Modules initialization - all async, executed sequentially via moduleRegister
	await app.moduleRegister( system_init, system_seed );
	await app.moduleRegister( user_init, user_seed );
	await app.moduleRegister( tags_init );
	await app.moduleRegister( indiegame_init );

	// Serve static files for non-API routes (fallback to index.html for SPA)
	app.hono.get( '/*', async ( c ) => {
		const path = c.req.path;
		if ( path.startsWith( '/api/' ) ) {
			return c.notFound();
		}

		try {
			const asset = await env.ASSETS.fetch( c.req.raw );
			if ( asset.status !== 404 ) {
				return asset;
			}
			return await env.ASSETS.fetch( new Request( new URL( '/index.html', c.req.url ).toString() ) );
		} catch {
			return c.notFound();
		}
	} );

	console.log( '[APP] Initialization completed successfully' );
	return app;
};

export default class App extends WorkerEntrypoint<Env> {
	async fetch ( _request : Request ) : Promise<Response> {
		if ( !initPromise ) {
			initPromise = initializeApp( this.env );
		}

		try {
			await initPromise;
			return await app!.hono.fetch( _request, this.env, this.ctx );
		} catch ( error ) {
			console.error( 'Error handling request:', error );
			return new Response( 'Internal Server Error', { status: 500 } );
		}
	}
}
