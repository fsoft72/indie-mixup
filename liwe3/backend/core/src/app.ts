import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { DrizzleD1Database, drizzle } from 'drizzle-orm/d1';
import { KVNamespace, Message } from '@cloudflare/workers-types';
import { ctxMiddleware } from './session';
import { AppConfig, ConfigLoadResult, configApplyOverrides, configLoadFromJSON } from './config';
import { setDBSecret } from './db';
import { LiWECtx, ctxSystem } from './ctx';
import type { HonoEnv } from './ctx';
import { configureLogger, logger } from './logger';
import { requestLoggerMiddleware } from './middleware/request-logger';
import { userContextMiddleware } from './middleware/user-context';
import { routeGet } from './routes';
import { collectRouteList, publicRoutes } from './route-map';
import { responseSuccess } from './response';

/**
 * Variables available on the Hono context.
 * `ctx` is the per-request LiWECtx: it is the ONLY place where request state lives.
 *
 * Canonical definition lives in `ctx.ts` as `HonoEnv['Variables']`; re-exported
 * here for backward compatibility.
 */
export type Variables = HonoEnv['Variables'];

export class LiWEApp {
	private _env : any = null;
	private _hono : Hono<HonoEnv>;
	private _db : DrizzleD1Database | null = null;
	private _cfg : AppConfig = {} as AppConfig;
	/** The config as resolved from the loaded JSON, before any runtime override */
	private _baseCfg : AppConfig = {} as AppConfig;
	private _queueActions : Record<string, ( ctx : LiWECtx, message : Message ) => Promise<void>> = {};

	private _testMode : boolean = false;
	private _originalDB : any = null;
	private _moduleInits : Array<( app : LiWEApp ) => Promise<void>> = [];
	private _moduleSeeders : Array<( app : LiWEApp ) => Promise<void>> = [];

	constructor ( public name : string, env : any = null, configPath? : string ) {
		this._env = env;
		this._hono = new Hono<HonoEnv>();
		this._loadConfig( configPath );
	}

	get isDev() {
		if ( this._env?.DEV_MODE === 'true' ) return true;
		if ( !!( globalThis as any ).MINIFLARE ) return true;
		return false;
	}

	get env() {
		return this._env;
	}

	get cfg() : AppConfig {
		return this._cfg;
	}

	/**
	 * Access to the logger instance
	 * Available methods: debug, info, warn, error, fatal, always
	 * @example
	 * app.log.info('Operation completed', { userId: 123 });
	 * app.log.error('Failed to process', error, { context: 'payment' });
	 */
	get log() {
		return logger;
	}

	get db() {
		if ( !this._db ) {
			if ( !this._env || !this._env.DB ) {
				throw new Error( 'Environment or DB is not set' );
			}
			this._db = drizzle( this._env.DB );
		}
		// console.log( "=== DB: ", this._db );
		return this._db;
	}

	get kv() : KVNamespace {
		if ( !this._env || !this._env.KV ) {
			throw new Error( 'Environment or KV is not set' );
		}
		return this._env.KV;
	}

	get hono() {
		return this._hono;
	}

	/** Whether the app is currently using the test database */
	get isTestMode() {
		return this._testMode;
	}

	get fetch() {
		return this._hono.fetch;
	}

	/**
	 * Initializes configuration with empty defaults
	 *
	 * In Cloudflare Workers, configuration files must be imported at build time.
	 * Use loadConfigFromString() to load actual configuration data.
	 *
	 * @param configPath - Path to the configuration JSON file (for logging purposes)
	 */
	private _loadConfig ( configPath? : string ) {
		if ( !configPath ) {
			configPath = './config.json';
		}

		console.log( `[CONFIG] Initializing configuration system (path reference: ${configPath})` );
		console.log( '[CONFIG] Use loadConfigFromString() to load actual configuration data' );

		// Initialize with empty config - actual config loaded via loadConfigFromString()
		this._cfg = {} as AppConfig;
	}

	/**
	 * Loads configuration from JSON string with template resolution
	 *
	 * @param jsonString - JSON configuration string
	 * @param options - Template resolution options
	 */
	loadConfigFromString ( jsonString : string, options? : any ) : ConfigLoadResult<AppConfig> {
		try {
			// A missing {{VAR}} no longer throws: configLoad falls back to the
			// variable name as a placeholder and warns (per variable). Only a
			// genuinely malformed config JSON reaches the catch below.
			const result = configLoadFromJSON<AppConfig>( jsonString, {
				env: this._env,
				...options,
			} );

			this._baseCfg = result.config;
			this._cfg = result.config;

			if ( result.resolvedVariables.length > 0 ) {
				console.log( `[CONFIG] Resolved template variables: ${result.resolvedVariables.join( ', ' )}` );
			}

			if ( result.missingVariables.length > 0 ) {
				console.warn( `[CONFIG] Missing template variables (using their names as placeholders): ${result.missingVariables.join( ', ' )}` );
			}

			this._configureLogger();

			// Configure DB secret for obfuscation column types
			if ( this._cfg.db?.secret ) {
				setDBSecret( this._cfg.db.secret );
			} else {
				console.warn( '[CONFIG] db.secret not set - secret/secretjson column types will fail at runtime' );
			}

			// Warn if SES is in debug mode
			if ( this._cfg.ses?.access_key === 'debug' ) {
				console.warn( '\x1b[33m⚠  [SES] Debug mode active — emails will NOT be sent, only logged to console.\x1b[0m' );
			}

			return result;
		} catch ( error ) {
			console.error( '[CONFIG] Failed to load configuration:', error );
			throw error;
		}
	}

	/**
	 * Rebuilds `cfg` as the config loaded from the JSON plus the given runtime overrides,
	 * then reconfigures the logger (the only consumer that reads the config just once).
	 * An empty object restores the values of the JSON.
	 *
	 * @param overrides - Dotted path to value (e.g. `{ 'site.name': 'Fatto' }`)
	 */
	applyConfigOverrides ( overrides : Record<string, unknown> ) : void {
		this._cfg = configApplyOverrides( this._baseCfg, overrides );
		this._configureLogger();
	}

	/** Configures the logger from the current `log` section of the config */
	private _configureLogger () : void {
		configureLogger( {
			minLevel: this._cfg.log?.level ?? 'info',
			includeStack: this._cfg.log?.includeStack ?? true,
			prettyPrint: this._cfg.log?.prettyPrint ?? this.isDev,
		} );
	}

	setEnv ( env : any ) {
		// Set environment variables or configurations here
		this._env = env;
	}

	/**
	 * Registers and executes a module init function.
	 * Optionally stores a seed function for replaying data initialization (without route registration).
	 *
	 * @param initFn - Full module init (routes + data). Called immediately.
	 * @param seedFn - Data-only init (default domain, default users, etc.). Stored for replay on test DB clean.
	 */
	async moduleRegister ( initFn : ( app : LiWEApp ) => Promise<void>, seedFn? : ( app : LiWEApp ) => Promise<void> ) {
		this._moduleInits.push( initFn );
		await initFn( this );
		if ( seedFn ) {
			this._moduleSeeders.push( seedFn );
		}
	}

	/**
	 * Dev-only: logs the PUBLIC `/api` routes at boot so an accidental one is
	 * spotted immediately. Call once, after every module has registered.
	 */
	logPublicRoutesOnBoot () {
		if ( !this.isDev ) return;
		const pub = publicRoutes( this._hono.routes );
		logger.info( `Public API routes (${pub.length})`, { module: 'core', method: 'boot', routes: pub } );
	}

	/**
	 * Switches the active database to DB_TEST.
	 * All subsequent app.db accesses will use the test database.
	 */
	useTestDB () {
		if ( !this.isDev ) throw new Error( 'useTestDB() is forbidden outside development' );

		if ( !this._env?.DB_TEST ) {
			throw new Error( 'DB_TEST binding is not configured in wrangler.jsonc' );
		}

		this._originalDB = this._env.DB;
		this._env.DB = this._env.DB_TEST;
		this._db = null; // Force lazy re-initialization
		this._testMode = true;

		console.log( '\x1b[41m\x1b[37m\x1b[1m ⚠  DATABASE SWITCHED TO TEST MODE ⚠  \x1b[0m' );
		console.log( '\x1b[33m    All queries now target DB_TEST. Restart wrangler dev to restore.\x1b[0m' );
		console.log( '\x1b[33m    Reminder: after new migrations, run: wrangler d1 migrations apply playground-test --local\x1b[0m' );
	}

	/**
	 * Restores the active database to the original DB binding.
	 */
	useMainDB () {
		if ( !this._originalDB ) {
			console.warn( 'useMainDB() called but no original DB was saved — already on main DB?' );
			return;
		}

		this._env.DB = this._originalDB;
		this._originalDB = null;
		this._db = null; // Force lazy re-initialization
		this._testMode = false;

		console.log( '\x1b[42m\x1b[37m\x1b[1m ✓  DATABASE RESTORED TO MAIN \x1b[0m' );
	}

	/**
	 * Replays all registered module seed functions.
	 * Used after wiping the test database to recreate default data.
	 */
	async replayModuleSeeders () {
		console.log( '[TEST] Replaying module seeders...' );
		for ( const seedFn of this._moduleSeeders ) {
			await seedFn( this );
		}
		console.log( '[TEST] Module seeders completed.' );
	}

	/**
	 * Registers a queue action handler.
	 * Queue messages run outside any HTTP request, so the handler receives a system ctx.
	 *
	 * @param action - The action name matched against `message.body.action`
	 * @param queueAction - Handler invoked with a system LiWECtx and the message
	 */
	queueAdd ( action : string, queueAction : ( ctx : LiWECtx, message : Message ) => Promise<void> ) {
		this._queueActions[action] = queueAction;
	}

	async queueExec ( message : Message ) {
		const action = ( message.body as any ).action;
		if ( !action ) {
			console.warn( 'WARN: no action in queue message' );
			return;
		}

		const act = this._queueActions[action];
		if ( !act ) {
			console.warn( 'WARN: no action queue for ', action );
			return;
		}

		return await act( ctxSystem( this ), message );
	}
}

export const app_init = ( name : string, env : any ) => {
	console.log( '=== APP INIT' );
	const app = new LiWEApp( name, env );

	// CORS: reflecting the caller origin together with `credentials: true` voids
	// the same-origin policy, so an explicit allowlist is mandatory in production.
	const allowedOrigins = ( env.ALLOWED_ORIGINS ?? '' ).split( ',' ).map( ( o : string ) => o.trim() ).filter( Boolean );

	if ( !app.isDev && ( allowedOrigins.length === 0 || allowedOrigins.includes( '*' ) ) ) {
		// fail fast at boot: a misconfigured deploy must not start open
		throw new Error( 'ALLOWED_ORIGINS must list explicit origins when DEV_MODE is false' );
	}

	// dev reflects the caller origin (needed for localhost:5173 -> localhost:8787);
	// production is pinned to the allowlist
	const corsOrigin : string[] | (( origin : string ) => string) = app.isDev
		? ( origin : string ) => origin
		: allowedOrigins;

	app.hono.use(
		'/*',
		cors( {
			origin: corsOrigin,
			allowMethods: [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH' ],
			// explicit allowlist of the request headers actually in use (Authorization
			// for auth, the X-* trio for multipart upload) instead of '*'
			allowHeaders: [ 'Content-Type', 'Authorization', 'X-Upload-Id', 'X-Key', 'X-Part-Number' ],
			exposeHeaders: [ 'X-Request-ID' ],
			credentials: true,
			maxAge: 86400,
		} ),
	);

	// enhance logs with request context
	app.hono.use( '/*', requestLoggerMiddleware( app ) );

	// Add middleware to make app available in context
	app.hono.use( '/*', async ( c, next ) => {
		c.set( 'app', app );
		await next();
	} );

	// Build the per-request ctx: from here on, request state lives ONLY in c.get( 'ctx' )
	// Scoped to /api/* only: no session/ctx needed for static asset routes
	app.hono.use( '/api/*', ctxMiddleware( app, name ) );
	app.hono.use( '/api/*', userContextMiddleware() );

	// Rate limiting on the credential-verifying endpoints is wired by the user
	// module (its module_init f2c block), so core stays module-agnostic.

	// Add a simple test route first
	app.hono.get( '/api/_dbg/hello', async ( c ) => {
		return c.json( { message: `Hello from ${app.name}! Is Dev: ${app.isDev}` } );
	} );

	// Introspection of the declared route gates. Registered here but reads
	// app.hono.routes lazily at request time, so it sees every module route.
	app.hono.get(
		'/api/system/admin/routes/list',
		routeGet( async () => responseSuccess( collectRouteList( app.hono.routes ) ), { perms: [ 'system.admin' ], description: 'Declared permission gate of every /api route' } ),
	);

	return app;
};
