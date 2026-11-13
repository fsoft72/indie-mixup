import { type LiWECtx, LiWEResponse, responseError, responseSuccess, z } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED } from '@backend/liwe3';
import { jwtCreate, parseTime, sessionCreate } from '@backend/liwe3';

/**
 * Schema for test enter params
 */
const SYSTEM_TEST_ENTER_SCHEMA = z.object( {
	clean: z.boolean().optional().default( false ),
} );

/** Parameters for system_test_enter */
export type SystemTestEnterParams = z.infer<typeof SYSTEM_TEST_ENTER_SCHEMA>;

/**
 * Enters test mode: switches the app to use DB_TEST.
 * If clean=true, wipes all user tables and replays module seeders.
 * Creates a new admin session valid against the test DB.
 *
 * Guards: DEV_MODE must be 'true', user must be admin.
 *
 * @param {LiWECtx} ctx - The request context
 * @param {SystemTestEnterParams} params - Request parameters
 * @returns {Promise<LiWEResponse<{ token: string; test_mode: boolean; clean: boolean }>>}
 */
export const system_test_enter = async (
	ctx : LiWECtx,
	params : SystemTestEnterParams,
) : Promise<LiWEResponse<{ token : string; test_mode : boolean; clean : boolean }>> => {
	// Guard: dev mode only
	if ( ctx.app.env?.DEV_MODE !== 'true' ) {
		return responseError( 'Test mode is only available in dev environment', 403 );
	}

	// Guard: admin auth
	const user = await ctx.user();
	if ( !user ) return responseError( ERR_UNAUTHORIZED, 401 );
	if ( !user.perms?.includes( 'system.admin' ) ) return responseError( ERR_PERMISSION_DENIED, 403 );

	const clean = params.clean ?? false;

	// If already in test mode and no clean requested, no-op
	if ( ctx.app.isTestMode && !clean ) {
		return responseSuccess( { token: '', test_mode: true, clean: false } );
	}

	// Switch to test DB (if not already)
	if ( !ctx.app.isTestMode ) {
		ctx.app.useTestDB();
	}

	// If clean requested, wipe and reseed
	if ( clean ) {
		console.log( '\x1b[33m[TEST] Wiping test database...\x1b[0m' );

		// Get all user-data tables (exclude system/migration tables)
		const tablesResult = await ctx.app.env.DB.prepare(
			"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '__drizzle%' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
		).all();

		if ( tablesResult?.results ) {
			for ( const row of tablesResult.results ) {
				const tableName = ( row as any ).name;
				console.log( `    [TEST] Clearing table: ${tableName}` );
				await ctx.app.env.DB.prepare( `DELETE FROM "${tableName}"` ).run();
			}
		}

		console.log( '\x1b[33m[TEST] Re-seeding test database...\x1b[0m' );
		await ctx.app.replayModuleSeeders();
	}

	// Guard: admin username must be configured
	if ( !ctx.app.cfg.system?.username ) {
		return responseError( 'System admin username is not configured in config', 500 );
	}

	// Create admin session in test DB
	// Use raw SQL to avoid cross-module import of user schema
	const adminResult = await ctx.app.env.DB.prepare(
		'SELECT id, username, email, perms, domain, token_version FROM users WHERE username = ?',
	).bind( ctx.app.cfg.system.username ).first();

	if ( !adminResult ) {
		return responseError( 'Failed to find admin user in test DB after seeding', 500 );
	}

	const adminPerms = typeof adminResult.perms === 'string' ? JSON.parse( adminResult.perms ) : ( adminResult.perms || [] );

	// Create a session for the admin user
	const jwtExpiration = parseTime( ctx.app.cfg.jwt.expiresIn, 1800 );
	const sessionId = await sessionCreate( ctx.app.kv, ctx.app.name, adminResult.id ?? '', {
		expiresIn: jwtExpiration,
		metadata: {
			id: adminResult.id,
			username: adminResult.username,
			email: adminResult.email,
			perms: adminPerms,
			domain: adminResult.domain,
			loginTime: new Date().toISOString(),
		},
	}, ( adminResult.token_version as number ) ?? 0 );

	const token = await jwtCreate(
		{
			session: sessionId,
			tokenVersion: ( adminResult.token_version as number ) ?? 0,
		},
		ctx.app.cfg.jwt.secret,
		jwtExpiration,
	);

	console.log( '\x1b[42m\x1b[30m[TEST] Test mode active. Admin session created.\x1b[0m' );

	return responseSuccess( { token, test_mode: true, clean } );
};
