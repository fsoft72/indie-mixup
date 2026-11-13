import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiWECtx } from '@backend/liwe3';
import { encryptData } from '@backend/liwe3';
import { get_domain_secret } from '../src/secret';

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();

const resetDbMocks = () => {
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { where: mockWhere } );
	mockWhere.mockReturnValue( { get: mockGet } );
};

const SECRET = 'test-site-secret';

const makeCtx = ( domain : string | null = 'acme' ) : LiWECtx => ( {
	app: { db: { select: mockSelect }, cfg: { site: { secret: SECRET } } } as any,
	c: null,
	sessionId: null,
	session: async () => null,
	user: async () => ( domain === null ? null : ( { id: 'user_1', domain } as any ) ),
} );

describe('get_domain_secret', () => {
	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
	} );

	it('returns null when the user is not authenticated', async () => {
		const result = await get_domain_secret( makeCtx( null ), 'byteplus' );

		expect( result ).toBeNull();
		expect( mockSelect ).not.toHaveBeenCalled();
	});

	it('returns null when no credential of that type exists for the domain', async () => {
		mockGet.mockResolvedValue( undefined );

		const result = await get_domain_secret( makeCtx(), 'byteplus' );

		expect( result ).toBeNull();
	});

	it('returns null when the credential has no data_enc', async () => {
		mockGet.mockResolvedValue( { id: 'cred_1', domain: 'acme', type: 'byteplus', metadata: { model: 'x' }, data_enc: null } );

		const result = await get_domain_secret( makeCtx(), 'byteplus' );

		expect( result ).toBeNull();
	});

	it('decrypts data_enc and returns it alongside metadata', async () => {
		const encrypted = await encryptData( { api_key: 'ark-secret-123' }, SECRET );
		mockGet.mockResolvedValue( {
			id: 'cred_1',
			domain: 'acme',
			type: 'byteplus',
			metadata: { model: 'dreamina-seedance-2-5-260628' },
			data_enc: encrypted,
		} );

		const result = await get_domain_secret( makeCtx(), 'byteplus' );

		expect( result ).toEqual( {
			metadata: { model: 'dreamina-seedance-2-5-260628' },
			data: { api_key: 'ark-secret-123' },
		} );
	});
});
