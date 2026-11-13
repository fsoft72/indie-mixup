import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { vi } from 'vitest';
import { type LiWECtx, type LiWEUser, liwe_event_register, responseError, responseSuccess } from '@backend/liwe3';

const DDL = readFileSync( new URL( '../sql/indiegame.sql', import.meta.url ), 'utf8' );

/** A real in-memory SQLite database with the indiegame tables, wired to Drizzle */
export const createDb = () => {
	const sqlite = new DatabaseSync( ':memory:' );
	sqlite.exec( DDL );

	const stats = { maxParams: 0 };

	const db = drizzle( async ( query, params, method ) => {
		stats.maxParams = Math.max( stats.maxParams, params.length );
		const stmt = sqlite.prepare( query );

		if ( method === 'run' ) {
			stmt.run( ...( params as any[] ) );
			return { rows: [] };
		}

		stmt.setReturnArrays( true );
		const rows = stmt.all( ...( params as any[] ) ) as unknown[][];

		// like D1, a `get` without a result gives no row at all
		return { rows: ( method === 'get' ? rows[0] : rows ) as any };
	} );

	return { db, sqlite, stats };
};

/** In-memory KV with the get/put/delete surface used by the module */
export const createKv = () => {
	const store = new Map<string, string>();

	return {
		store,
		get: vi.fn( async ( key : string ) => store.get( key ) ?? null ),
		put: vi.fn( async ( key : string, value : string ) => void store.set( key, value ) ),
		delete: vi.fn( async ( key : string ) => void store.delete( key ) ),
		list: vi.fn( async ( opts : { prefix? : string } = {} ) => ( {
			keys: [ ...store.keys() ].filter( ( k ) => k.startsWith( opts.prefix ?? '' ) ).map( ( name ) => ( { name } ) ),
		} ) ),
	};
};

export const mkUser = ( id : string, perms : string[] = [], domain = 'acme' ) : LiWEUser => ( {
	id,
	username: `user_${id}`,
	email: `${id}@example.com`,
	name: `Name ${id}`,
	lastname: `Last ${id}`,
	domain,
	perms,
} );

/** Request context for a user (null = anonymous) on top of a database */
export const mkCtx = ( db : any, user : LiWEUser | null, env : Record<string, unknown> = {}, headers : Record<string, string> = {} ) : LiWECtx => ( {
	app: { db, env, cfg: { system: { domain: 'acme' } } } as any,
	c: { req: { url: headers.url ?? 'http://localhost/api', header: ( name : string ) => headers[name.toLowerCase()] ?? headers[name] }, header: vi.fn() } as any,
	sessionId: user ? 's1' : null,
	session: async () => null,
	user: async () => user,
} );

/** Mutable behaviour of the stubbed calls to other modules (registered once per process) */
export const stubs = {
	githubIds: {} as Record<string, string>,
	notifications: [] as unknown[],
	/** Replaces fields of the user returned by user.get, by user id */
	userOverrides: {} as Record<string, Record<string, unknown>>,
};

let registered = false;

/** Registers stub handlers for the calls to the user and notifier modules */
export const registerStubs = () => {
	if ( registered ) return;
	registered = true;

	liwe_event_register( 'user.call.user.oauth_link', async ( _ctx, data : any ) => {
		const gh = stubs.githubIds[data.id_user];
		if ( !gh ) return responseError( 'OAuth link not found', 404, 'ERROR_OAUTH_LINK_NOT_FOUND' );

		return responseSuccess( { id_user: data.id_user, provider: 'github', provider_user_id: gh } );
	} );

	liwe_event_register( 'user.call.user.get', async ( _ctx, data : any ) =>
		responseSuccess( {
			id: data.id,
			username: `user_${data.id}`,
			name: `Name ${data.id}`,
			lastname: `Last ${data.id}`,
			email: 'hidden@example.com',
			...( stubs.userOverrides[data.id] ?? {} ),
		} ) );

	liwe_event_register( 'notifier.call.create', async ( _ctx, data : unknown ) => {
		stubs.notifications.push( data );

		return responseSuccess( { id: 'n1' } );
	} );
};

/** Stubs `fetch` so GitHub answers with a repo owned by the given GitHub user id */
export const stubGithubRepo = ( repos : Record<string, { id : number; ownerId : number; ownerType? : string; isPrivate? : boolean }> ) => {
	vi.stubGlobal(
		'fetch',
		vi.fn( async ( url : string ) => {
			const key = url.replace( 'https://api.github.com/repos/', '' ).toLowerCase();
			const repo = repos[key];
			if ( !repo ) return new Response( '{}', { status: 404 } );

			return new Response(
				JSON.stringify( {
					id: repo.id,
					private: repo.isPrivate ?? false,
					html_url: `https://github.com/${key}`,
					owner: { id: repo.ownerId, type: repo.ownerType ?? 'User' },
				} ),
				{ status: 200 },
			);
		} ),
	);
};

/** Inserts a game row directly (explicit timestamps keep ordering tests deterministic) */
export const insertGame = ( sqlite : DatabaseSync, g : Partial<Record<string, string | number | null>> & { id : string } ) => {
	const row = {
		domain: 'acme',
		id_user: 'u1',
		name: `Game ${g.id}`,
		description: 'desc',
		repo_url: `https://github.com/x/${g.id}`,
		repo_id: `rid-${g.id}`,
		screenshots: '["s.png"]',
		gallery: null,
		video_urls: null,
		id_remix_of: null,
		remix_locked: 0,
		status: 'visible',
		created: '2026-01-01 10:00:00',
		...g,
	};
	const cols = Object.keys( row );
	sqlite.prepare( `INSERT INTO indiegame_games (${cols.join( ',' )}) VALUES (${cols.map( () => '?' ).join( ',' )})` ).run( ...Object.values( row ) as any[] );
};

/** Inserts an event row directly (explicit id and day keep window tests deterministic) */
export const insertEvent = ( sqlite : DatabaseSync, e : { id : string; id_game : string; kind? : string; day : string; domain? : string } ) => {
	sqlite.prepare( 'INSERT INTO indiegame_events (id, domain, id_game, kind, day, visitor) VALUES (?, ?, ?, ?, ?, ?)' )
		.run( e.id, e.domain ?? 'acme', e.id_game, e.kind ?? 'view', e.day, `v-${e.id}` );
};
