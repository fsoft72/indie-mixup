import { describe, expect, it, vi } from 'vitest';
import { challenge_check, challenge_create } from '../src/challenge';
import { sha256 } from '../src/crypto';

// Mock crypto module
vi.mock( '../src/crypto', () => ( {
	sha256: vi.fn(),
} ) );

describe('challenge_create', () => {
	const mockSha256 = vi.mocked( sha256 );

	beforeEach( () => {
		vi.clearAllMocks();
		mockSha256.mockResolvedValue( 'mocked_hash' );
	} );

	it('should create challenge with params and secret', async () => {
		const result = await challenge_create( 'secret', [ 'param1', 'param2' ] );

		expect( mockSha256 ).toHaveBeenCalledWith( 'param1-param2-secret' );
		expect( result ).toBe( 'mocked_hash' );
	});

	it('should handle empty params', async () => {
		await challenge_create( 'secret', [] );

		expect( mockSha256 ).toHaveBeenCalledWith( 'secret' );
	});

	it('should sort params alphabetically', async () => {
		await challenge_create( 'secret', [ 'zebra', 'alpha', 'beta' ] );

		expect( mockSha256 ).toHaveBeenCalledWith( 'alpha-beta-zebra-secret' );
	});

	it('should convert params to lowercase strings', async () => {
		await challenge_create( 'secret', [ 'UPPER', 123, null, undefined ] );

		expect( mockSha256 ).toHaveBeenCalledWith( '123-upper-secret' );
	});

	it('should handle null and undefined params', async () => {
		await challenge_create( 'secret', [ null, undefined, '' ] );

		expect( mockSha256 ).toHaveBeenCalledWith( 'secret' );
	});

	it('should remove multiple consecutive dashes', async () => {
		await challenge_create( 'secret', [ '', '', 'param' ] );

		expect( mockSha256 ).toHaveBeenCalledWith( 'param-secret' );
	});

	it('should remove leading dashes', async () => {
		await challenge_create( 'secret', [ '', 'param' ] );

		expect( mockSha256 ).toHaveBeenCalledWith( 'param-secret' );
	});
});

describe('challenge_check', () => {
	const mockSha256 = vi.mocked( sha256 );

	beforeEach( () => {
		vi.clearAllMocks();
	} );

	it('should return true for valid challenge', async () => {
		mockSha256.mockResolvedValue( 'valid_hash' );

		const result = await challenge_check( 'valid_hash', 'secret', [ 'param1' ] );

		expect( result ).toBe( true );
	});

	it('should return false for invalid challenge', async () => {
		mockSha256.mockResolvedValue( 'different_hash' );

		const result = await challenge_check( 'invalid_hash', 'secret', [ 'param1' ] );

		expect( result ).toBe( false );
	});

	it('should use challenge_create internally', async () => {
		mockSha256.mockResolvedValue( 'expected_hash' );

		await challenge_check( 'expected_hash', 'secret', [ 'param1', 'param2' ] );

		expect( mockSha256 ).toHaveBeenCalledWith( 'param1-param2-secret' );
	});
});
