import { describe, expect, it } from 'vitest';
import { LiWEError, LiWEResponse, createResponse, responseError, responseSuccess } from '../src/response';

describe('createResponse', () => {
	it('should create success response with data', () => {
		const data = { id: 1, name: 'test' };
		const result = createResponse( undefined, data );

		expect( result ).toEqual( {
			status: 200,
			ok: true,
			data,
		} );
	});

	it('should create success response without data', () => {
		const result = createResponse();

		expect( result ).toEqual( {
			status: 200,
			ok: true,
		} );
	});

	it('should create error response', () => {
		const error : LiWEError = {
			message: 'Something went wrong',
			code: 'ERROR_CODE',
		};
		const result = createResponse( error, undefined, 400 );

		expect( result ).toEqual( {
			status: 400,
			ok: false,
			error,
			message: 'Something went wrong',
		} );
	});

	it('should exclude data when null', () => {
		const result = createResponse( undefined, null );

		expect( result ).toEqual( {
			status: 200,
			ok: true,
		} );
		expect( result ).not.toHaveProperty( 'data' );
	});

	it('should exclude data when undefined', () => {
		const result = createResponse( undefined, undefined );

		expect( result ).toEqual( {
			status: 200,
			ok: true,
		} );
		expect( result ).not.toHaveProperty( 'data' );
	});

	it('should include data when value is 0', () => {
		const result = createResponse( undefined, 0 );

		expect( result ).toEqual( {
			status: 200,
			ok: true,
			data: 0,
		} );
	});

	it('should include data when value is empty string', () => {
		const result = createResponse( undefined, '' );

		expect( result ).toEqual( {
			status: 200,
			ok: true,
			data: '',
		} );
	});

	it('should include data when value is false', () => {
		const result = createResponse( undefined, false );

		expect( result ).toEqual( {
			status: 200,
			ok: true,
			data: false,
		} );
	});

	it('should handle custom status codes', () => {
		const result = createResponse( undefined, { message: 'created' }, 201 );

		expect( result.status ).toBe( 201 );
		expect( result.ok ).toBe( true );
	});

	it('should include error message in response', () => {
		const error : LiWEError = {
			message: 'Validation failed',
			code: 'VALIDATION_ERROR',
			level: 'error',
		};
		const result = createResponse( error );

		expect( result.message ).toBe( 'Validation failed' );
		expect( result.error ).toBe( error );
	});
});

describe('responseSuccess', () => {
	it('should create success response with data', () => {
		const data = { success: true };
		const result = responseSuccess( data );

		expect( result ).toEqual( {
			status: 200,
			ok: true,
			data,
		} );
	});

	it('should create success response without data', () => {
		const result = responseSuccess();

		expect( result ).toEqual( {
			status: 200,
			ok: true,
		} );
	});

	it('should handle custom status codes', () => {
		const result = responseSuccess( { created: true }, 201 );

		expect( result.status ).toBe( 201 );
		expect( result.ok ).toBe( true );
	});

	it('should work with different data types', () => {
		expect( responseSuccess( 'text' ).data ).toBe( 'text' );
		expect( responseSuccess( 123 ).data ).toBe( 123 );
		expect( responseSuccess( true ).data ).toBe( true );
		expect( responseSuccess( [ 1, 2, 3 ] ).data ).toEqual( [ 1, 2, 3 ] );
	});
});

describe('responseError', () => {
	it('should create error response with message only', () => {
		const result = responseError( 'Something failed' );

		expect( result ).toEqual( {
			status: 400,
			ok: false,
			message: 'Something failed',
			error: {
				message: 'Something failed',
				level: 'error',
				code: '',
			},
		} );
	});

	it('should create error response with code', () => {
		const result = responseError( 'Not found', 400, 'NOT_FOUND' );

		expect( result ).toEqual( {
			status: 400,
			ok: false,
			message: 'Not found',
			error: {
				message: 'Not found',
				code: 'NOT_FOUND',
				level: 'error',
			},
		} );
	});

	it('should handle custom error levels', () => {
		const result = responseError( 'Warning message', 403, 'WARN_CODE', 'warning' );

		expect( result.error?.level ).toBe( 'warning' );
	});

	it('should handle custom status codes', () => {
		const result = responseError( 'Not found', 404, 'NOT_FOUND', 'error' );

		expect( result.status ).toBe( 404 );
	});

	it('should handle info level errors', () => {
		const result = responseError( 'Info message', 200, 'INFO_CODE', 'info' );

		expect( result.error?.level ).toBe( 'info' );
		expect( result.status ).toBe( 200 );
	});

	it('should default to error level', () => {
		const result = responseError( 'Error message' );

		expect( result.error?.level ).toBe( 'error' );
	});
});

describe('Type compatibility', () => {
	it('should handle generic types in createResponse', () => {
		interface User {
			id : number;
			name : string;
		}

		const user : User = { id: 1, name: 'John' };
		const result : LiWEResponse<User> = createResponse( undefined, user );

		expect( result.data ).toBe( user );
		expect( result.ok ).toBe( true );
	});

	it('should handle generic types in responseSuccess', () => {
		interface ApiResponse {
			count : number;
			items : string[];
		}

		const apiData : ApiResponse = { count: 2, items: [ 'a', 'b' ] };
		const result : LiWEResponse<ApiResponse> = responseSuccess( apiData );

		expect( result.data ).toBe( apiData );
	});

	it('should handle generic types in responseError', () => {
		interface ErrorData {
			field : string;
			value : string;
		}

		const result : LiWEResponse<ErrorData> = responseError( 'Validation error' );

		expect( result.ok ).toBe( false );
		expect( result.error?.message ).toBe( 'Validation error' );
	});
});
