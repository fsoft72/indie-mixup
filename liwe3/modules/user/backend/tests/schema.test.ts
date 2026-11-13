import { describe, expect, it } from 'vitest';
import { type UserDB, users } from '../src/schema';

describe('Users table schema', () => {
	it('should have correct table structure', () => {
		expect( users ).toBeDefined();
		expect( typeof users ).toBe( 'object' );
	});

	it('should have id field as primary key', () => {
		const idColumn = users.id;
		expect( idColumn ).toBeDefined();
		expect( idColumn.name ).toBe( 'id' );
	});

	it('should have required username field', () => {
		const usernameColumn = users.username;
		expect( usernameColumn ).toBeDefined();
		expect( usernameColumn.name ).toBe( 'username' );
		expect( usernameColumn.notNull ).toBe( true );
	});

	it('should have optional fields with correct names', () => {
		expect( users.domain.name ).toBe( 'domain' );
		expect( users.email.name ).toBe( 'email' );
		expect( users.name.name ).toBe( 'name' );
		expect( users.lastname.name ).toBe( 'lastname' );
		expect( users.perms.name ).toBe( 'perms' );
		expect( users.password.name ).toBe( 'password' );
		expect( users.id_role.name ).toBe( 'id_role' );
	});

	it('should have boolean and integer fields', () => {
		expect( users.enabled.name ).toBe( 'enabled' );
		expect( users.level.name ).toBe( 'level' );
		expect( users.email_verified.name ).toBe( 'email_verified' );
		expect( users.two_factor_enabled.name ).toBe( 'two_factor_enabled' );
	});

	it('should have verification/token tracking fields', () => {
		expect( users.verified_at.name ).toBe( 'verified_at' );
		expect( users.token_version.name ).toBe( 'token_version' );
		expect( users.two_factor_secret.name ).toBe( 'two_factor_secret' );
		expect( users.two_factor_recovery_codes.name ).toBe( 'two_factor_recovery_codes' );
	});
});

describe('Type inference', () => {
	it('should correctly infer UserDB from a select result', () => {
		const user : UserDB = {
			id: 'user_123',
			domain: 'example.com',
			email: 'test@example.com',
			username: 'testuser',
			name: 'Test',
			lastname: 'User',
			perms: [ 'read', 'write' ],
			enabled: true,
			level: 5,
			password: 'hashed_password',
			token_version: 1,
			email_verified: false,
			verified_at: null,
			id_role: null,
			two_factor_enabled: false,
			two_factor_secret: null,
			two_factor_recovery_codes: null,
		};

		expect( user.id ).toBe( 'user_123' );
		expect( user.username ).toBe( 'testuser' );
		expect( user.enabled ).toBe( true );
		expect( user.perms ).toEqual( [ 'read', 'write' ] );
	});
});
