import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiWEApp, type LiWECtx } from '@backend/liwe3';

vi.mock( '@backend/liwe3', async () => {
	const actual = await vi.importActual<typeof import('@backend/liwe3')>( '@backend/liwe3' );
	return {
		...actual,
		mkid: vi.fn(),
		sessionCreate: vi.fn( async () => 'sess_new' ),
		jwtCreate: vi.fn( async () => 'jwt_new' ),
	};
} );

import { mkid } from '@backend/liwe3';
import { user_token_refresh } from '../src/methods/user-token-refresh';

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();
const mockRun = vi.fn();

const wireDb = () => {
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { where: mockWhere } );
	mockWhere.mockReturnValue( { get: mockGet, run: mockRun } );
	mockInsert.mockReturnValue( { values: mockValues } );
	mockValues.mockReturnValue( { run: mockRun } );
	mockUpdate.mockReturnValue( { set: mockSet } );
	mockSet.mockReturnValue( { where: mockWhere } );
	mockDelete.mockReturnValue( { where: mockWhere } );
	mockRun.mockResolvedValue( { meta: { changes: 1 } } );
};

const makeCtx = () : LiWECtx => {
	const app = new LiWEApp( 'test' );
	Object.defineProperty( app, 'db', {
		get: () => ( { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete } ),
	} );
	Object.defineProperty( app, 'kv', { get: () => ( {} ) } );
	Object.defineProperty( app, 'cfg', { get: () => ( { jwt: { secret: 's', expiresIn: 1800, refreshTokenDuration: 21600 } } ) } );
	return { app, c: null, sessionId: null, session: async () => null, user: async () => null } as unknown as LiWECtx;
};

const USER = { id: 'user_1', username: 'bob', email: 'b@x.io', perms: [], domain: 'acme', token_version: 3 };

describe('user_token_refresh', () => {
	beforeEach( () => {
		vi.clearAllMocks();
		wireDb();
		vi.mocked( mkid ).mockReturnValue( 'generated_id' );
	} );

	it('rotates a valid token: marks it used and issues a successor in the same family', async () => {
		mockGet
			.mockResolvedValueOnce( { id: 'urt_1', id_user: 'user_1', family_id: 'fam_1', expires_at: Date.now() + 100000, used_at: null } )
			.mockResolvedValueOnce( USER );

		const res = await user_token_refresh( makeCtx(), { refresh_token: 'plain-token' } );

		expect( res.ok ).toBe( true );
		expect( res.data?.refresh_token ).toBe( 'generated_id' ); // mkid() output for the new token
		// the presented token was consumed, not deleted
		expect( mockSet ).toHaveBeenCalledWith( expect.objectContaining( { used_at: expect.any( Number ) } ) );
		// successor row carries the same family
		expect( mockValues ).toHaveBeenCalledWith( expect.objectContaining( { family_id: 'fam_1', used_at: null } ) );
	});

	it('on reuse of a consumed token: 401, whole family deleted, token version bumped', async () => {
		mockGet.mockResolvedValueOnce( { id: 'urt_1', id_user: 'user_1', family_id: 'fam_1', expires_at: Date.now() + 100000, used_at: Date.now() - 1000 } );

		const res = await user_token_refresh( makeCtx(), { refresh_token: 'replayed' } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 401 );
		expect( mockDelete ).toHaveBeenCalled(); // family wipe
		expect( mockUpdate ).toHaveBeenCalled(); // bump_token_version on users
	});

	it('rejects an expired token with 401 and deletes it', async () => {
		mockGet.mockResolvedValueOnce( { id: 'urt_old', id_user: 'user_1', family_id: 'fam_1', expires_at: Date.now() - 1, used_at: null } );

		const res = await user_token_refresh( makeCtx(), { refresh_token: 'stale' } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 401 );
		expect( mockDelete ).toHaveBeenCalled();
	});

	it('rejects an unknown token with 401', async () => {
		mockGet.mockResolvedValueOnce( undefined );

		const res = await user_token_refresh( makeCtx(), { refresh_token: 'nope' } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 401 );
	});
});
