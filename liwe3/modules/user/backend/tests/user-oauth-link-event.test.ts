import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listeners_init } from '../src/listeners';
import { LiWEApp, type LiWECtx, liwe_event_call } from '@backend/liwe3';

// Mock database operations
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();

const resetDbMocks = () => {
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { where: mockWhere } );
	mockWhere.mockReturnValue( { get: mockGet } );
};

const createMockApp = () : LiWEApp => {
	const mockApp = new LiWEApp( 'test' );
	Object.defineProperty( mockApp, 'db', { get: () => ( { select: mockSelect } ) } );
	Object.defineProperty( mockApp, 'cfg', { get: () => ( { system: {} } ) } );
	return mockApp;
};

const createMockCtx = ( domain? : string ) : LiWECtx => ( {
	app: createMockApp(),
	c: null,
	sessionId: null,
	session: async () => null,
	user: async () => ( domain ? { domain } : null ) as any,
} );

describe('user.call.user.oauth_link listener', () => {
	// Handlers register into a module-level singleton: register once, not per test.
	beforeAll( () => {
		listeners_init( createMockApp() );
	} );

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
	} );

	it('returns the provider user id of the link', async () => {
		mockGet.mockResolvedValueOnce( { id_user: 'user.1', provider: 'github', provider_user_id: '12345', email: 'secret@example.com' } );

		const res = await liwe_event_call<any>( createMockCtx( 'acme' ), 'user', 'user.oauth_link', { id_user: 'user.1', provider: 'github' } );

		expect( res.ok ).toBe( true );
		// only the public identity of the link is returned, never the email
		expect( res.data ).toEqual( { id_user: 'user.1', provider: 'github', provider_user_id: '12345' } );
	});

	it('is a 404 when the user has no link for the provider', async () => {
		mockGet.mockResolvedValueOnce( undefined );

		const res = await liwe_event_call<any>( createMockCtx( 'acme' ), 'user', 'user.oauth_link', { id_user: 'user.1', provider: 'github' } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 404 );
	});

	it('is a 400 when id_user or provider is missing', async () => {
		const noUser = await liwe_event_call<any>( createMockCtx( 'acme' ), 'user', 'user.oauth_link', { provider: 'github' } );
		const noProvider = await liwe_event_call<any>( createMockCtx( 'acme' ), 'user', 'user.oauth_link', { id_user: 'user.1' } );

		expect( noUser.ok ).toBe( false );
		expect( noUser.status ).toBe( 400 );
		expect( noProvider.ok ).toBe( false );
		expect( noProvider.status ).toBe( 400 );
		expect( mockSelect ).not.toHaveBeenCalled();
	});
});
