import { afterEach, describe, expect, it, vi } from 'vitest';
import { liwe_event_emit, liwe_event_register, liwe_event_unregister, redactSensitive } from '../src/events';
import { logger } from '../src/logger';
import { responseSuccess } from '../src/response';

describe('redactSensitive', () => {
	it('replaces only the values of sensitive keys, on a copy', () => {
		const data = { key: 'fatto_x', name: 'a', Password: 'p', refresh_token: 't', nested: { key: 'k' } };
		const out = redactSensitive( data ) as Record<string, unknown>;
		expect( out ).toEqual( { key: '[redacted]', name: 'a', Password: '[redacted]', refresh_token: '[redacted]', nested: { key: 'k' } } );
		expect( data.key ).toBe( 'fatto_x' );
	});

	it('leaves non-objects and arrays untouched', () => {
		expect( redactSensitive( 'key' ) ).toBe( 'key' );
		expect( redactSensitive( null ) ).toBeNull();
		expect( redactSensitive( undefined ) ).toBeUndefined();
		const arr = [ { key: 'k' } ];
		expect( redactSensitive( arr ) ).toBe( arr );
	});
});

describe('liwe_event_emit debug logging', () => {
	afterEach( () => vi.restoreAllMocks() );

	it('logs redacted data while the handler still receives the real key', async () => {
		const spy = vi.spyOn( logger, 'debug' ).mockImplementation( () => {} );
		const handler = vi.fn( async () => responseSuccess( 'ok' ) );
		liwe_event_register( 'redact.test', handler );
		const ctx = { app: { cfg: { debug: { enabled: true, events: true } } } } as any;

		await liwe_event_emit( ctx, 'redact.test', { key: 'fatto_x', name: 'a' } );
		liwe_event_unregister( 'redact.test', handler );

		expect( spy ).toHaveBeenCalledTimes( 1 );
		const logged = spy.mock.calls[0][1] as { data : Record<string, unknown> };
		expect( logged.data ).toEqual( { key: '[redacted]', name: 'a' } );
		expect( JSON.stringify( spy.mock.calls ) ).not.toContain( 'fatto_x' );
		expect( handler ).toHaveBeenCalledWith( ctx, { key: 'fatto_x', name: 'a' } );
	});
});
