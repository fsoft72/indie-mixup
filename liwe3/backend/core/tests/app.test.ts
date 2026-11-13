import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiWEApp, app_init } from '../src/app';
import * as loggerModule from '../src/logger';

// Mock Hono and drizzle.
// `new Hono()` must actually construct, so the implementation is a regular
// function (arrow functions are not constructable) that installs the handful
// of methods app.ts touches on the instance.
vi.mock( 'hono', () => ( {
	Hono: vi.fn( function( this : any ) {
		this.get = vi.fn();
		this.use = vi.fn();
		this.fetch = vi.fn();
	} ),
} ) );

vi.mock( 'drizzle-orm/d1', () => ( {
	drizzle: vi.fn( () => ( {} ) ),
} ) );

describe('LiWEApp', () => {
	let app : LiWEApp;
	const mockEnv = {
		DB: { exec: vi.fn() },
	};

	beforeEach( () => {
		vi.clearAllMocks();
		app = new LiWEApp( 'test-app', mockEnv );
	} );

	describe('constructor', () => {
		it('should create an instance with name and env', () => {
			expect( app.name ).toBe( 'test-app' );
			expect( app.env ).toBe( mockEnv );
		});

		it('should create an instance without env', () => {
			const appWithoutEnv = new LiWEApp( 'test-app' );
			expect( appWithoutEnv.name ).toBe( 'test-app' );
			expect( appWithoutEnv.env ).toBeNull();
		});
	});

	describe('env getter', () => {
		it('should return the environment', () => {
			expect( app.env ).toBe( mockEnv );
		});
	});

	describe('useTestDB', () => {
		it('throws when not in dev mode', () => {
			// mockEnv has no DEV_MODE and MINIFLARE is unset in the node test pool,
			// so isDev is false: the guard must fire before the DB_TEST check.
			const notDev = new LiWEApp( 'test-app', { DB: { exec: vi.fn() }, DB_TEST: { exec: vi.fn() } } );
			expect( () => notDev.useTestDB() ).toThrow( /forbidden outside development/ );
		});

		it('passes the dev guard when DEV_MODE is "true"', () => {
			const dev = new LiWEApp( 'test-app', { DB: { exec: vi.fn() }, DB_TEST: { exec: vi.fn() }, DEV_MODE: 'true' } );
			// gets past the isDev guard and the DB_TEST guard; does not throw
			expect( () => dev.useTestDB() ).not.toThrow();
		});
	});

	describe('db getter', () => {
		it('should return db instance when env and DB are set', () => {
			const db = app.db;
			expect( db ).toBeDefined();
		});

		it('should throw error when env is not set', () => {
			const appWithoutEnv = new LiWEApp( 'test-app' );
			expect( () => appWithoutEnv.db ).toThrow( 'Environment or DB is not set' );
		});

		it('should throw error when DB is not set in env', () => {
			const appWithoutDB = new LiWEApp( 'test-app', {} );
			expect( () => appWithoutDB.db ).toThrow( 'Environment or DB is not set' );
		});

		it('should cache db instance', () => {
			const db1 = app.db;
			const db2 = app.db;
			expect( db1 ).toBe( db2 );
		});
	});

	describe('hono getter', () => {
		it('should return hono instance', () => {
			expect( app.hono ).toBeDefined();
		});
	});

	describe('fetch getter', () => {
		it('should return hono fetch method', () => {
			expect( app.fetch ).toBeDefined();
		});
	});

	describe('setEnv', () => {
		it('should update environment', () => {
			const newEnv = { DB: { exec: vi.fn() }, TEST: 'value' };
			app.setEnv( newEnv );
			expect( app.env ).toBe( newEnv );
		});
	});
});

describe('app_init', () => {
	// DEV_MODE keeps app_init out of the production CORS allowlist check
	const mockEnv = {
		DB: { exec: vi.fn() },
		DEV_MODE: 'true',
	};

	it('should create and configure LiWEApp instance', () => {
		const consoleLogSpy = vi.spyOn( console, 'log' ).mockImplementation( () => {} );

		const app = app_init( 'test-app', mockEnv );

		expect( consoleLogSpy ).toHaveBeenCalledWith( '=== APP INIT' );
		expect( app ).toBeInstanceOf( LiWEApp );
		expect( app.name ).toBe( 'test-app' );
		expect( app.env ).toBe( mockEnv );

		consoleLogSpy.mockRestore();
	});

	it('should setup default routes', () => {
		const app = app_init( 'test-app', mockEnv );
		// /api/_dbg/hello and /api/system/admin/routes/list
		expect( app.hono.get ).toHaveBeenCalledTimes( 2 );
	});
});

describe('app_init CORS allowlist', () => {
	const base = { DB: { exec: vi.fn() } };

	it('throws when not dev and ALLOWED_ORIGINS is "*"', () => {
		expect( () => app_init( 'x', { ...base, DEV_MODE: 'false', ALLOWED_ORIGINS: '*' } ) )
			.toThrow( /ALLOWED_ORIGINS must list explicit origins/ );
	});

	it('throws when not dev and ALLOWED_ORIGINS is missing', () => {
		expect( () => app_init( 'x', { ...base, DEV_MODE: 'false' } ) )
			.toThrow( /ALLOWED_ORIGINS must list explicit origins/ );
	});

	it('accepts an explicit origin list when not dev', () => {
		expect( () => app_init( 'x', { ...base, DEV_MODE: 'false', ALLOWED_ORIGINS: 'https://a.example, https://b.example' } ) )
			.not.toThrow();
	});

	it('does not enforce the allowlist in dev', () => {
		expect( () => app_init( 'x', { ...base, DEV_MODE: 'true', ALLOWED_ORIGINS: '*' } ) )
			.not.toThrow();
	});
});

describe('LiWEApp.applyConfigOverrides', () => {
	const BASE_JSON = JSON.stringify( {
		site: { name: 'My App' },
		jwt: { expiresIn: '1h' },
		log: { level: 'info', includeStack: true },
		db: { secret: 'db-secret' },
	} );
	let app : LiWEApp;

	beforeEach( () => {
		vi.clearAllMocks();
		app = new LiWEApp( 'test-app', { DB: { exec: vi.fn() } } );
		app.loadConfigFromString( BASE_JSON );
	} );

	it('layers the overrides on top of the config loaded from the string', () => {
		app.applyConfigOverrides( { 'site.name': 'Fatto', 'jwt.expiresIn': '2h' } );

		expect( app.cfg.site.name ).toBe( 'Fatto' );
		expect( app.cfg.jwt.expiresIn ).toBe( 7200 );
	});

	it('restores the base values when called again without them', () => {
		app.applyConfigOverrides( { 'site.name': 'Fatto' } );
		app.applyConfigOverrides( {} );

		expect( app.cfg.site.name ).toBe( 'My App' );
	});

	it('reconfigures the logger from the overridden log section', () => {
		const spy = vi.spyOn( loggerModule, 'configureLogger' );

		app.applyConfigOverrides( { 'log.level': 'debug' } );

		expect( spy ).toHaveBeenCalledWith( expect.objectContaining( { minLevel: 'debug' } ) );
	});
});
