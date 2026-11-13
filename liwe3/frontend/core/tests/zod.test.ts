import { describe, expect, it } from 'vitest';
import { zodErrorToString } from '../src/utils/zod';

describe('zodErrorToString', () => {
	it('should handle null/undefined error', () => {
		expect( zodErrorToString( null ) ).toEqual( [ 'Unknown error' ] );
		expect( zodErrorToString( undefined ) ).toEqual( [ 'Unknown error' ] );
		expect( zodErrorToString( '' ) ).toEqual( [ 'Unknown error' ] );
	});

	it('should handle error object with error property', () => {
		const errorWrapper = {
			error: [
				{
					path: [ 'username' ],
					message: 'Username is required',
				},
			],
		};

		const result = zodErrorToString( errorWrapper );
		expect( result ).toEqual( [ 'username: Username is required' ] );
	});

	it('should handle error object with message property as string', () => {
		const errorWithMessage = {
			message: '[{"path":["email"],"message":"Invalid email format"}]',
		};

		const result = zodErrorToString( errorWithMessage );
		expect( result ).toEqual( [ 'email: Invalid email format' ] );
	});

	it('should handle JSON string array input', () => {
		const jsonString = '[{"path":["username"],"message":"Too small: expected string to have >=5 characters"},{"path":["email"],"message":"Invalid email address"}]';

		const result = zodErrorToString( jsonString );
		expect( result ).toEqual( [
			'username: Too small: expected string to have >=5 characters',
			'email: Invalid email address',
		] );
	});

	it('should handle malformed JSON string input', () => {
		const malformedJson = '[invalid json';

		const result = zodErrorToString( malformedJson );
		expect( result ).toEqual( [ '[invalid json' ] );
	});

	it('should handle array of zod error objects directly', () => {
		const zodErrors = [
			{
				origin: 'string',
				code: 'too_small',
				minimum: 5,
				inclusive: true,
				path: [ 'username' ],
				message: 'Too small: expected string to have >=5 characters',
			},
			{
				origin: 'string',
				code: 'invalid_format',
				format: 'email',
				path: [ 'email' ],
				message: 'Invalid email address',
			},
			{
				origin: 'string',
				code: 'too_small',
				minimum: 5,
				inclusive: true,
				path: [ 'password' ],
				message: 'Too small: expected string to have >=5 characters',
			},
		];

		const result = zodErrorToString( zodErrors );
		expect( result ).toEqual( [
			'username: Too small: expected string to have >=5 characters',
			'email: Invalid email address',
			'password: Too small: expected string to have >=5 characters',
		] );
	});

	it('should handle single error object', () => {
		const singleError = [
			{
				path: [ 'name' ],
				message: 'Name is required',
			},
		];

		const result = zodErrorToString( singleError );
		expect( result ).toEqual( [ 'name: Name is required' ] );
	});

	it('should handle errors with nested paths', () => {
		const nestedError = [
			{
				path: [ 'user', 'profile', 'firstName' ],
				message: 'First name is required',
			},
		];

		const result = zodErrorToString( nestedError );
		expect( result ).toEqual( [ 'user: First name is required' ] );
	});

	it('should handle errors with empty paths', () => {
		const emptyPathError = [
			{
				path: [],
				message: 'Root validation error',
			},
		];

		const result = zodErrorToString( emptyPathError );
		expect( result ).toEqual( [ ': Root validation error' ] );
	});

	it('should handle errors with missing path property', () => {
		const noPathError = [
			{
				message: 'General validation error',
			},
		];

		// This should handle gracefully and return empty field name
		const result = zodErrorToString( noPathError );
		expect( result ).toEqual( [ ': General validation error' ] );
	});

	it('should handle mixed error formats in sequence', () => {
		// Test the function with wrapped error first, then direct array
		const wrappedError = {
			error: {
				message: '[{"path":["field1"],"message":"Error 1"}]',
			},
		};

		const result1 = zodErrorToString( wrappedError );
		expect( result1 ).toEqual( [ 'field1: Error 1' ] );

		// Then test with direct array
		const directArray = [
			{
				path: [ 'field2' ],
				message: 'Error 2',
			},
		];

		const result2 = zodErrorToString( directArray );
		expect( result2 ).toEqual( [ 'field2: Error 2' ] );
	});

	it('should handle string that looks like JSON but is not an array', () => {
		const jsonObject = '{"error": "not an array"}';

		const result = zodErrorToString( jsonObject );
		expect( result ).toEqual( [ jsonObject ] );
	});

	it('should handle valid JSON array with missing required properties', () => {
		const invalidStructure = [
			{
				code: 'invalid',
				// missing path and message
			},
		];

		// Should handle gracefully and return default message
		const result = zodErrorToString( invalidStructure );
		expect( result ).toEqual( [ ': Unknown error' ] );
	});

	it('should handle non-object items in error array', () => {
		const mixedArray = [
			{
				path: [ 'validField' ],
				message: 'Valid error',
			},
			'string error',
			null,
			undefined,
			123,
		];

		const result = zodErrorToString( mixedArray );
		expect( result ).toEqual( [ 'validField: Valid error' ] );
	});

	it('should handle empty array', () => {
		const emptyArray : any[] = [];

		const result = zodErrorToString( emptyArray );
		expect( result ).toEqual( [ 'Unknown error' ] );
	});

	it('should handle complex nested error structure', () => {
		const complexError = {
			error: {
				message: JSON.stringify( [
					{
						path: [ 'user', 'preferences', 'theme' ],
						message: 'Invalid theme selection',
					},
					{
						path: [ 'settings' ],
						message: 'Settings validation failed',
					},
				] ),
			},
		};

		const result = zodErrorToString( complexError );
		expect( result ).toEqual( [
			'user: Invalid theme selection',
			'settings: Settings validation failed',
		] );
	});

	it('should handle numeric and boolean values as error input', () => {
		expect( zodErrorToString( 0 ) ).toEqual( [ 'Unknown error' ] ); // falsy value treated as no error
		expect( zodErrorToString( false ) ).toEqual( [ 'Unknown error' ] ); // falsy value
		expect( zodErrorToString( true ) ).toEqual( [ 'true' ] );
		expect( zodErrorToString( 42 ) ).toEqual( [ '42' ] );
	});

	it('should handle JSON string with single error object', () => {
		const singleErrorJson = '[{"path":["email"],"message":"Email is required"}]';

		const result = zodErrorToString( singleErrorJson );
		expect( result ).toEqual( [ 'email: Email is required' ] );
	});
});
