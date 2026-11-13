import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiWECtx } from '@backend/liwe3';
import { user_oauth_provider_enable } from '../src/methods/user-oauth-provider-enable';

const mockGet = vi.fn();
const mockRun = vi.fn();
const mockSet = vi.fn();

/** Builds a fake ctx whose db returns the rows configured on `mockGet`. */
const fakeCtx = ( domain = 'acme' ) : LiWECtx => ( {
	app: {
		db: {
			select: () => ( { from: () => ( { where: () => ( { get: mockGet } ) } ) } ),
			update: () => ( {
				set: ( v : unknown ) => {
					mockSet( v );
					return { where: () => ( { run: mockRun } ) };
				},
			} ),
		},
	},
	user: async () => ( { id: 'u1', domain } ),
} as unknown as LiWECtx );

const PROVIDER_ROW = { id: 'oaup1', domain: 'acme', provider: 'github', client_id: 'cid', client_secret: 'ENCRYPTED', enabled: true };

describe('user_oauth_provider_enable', () => {
	beforeEach( () => {
		vi.clearAllMocks();
		mockRun.mockResolvedValue( undefined );
	} );

	it('disables an existing provider and never returns the secret', async () => {
		mockGet.mockResolvedValue( PROVIDER_ROW );

		const res = await user_oauth_provider_enable( fakeCtx(), { id: 'oaup1', enabled: false } );

		expect( res.ok ).toBe( true );
		expect( mockSet ).toHaveBeenCalledWith( { enabled: false } );
		if ( res.ok ) {
			expect( res.data.enabled ).toBe( false );
			expect( res.data.client_secret ).toBeNull();
			expect( res.data.client_id ).toBe( 'cid' );
		}
	});

	it('enables a provider', async () => {
		mockGet.mockResolvedValue( { ...PROVIDER_ROW, enabled: false } );

		const res = await user_oauth_provider_enable( fakeCtx(), { id: 'oaup1', enabled: true } );

		expect( res.ok ).toBe( true );
		expect( mockSet ).toHaveBeenCalledWith( { enabled: true } );
	});

	it('returns 404 when the provider does not exist in the caller domain', async () => {
		mockGet.mockResolvedValue( undefined );

		const res = await user_oauth_provider_enable( fakeCtx(), { id: 'nope', enabled: true } );

		expect( res.ok ).toBe( false );
		if ( !res.ok ) {
			expect( res.error.code ).toBe( 'OAUTH_PROVIDER_NOT_FOUND' );
			expect( res.status ).toBe( 404 );
		}
		expect( mockSet ).not.toHaveBeenCalled();
	});

	it('returns 401 when not logged in', async () => {
		const ctx = { ...fakeCtx(), user: async () => null } as unknown as LiWECtx;

		const res = await user_oauth_provider_enable( ctx, { id: 'oaup1', enabled: true } );

		expect( res.ok ).toBe( false );
		expect( mockSet ).not.toHaveBeenCalled();
	});
});
