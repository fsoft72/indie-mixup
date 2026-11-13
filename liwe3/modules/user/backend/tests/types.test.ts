import { describe, expect, it } from 'vitest';
import { type User, ZUser } from '../src/types';

describe('ZUser', () => {
	it('validates a minimal user with only the required username', () => {
		const result = ZUser.safeParse( { username: 'testuser' } );

		expect( result.success ).toBe( true );
		if ( result.success ) {
			expect( result.data.username ).toBe( 'testuser' );
			expect( result.data.enabled ).toBe( false );
			expect( result.data.email_verified ).toBe( false );
			expect( result.data.two_factor_enabled ).toBe( false );
		}
	});

	it('requires username', () => {
		const result = ZUser.safeParse( { email: 'test@example.com' } );

		expect( result.success ).toBe( false );
		if ( !result.success ) {
			expect( result.error.issues.some( ( issue ) => issue.path.includes( 'username' ) ) ).toBe( true );
		}
	});

	it('rejects a username longer than 64 characters', () => {
		const result = ZUser.safeParse( { username: 'a'.repeat( 65 ) } );

		expect( result.success ).toBe( false );
		if ( !result.success ) {
			expect( result.error.issues[0].path ).toContain( 'username' );
		}
	});

	it('accepts an email string up to 250 characters (no format validation)', () => {
		const result = ZUser.safeParse( { username: 'testuser', email: 'not-an-email-but-short-enough' } );

		expect( result.success ).toBe( true );
	});

	it('rejects a domain longer than 64 characters', () => {
		const result = ZUser.safeParse( { username: 'testuser', domain: 'a'.repeat( 65 ) } );

		expect( result.success ).toBe( false );
		if ( !result.success ) {
			expect( result.error.issues.some( ( issue ) => issue.path.includes( 'domain' ) ) ).toBe( true );
		}
	});

	it('rejects name/lastname longer than 50 characters', () => {
		const result = ZUser.safeParse( {
			username: 'testuser',
			name: 'a'.repeat( 51 ),
			lastname: 'b'.repeat( 51 ),
		} );

		expect( result.success ).toBe( false );
		if ( !result.success ) {
			expect( result.error.issues.some( ( issue ) => issue.path.includes( 'name' ) ) ).toBe( true );
			expect( result.error.issues.some( ( issue ) => issue.path.includes( 'lastname' ) ) ).toBe( true );
		}
	});

	it('allows a short password but rejects one over 64 characters', () => {
		const short = ZUser.safeParse( { username: 'testuser', password: '123' } );
		expect( short.success ).toBe( true );

		const tooLong = ZUser.safeParse( { username: 'testuser', password: 'a'.repeat( 65 ) } );
		expect( tooLong.success ).toBe( false );
	});

	it('requires perms to be an array of strings, not a CSV string', () => {
		const asArray = ZUser.safeParse( { username: 'testuser', perms: [ 'admin', 'read', 'write' ] } );
		expect( asArray.success ).toBe( true );
		if ( asArray.success ) {
			expect( asArray.data.perms ).toEqual( [ 'admin', 'read', 'write' ] );
		}

		const asCsvString = ZUser.safeParse( { username: 'testuser', perms: 'admin,read,write' } );
		expect( asCsvString.success ).toBe( false );
	});

	it('coerces "true"/"1"/"false"/"0" strings for boolean fields, rejects other strings', () => {
		expect( ZUser.safeParse( { username: 'testuser', enabled: 'true' } ).success ).toBe( true );
		expect( ZUser.safeParse( { username: 'testuser', enabled: '1' } ).success ).toBe( true );
		expect( ZUser.safeParse( { username: 'testuser', enabled: 'false' } ).success ).toBe( true );
		expect( ZUser.safeParse( { username: 'testuser', enabled: 'yes' } ).success ).toBe( false );
	});

	it('validates a fully populated user', () => {
		const fullUser = {
			id: 'user_456',
			domain: 'example.com',
			email: 'full@example.com',
			username: 'fulluser',
			name: 'Full',
			lastname: 'User',
			perms: [ 'admin', 'read', 'write' ],
			enabled: true,
			password: 'fullpassword',
			token_version: 3,
			email_verified: true,
			verified_at: 1700000000000,
			id_role: 'role_1',
			two_factor_enabled: false,
		};

		const result = ZUser.safeParse( fullUser );
		expect( result.success ).toBe( true );
		if ( result.success ) {
			expect( result.data.id ).toBe( 'user_456' );
			expect( result.data.username ).toBe( 'fulluser' );
			expect( result.data.domain ).toBe( 'example.com' );
			expect( result.data.name ).toBe( 'Full' );
			expect( result.data.lastname ).toBe( 'User' );
			expect( result.data.perms ).toEqual( [ 'admin', 'read', 'write' ] );
			expect( result.data.enabled ).toBe( true );
			expect( result.data.email_verified ).toBe( true );
		}
	});
});

describe('User type', () => {
	it('only requires username, everything else is optional', () => {
		const user : User = { username: 'typetest' };

		expect( user.username ).toBe( 'typetest' );
		expect( user.email ).toBeUndefined();
	});
});
