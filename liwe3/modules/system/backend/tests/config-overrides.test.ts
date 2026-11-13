import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@backend/liwe3';
import { SYSTEM_CONFIG_OVERRIDES_TTL_MS, systemConfigOverridesInvalidate, systemConfigOverridesRefresh } from '../src/config-overrides';

/** Fake app: the select resolves to `state.rows`, or rejects when `state.error` is set. */
const makeApp = () => {
	const state : { rows : any[]; error : Error | null } = { rows: [], error: null };
	const select = vi.fn( () => ( {
		from: vi.fn( () => state.error ? Promise.reject( state.error ) : Promise.resolve( state.rows ) ),
	} ) );
	const app : any = {
		db: { select },
		applyConfigOverrides: vi.fn(),
	};

	return { app, state, select };
};

describe('systemConfigOverridesRefresh', () => {
	let warn : ReturnType<typeof vi.spyOn>;

	beforeEach( () => {
		warn = vi.spyOn( logger, 'warn' ).mockImplementation( () => {} );
		systemConfigOverridesInvalidate();
		vi.useFakeTimers();
		vi.setSystemTime( 1_000_000 );
	} );

	afterEach( () => {
		vi.useRealTimers();
		warn.mockRestore();
	} );

	it('applies the stored rows to the app config', async () => {
		const { app, state } = makeApp();
		state.rows = [ { key: 'site.name', value: 'Fatto' }, { key: 'user.passwordMaxAgeDays', value: 90 } ];

		await systemConfigOverridesRefresh( app );

		expect( app.applyConfigOverrides ).toHaveBeenCalledWith( { 'site.name': 'Fatto', 'user.passwordMaxAgeDays': 90 } );
	});

	it('ignores a stored key that is no longer in the editable list', async () => {
		const { app, state } = makeApp();
		state.rows = [ { key: 'jwt.secret', value: 'leaked' }, { key: 'site.name', value: 'Fatto' } ];

		await systemConfigOverridesRefresh( app );

		expect( app.applyConfigOverrides ).toHaveBeenCalledWith( { 'site.name': 'Fatto' } );
	});

	it('does not throw when the table cannot be read, and warns once', async () => {
		const { app, state } = makeApp();
		state.error = new Error( 'no such table: system_config_overrides' );

		await expect( systemConfigOverridesRefresh( app ) ).resolves.toBe( false );

		expect( app.applyConfigOverrides ).not.toHaveBeenCalled();
		expect( warn ).toHaveBeenCalledTimes( 1 );
	});

	it('shares one read between simultaneous refreshes', async () => {
		const { app, select } = makeApp();

		await Promise.all( [ systemConfigOverridesRefresh( app ), systemConfigOverridesRefresh( app ), systemConfigOverridesRefresh( app ) ] );

		expect( select ).toHaveBeenCalledTimes( 1 );
	});

	it('does not read again inside the TTL, but does after it and when forced', async () => {
		const { app, select } = makeApp();

		await systemConfigOverridesRefresh( app );
		await systemConfigOverridesRefresh( app );
		expect( select ).toHaveBeenCalledTimes( 1 );

		await systemConfigOverridesRefresh( app, { force: true } );
		expect( select ).toHaveBeenCalledTimes( 2 );

		vi.setSystemTime( 1_000_000 + SYSTEM_CONFIG_OVERRIDES_TTL_MS + 1 );
		await systemConfigOverridesRefresh( app );
		expect( select ).toHaveBeenCalledTimes( 3 );
	});

	it('waits a full TTL before retrying after a failed read', async () => {
		const { app, state, select } = makeApp();
		state.error = new Error( 'boom' );

		await systemConfigOverridesRefresh( app );
		await systemConfigOverridesRefresh( app );

		expect( select ).toHaveBeenCalledTimes( 1 );
	});

	it('reads again when forced during a read that may predate a save', async () => {
		const { app, select } = makeApp();

		const first = systemConfigOverridesRefresh( app );
		const forced = systemConfigOverridesRefresh( app, { force: true } );
		await Promise.all( [ first, forced ] );

		expect( select ).toHaveBeenCalledTimes( 2 );
	});

	it('tells whether the table could be read', async () => {
		const ok = makeApp();
		const ko = makeApp();
		ko.state.error = new Error( 'boom' );

		expect( await systemConfigOverridesRefresh( ok.app ) ).toBe( true );
		systemConfigOverridesInvalidate();
		expect( await systemConfigOverridesRefresh( ko.app ) ).toBe( false );
	});

	it('retries on the next request after a failed forced refresh', async () => {
		const { app, state, select } = makeApp();
		state.error = new Error( 'boom' );

		await systemConfigOverridesRefresh( app, { force: true } );
		state.error = null;
		await systemConfigOverridesRefresh( app );

		expect( select ).toHaveBeenCalledTimes( 2 );
	});
});
