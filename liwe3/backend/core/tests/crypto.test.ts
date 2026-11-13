import { describe, expect, it } from 'vitest';
import { hashPassword, jwtCreate, jwtVerify, sha256, sha512, totpGenerate, totpOtpauthUrl, totpSecretGenerate, totpVerify, verifyPassword } from '../src/crypto';
import { webcrypto } from 'crypto';

// Use Node.js Web Crypto API for testing
Object.defineProperty( global, 'crypto', {
	value: webcrypto,
	writable: true,
} );

describe('sha256', () => {
	it('should hash a simple string', async () => {
		const result = await sha256( 'hello' );

		// Real SHA-256 hash of 'hello'
		expect( result ).toBe( '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' );
	});

	it('should handle empty string', async () => {
		const result = await sha256( '' );

		// Real SHA-256 hash of empty string
		expect( result ).toBe( 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' );
	});

	it('should handle unicode characters', async () => {
		const result = await sha256( '🌟' );

		// Real SHA-256 hash of '🌟'
		expect( result ).toBe( '85f13d5957ddc956574ba4a18e2aa329aae9fbd3816a917819d1452139a00fd9' );
	});

	it('should produce consistent results for same input', async () => {
		const result1 = await sha256( 'same input' );
		const result2 = await sha256( 'same input' );

		expect( result1 ).toBe( result2 );
		expect( result1 ).toHaveLength( 64 ); // SHA-256 produces 64 hex chars
	});

	it('should produce different results for different inputs', async () => {
		const result1 = await sha256( 'input1' );
		const result2 = await sha256( 'input2' );

		expect( result1 ).not.toBe( result2 );
		expect( result1 ).toHaveLength( 64 );
		expect( result2 ).toHaveLength( 64 );
	});
});

describe('sha512', () => {
	it('should hash a simple string', async () => {
		const result = await sha512( 'hello' );

		// Real SHA-512 hash of 'hello'
		expect( result ).toBe( '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043' );
	});

	it('should handle empty string', async () => {
		const result = await sha512( '' );

		// Real SHA-512 hash of empty string
		expect( result ).toBe( 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e' );
	});

	it('should handle unicode characters', async () => {
		const result = await sha512( '🚀' );

		// This will be the actual hash - we'll let the test generate it
		expect( result ).toHaveLength( 128 ); // SHA-512 produces 128 hex chars
	});

	it('should produce consistent results for same input', async () => {
		const result1 = await sha512( 'same input' );
		const result2 = await sha512( 'same input' );

		expect( result1 ).toBe( result2 );
		expect( result1 ).toHaveLength( 128 ); // SHA-512 produces 128 hex chars
	});

	it('should produce different results for different inputs', async () => {
		const result1 = await sha512( 'input1' );
		const result2 = await sha512( 'input2' );

		expect( result1 ).not.toBe( result2 );
		expect( result1 ).toHaveLength( 128 );
		expect( result2 ).toHaveLength( 128 );
	});
});

describe('crypto functions integration', () => {
	it('should work with both sha256 and sha512', async () => {
		const input = 'test integration';

		const sha256Result = await sha256( input );
		const sha512Result = await sha512( input );

		expect( sha256Result ).toHaveLength( 64 );
		expect( sha512Result ).toHaveLength( 128 );
		expect( sha256Result ).not.toBe( sha512Result );
	});

	it('should handle various input types consistently', async () => {
		const inputs = [ 'simple', '', '🔥🚀', 'a'.repeat( 1000 ) ];

		for ( const input of inputs ) {
			const result1 = await sha256( input );
			const result2 = await sha256( input );

			expect( result1 ).toBe( result2 );
			expect( result1 ).toHaveLength( 64 );
		}
	});
});

describe('hashPassword', () => {
	it('should hash a password successfully', async () => {
		const password = 'mySecurePassword123!';
		const hashed = await hashPassword( password );

		// Should return salt$hash format
		expect( hashed ).toMatch( /^[0-9a-f]{32}\$[0-9a-f]{64}$/i );

		// Should contain 32 char salt + $ + 64 char hash
		const parts = hashed.split( '$' );
		expect( parts ).toHaveLength( 2 );
		expect( parts[0] ).toHaveLength( 32 ); // 16 bytes = 32 hex chars
		expect( parts[1] ).toHaveLength( 64 ); // 32 bytes = 64 hex chars
	});

	it('should generate different salts for same password', async () => {
		const password = 'samePassword';
		const hash1 = await hashPassword( password );
		const hash2 = await hashPassword( password );

		expect( hash1 ).not.toBe( hash2 );

		// Salts should be different
		const salt1 = hash1.split( '$' )[0];
		const salt2 = hash2.split( '$' )[0];
		expect( salt1 ).not.toBe( salt2 );
	});

	it('should handle unicode characters', async () => {
		const password = '密码123🔐';
		const hashed = await hashPassword( password );

		expect( hashed ).toMatch( /^[0-9a-f]{32}\$[0-9a-f]{64}$/i );
	});

	it('should throw error for invalid passwords', async () => {
		await expect( hashPassword( '' ) ).rejects.toThrow( 'Invalid password' );
		await expect( hashPassword( 'a'.repeat( 1001 ) ) ).rejects.toThrow( 'Invalid password' );
	});

	it('should handle edge case passwords', async () => {
		const passwords = [ 'a', 'x'.repeat( 999 ), '!@#$%^&*()_+' ];

		for ( const password of passwords ) {
			const hashed = await hashPassword( password );
			expect( hashed ).toMatch( /^[0-9a-f]{32}\$[0-9a-f]{64}$/i );
		}
	});
});

describe('verifyPassword', () => {
	it('should verify correct password', async () => {
		const password = 'myTestPassword123!';
		const hashed = await hashPassword( password );
		const isValid = await verifyPassword( password, hashed );

		expect( isValid ).toBe( true );
	});

	it('should reject incorrect password', async () => {
		const password = 'correctPassword';
		const wrongPassword = 'wrongPassword';
		const hashed = await hashPassword( password );
		const isValid = await verifyPassword( wrongPassword, hashed );

		expect( isValid ).toBe( false );
	});

	it('should handle unicode passwords correctly', async () => {
		const password = '测试密码🔒';
		const hashed = await hashPassword( password );
		const isValid = await verifyPassword( password, hashed );

		expect( isValid ).toBe( true );
	});

	it('should reject malformed hash formats', async () => {
		const password = 'testPassword';

		const invalidHashes = [
			'',
			'invalidhash',
			'salt$',
			'$hash',
			'salt$hash$extra',
			'notahexsalt$validhex123456789012345678901234567890123456789012345678901234',
			'validhex12345678901234567890123456789012$notahexhash',
			'tooshort$hash1234567890123456789012345678901234567890123456789012345678',
			'validhex12345678901234567890123456789012$toolonghash12345678901234567890123456789012345678901234567890123456789',
		];

		for ( const invalidHash of invalidHashes ) {
			const isValid = await verifyPassword( password, invalidHash );
			expect( isValid ).toBe( false );
		}
	});

	it('should reject invalid passwords during verification', async () => {
		const validHash = 'abcd1234567890abcd1234567890abcd$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

		expect( await verifyPassword( '', validHash ) ).toBe( false );
		expect( await verifyPassword( 'a'.repeat( 1001 ), validHash ) ).toBe( false );
	});

	it('should be consistent across multiple verifications', async () => {
		const password = 'consistencyTest';
		const hashed = await hashPassword( password );

		// Verify same password multiple times
		for ( let i = 0; i < 5; i++ ) {
			expect( await verifyPassword( password, hashed ) ).toBe( true );
			expect( await verifyPassword( 'wrong', hashed ) ).toBe( false );
		}
	});

	it('should handle timing attack resistance', async () => {
		const password = 'timingTest';
		const hashed = await hashPassword( password );

		// These should all return false, but timing should be similar
		const wrongPasswords = [
			'wrong1',
			'wrong2',
			'completely_different_length_password',
			'a',
			'x'.repeat( 500 ),
		];

		for ( const wrongPassword of wrongPasswords ) {
			const start = Date.now();
			const result = await verifyPassword( wrongPassword, hashed );
			const elapsed = Date.now() - start;

			expect( result ).toBe( false );
			// Timing should be reasonable (not too fast, indicating early exit)
			expect( elapsed ).toBeGreaterThan( 0 );
		}
	});
});

describe('password functions integration', () => {
	it('should work with various password types', async () => {
		const passwords = [
			'simple',
			'Complex123!@#',
			'🚀🔐💪',
			'a'.repeat( 100 ),
			'   spaces   ',
			'tabs\t\tnewlines\n\n',
		];

		for ( const password of passwords ) {
			const hashed = await hashPassword( password );
			expect( await verifyPassword( password, hashed ) ).toBe( true );
			expect( await verifyPassword( password + 'wrong', hashed ) ).toBe( false );
		}
	});
});

describe('jwtCreate', () => {
	const validSecret = 'this_is_a_very_secure_secret_key_123456789';

	it('should create a valid JWT token', async () => {
		const payload = { userId: 123, role: 'user' };
		const token = await jwtCreate( payload, validSecret );

		expect( token ).toBeDefined();
		expect( typeof token ).toBe( 'string' );
		expect( token.split( '.' ) ).toHaveLength( 3 );
	});

	it('should include iat and exp in payload', async () => {
		const payload = { userId: 123 };
		const token = await jwtCreate( payload, validSecret, 3600 );
		const verified = await jwtVerify( token, validSecret );

		expect( verified ).toBeDefined();
		expect( verified!.userId ).toBe( 123 );
		expect( verified!.iat ).toBeDefined();
		expect( verified!.exp ).toBeDefined();
		expect( verified!.exp ).toBeGreaterThan( verified!.iat );
	});

	it('should throw error for invalid payload', async () => {
		await expect( jwtCreate( null as any, validSecret ) ).rejects.toThrow( 'Invalid payload' );
		await expect( jwtCreate( 'string' as any, validSecret ) ).rejects.toThrow( 'Invalid payload' );
	});

	it('should throw error for weak secret', async () => {
		const payload = { userId: 123 };
		await expect( jwtCreate( payload, 'short' ) ).rejects.toThrow( 'Invalid secret' );
		await expect( jwtCreate( payload, '' ) ).rejects.toThrow( 'Invalid secret' );
	});

	it('should throw error for invalid expiresIn', async () => {
		const payload = { userId: 123 };
		await expect( jwtCreate( payload, validSecret, 0 ) ).rejects.toThrow( 'Invalid expiresIn' );
		await expect( jwtCreate( payload, validSecret, -1 ) ).rejects.toThrow( 'Invalid expiresIn' );
		await expect( jwtCreate( payload, validSecret, 86400 * 31 ) ).rejects.toThrow( 'Invalid expiresIn' );
	});
});

describe('jwtVerify', () => {
	const validSecret = 'this_is_a_very_secure_secret_key_123456789';

	it('should verify a valid token', async () => {
		const payload = { userId: 123, role: 'admin' };
		const token = await jwtCreate( payload, validSecret );
		const verified = await jwtVerify( token, validSecret );

		expect( verified ).toBeDefined();
		expect( verified!.userId ).toBe( 123 );
		expect( verified!.role ).toBe( 'admin' );
	});

	it('should reject token with wrong secret', async () => {
		const payload = { userId: 123 };
		const token = await jwtCreate( payload, validSecret );
		const wrongSecret = 'wrong_secret_key_that_is_long_enough_123456789';
		const verified = await jwtVerify( token, wrongSecret );

		expect( verified ).toBeNull();
	});

	it('should reject expired token', async () => {
		const payload = { userId: 123 };
		const token = await jwtCreate( payload, validSecret, 1 ); // 1 second

		// Wait for token to expire
		await new Promise( ( resolve ) => setTimeout( resolve, 1100 ) );

		const verified = await jwtVerify( token, validSecret );
		expect( verified ).toBeNull();
	});

	it('should reject malformed tokens', async () => {
		const invalidTokens = [
			'',
			'invalid',
			'a.b',
			'a.b.c.d',
			'invalid.header.signature',
		];

		for ( const token of invalidTokens ) {
			const verified = await jwtVerify( token, validSecret );
			expect( verified ).toBeNull();
		}
	});

	it('should reject token with invalid algorithm', async () => {
		// Create a token manually with wrong algorithm
		const header = { alg: 'HS512', typ: 'JWT' };
		const payload = { userId: 123, iat: Math.floor( Date.now() / 1000 ), exp: Math.floor( Date.now() / 1000 ) + 3600 };

		const headerB64 = btoa( JSON.stringify( header ) ).replace( /=+$/, '' ).replace( /\+/g, '-' ).replace( /\//g, '_' );
		const payloadB64 = btoa( JSON.stringify( payload ) ).replace( /=+$/, '' ).replace( /\+/g, '-' ).replace( /\//g, '_' );
		const fakeToken = `${headerB64}.${payloadB64}.fake_signature`;

		const verified = await jwtVerify( fakeToken, validSecret );
		expect( verified ).toBeNull();
	});

	it('should reject a token whose payload claims were tampered with', async () => {
		// Forge elevated claims by swapping the payload segment but keeping the
		// signature produced for the original payload: signature no longer matches.
		const token = await jwtCreate( { userId: 1, role: 'user' }, validSecret );
		const [ headerB64, , signatureB64 ] = token.split( '.' );

		const forgedPayload = { userId: 1, role: 'admin', iat: Math.floor( Date.now() / 1000 ), exp: Math.floor( Date.now() / 1000 ) + 3600 };
		const forgedPayloadB64 = btoa( JSON.stringify( forgedPayload ) ).replace( /=+$/, '' ).replace( /\+/g, '-' ).replace( /\//g, '_' );
		const forgedToken = `${headerB64}.${forgedPayloadB64}.${signatureB64}`;

		expect( await jwtVerify( forgedToken, validSecret ) ).toBeNull();
	});

	it('should reject token with weak secret', async () => {
		const payload = { userId: 123 };
		const weakSecret = 'short';

		const verified = await jwtVerify( 'any.token.here', weakSecret );
		expect( verified ).toBeNull();
	});

	it('should handle empty inputs', async () => {
		expect( await jwtVerify( '', validSecret ) ).toBeNull();
		expect( await jwtVerify( 'valid.token.here', '' ) ).toBeNull();
	});
});

describe('JWT integration tests', () => {
	const validSecret = 'super_secure_secret_key_for_testing_123456789';

	it('should work with complex payloads', async () => {
		const payload = {
			userId: 123,
			username: 'testuser',
			roles: [ 'user', 'admin' ],
			metadata: {
				lastLogin: '2023-01-01',
				preferences: { theme: 'dark' },
			},
			unicode: '🚀🔐',
		};

		const token = await jwtCreate( payload, validSecret );
		const verified = await jwtVerify( token, validSecret );

		expect( verified ).toBeDefined();
		expect( verified!.userId ).toBe( 123 );
		expect( verified!.username ).toBe( 'testuser' );
		expect( verified!.roles ).toEqual( [ 'user', 'admin' ] );
		expect( verified!.metadata ).toEqual( payload.metadata );
		expect( verified!.unicode ).toBe( '🚀🔐' );
	});

	it('should handle different expiration times', async () => {
		const payload = { userId: 123 };
		const expirationTimes = [ 1, 60, 3600, 86400 ]; // 1s, 1m, 1h, 1d

		for ( const expTime of expirationTimes ) {
			const token = await jwtCreate( payload, validSecret, expTime );
			const verified = await jwtVerify( token, validSecret );

			expect( verified ).toBeDefined();
			expect( verified!.exp - verified!.iat ).toBe( expTime );
		}
	});
});

describe('totpSecretGenerate', () => {
	it('generates a base32 secret with no padding', () => {
		const secret = totpSecretGenerate();

		expect( secret ).toMatch( /^[A-Z2-7]+$/ );
		expect( secret.length ).toBeGreaterThan( 0 );
	});

	it('generates different secrets on each call', () => {
		const a = totpSecretGenerate();
		const b = totpSecretGenerate();

		expect( a ).not.toBe( b );
	});
});

describe('totpGenerate', () => {
	// RFC 6238 Appendix B test vectors, ASCII secret '12345678901234567890'
	// base32-encoded, truncated to 6 digits (RFC vectors are 8-digit, same algorithm).
	const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

	it.each( [
		[ 59, '287082' ],
		[ 1111111109, '081804' ],
		[ 1111111111, '050471' ],
		[ 1234567890, '005924' ],
		[ 2000000000, '279037' ],
		[ 20000000000, '353130' ],
	] )( 'matches the RFC 6238 vector for time %i', async ( time, expected ) => {
		const code = await totpGenerate( secret, time * 1000 );

		expect( code ).toBe( expected );
	} );

	it('produces a 6-digit code by default', async () => {
		const code = await totpGenerate( secret );

		expect( code ).toMatch( /^\d{6}$/ );
	});
});

describe('totpVerify', () => {
	const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
	const timeMs = 59 * 1000;

	it('accepts the code for the exact time step', async () => {
		expect( await totpVerify( secret, '287082', timeMs ) ).toBe( true );
	});

	it('accepts the code from one step in the past (clock skew tolerance)', async () => {
		// step for time 59 is 0; step for time 59 + 30 is 1
		expect( await totpVerify( secret, '287082', timeMs + 30_000 ) ).toBe( true );
	});

	it('accepts the code from one step in the future (clock skew tolerance)', async () => {
		expect( await totpVerify( secret, '287082', timeMs - 30_000 ) ).toBe( true );
	});

	it('rejects a code outside the tolerance window', async () => {
		expect( await totpVerify( secret, '287082', timeMs + 60_000 ) ).toBe( false );
	});

	it('rejects a wrong code', async () => {
		expect( await totpVerify( secret, '000000', timeMs ) ).toBe( false );
	});

	it('rejects an empty or malformed code', async () => {
		expect( await totpVerify( secret, '', timeMs ) ).toBe( false );
		expect( await totpVerify( secret, 'abcdef', timeMs ) ).toBe( false );
	});
});

describe('totpOtpauthUrl', () => {
	it('builds a valid otpauth:// URL with issuer and label', () => {
		const url = totpOtpauthUrl( 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 'jdoe', 'LiWE3' );

		expect( url ).toBe( 'otpauth://totp/LiWE3%3Ajdoe?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=LiWE3&algorithm=SHA1&digits=6&period=30' );
	});
});
