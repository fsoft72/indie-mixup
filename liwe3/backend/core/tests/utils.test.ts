import { describe, expect, it } from 'vitest';
import { isObject, keys_filter, keys_valid, merge } from '../src/utils';

describe('keys_filter', () => {
	it('should filter keys based on type definition', () => {
		const obj = {
			name: 'John',
			age: 30,
			email: 'john@example.com',
			password: 'secret',
		};

		const type_def = {
			name: { type: 'string' },
			age: { type: 'number' },
			email: { type: 'string' },
		};

		keys_filter( obj, type_def );

		expect( obj ).toEqual( {
			name: 'John',
			age: 30,
			email: 'john@example.com',
		} );
		expect( obj ).not.toHaveProperty( 'password' );
	});

	it('should remove private keys', () => {
		const obj = {
			public: 'visible',
			private: 'secret',
		};

		const type_def = {
			public: { type: 'string' },
			private: { type: 'string', priv: true },
		};

		keys_filter( obj, type_def );

		expect( obj ).toEqual( { public: 'visible' } );
		expect( obj ).not.toHaveProperty( 'private' );
	});

	it('should handle array to string conversion', () => {
		const obj = {
			singleValue: [ 'first', 'second', 'third' ],
			emptyArray: [],
		};

		const type_def = {
			singleValue: { type: 'string' },
			emptyArray: { type: 'string' },
		};

		keys_filter( obj, type_def );

		expect( obj.singleValue ).toBe( 'first' );
		expect( obj.emptyArray ).toBe( '' );
	});

	it('should handle null/undefined objects', () => {
		expect( () => keys_filter( null, {} ) ).not.toThrow();
		expect( () => keys_filter( undefined, {} ) ).not.toThrow();
	});

	it('should handle objects without type definitions', () => {
		const obj = { a: 1, b: 2 };
		keys_filter( obj, {} );
		expect( obj ).toEqual( {} );
	});

	it('should preserve non-array values for string type', () => {
		const obj = {
			stringValue: 'hello',
			numberValue: 42,
		};

		const type_def = {
			stringValue: { type: 'string' },
			numberValue: { type: 'string' },
		};

		keys_filter( obj, type_def );

		expect( obj.stringValue ).toBe( 'hello' );
		expect( obj.numberValue ).toBe( 42 );
	});
});

describe('keys_valid', () => {
	it('should return object with only defined values', () => {
		const input = {
			name: 'John',
			age: undefined,
			email: 'john@example.com',
			phone: null,
			address: undefined,
		};

		const result = keys_valid( input );

		expect( result ).toEqual( {
			name: 'John',
			email: 'john@example.com',
			phone: null,
		} );
	});

	it('should preserve falsy values except undefined', () => {
		const input = {
			zero: 0,
			empty: '',
			false_val: false,
			null_val: null,
			undefined_val: undefined,
		};

		const result = keys_valid( input );

		expect( result ).toEqual( {
			zero: 0,
			empty: '',
			false_val: false,
			null_val: null,
		} );
		expect( result ).not.toHaveProperty( 'undefined_val' );
	});

	it('should return empty object for all undefined values', () => {
		const input = {
			a: undefined,
			b: undefined,
			c: undefined,
		};

		const result = keys_valid( input );

		expect( result ).toEqual( {} );
	});

	it('should return new object, not modify original', () => {
		const input = { a: 1, b: undefined };
		const result = keys_valid( input );

		expect( result ).not.toBe( input );
		expect( input.b ).toBeUndefined(); // Original unchanged
	});
});

describe('isObject', () => {
	it('should return true for plain objects', () => {
		expect( isObject( {} ) ).toBe( true );
		expect( isObject( { a: 1 } ) ).toBe( true );
		expect( isObject( new Object() ) ).toBe( true );
	});

	it('should return false for arrays', () => {
		expect( isObject( [] ) ).toBe( false );
		expect( isObject( [ 1, 2, 3 ] ) ).toBe( false );
	});

	it('should return false for primitives', () => {
		expect( isObject( null ) ).toBe( false ); // null is falsy
		expect( isObject( undefined ) ).toBe( false );
		expect( isObject( '' ) ).toBe( false );
		expect( isObject( 'string' ) ).toBe( false );
		expect( isObject( 42 ) ).toBe( false );
		expect( isObject( true ) ).toBe( false );
		expect( isObject( false ) ).toBe( false );
	});

	it('should return false for functions', () => {
		expect( isObject( () => {} ) ).toBe( false );
		expect( isObject( function() {} ) ).toBe( false );
	});

	it('should return false for dates', () => {
		expect( isObject( new Date() ) ).toBe( false );
	});
});

describe('merge', () => {
	it('should merge two objects', () => {
		const target = { a: 1, b: 2 };
		const source = { b: 3, c: 4 };

		const result = merge( target, source );

		expect( result ).toEqual( { a: 1, b: 3, c: 4 } );
		expect( result ).toBe( target ); // Should mutate target
	});

	it('should deep merge nested objects', () => {
		const target = {
			user: { name: 'John', age: 30 },
			settings: { theme: 'dark' },
		};

		const source = {
			user: { email: 'john@example.com', age: 31 },
			settings: { language: 'en' },
		};

		const result = merge( target, source );

		expect( result ).toEqual( {
			user: { name: 'John', age: 31, email: 'john@example.com' },
			settings: { theme: 'dark', language: 'en' },
		} );
	});

	it('should handle multiple sources', () => {
		const target = { a: 1 };
		const source1 = { b: 2 };
		const source2 = { c: 3 };
		const source3 = { d: 4 };

		const result = merge( target, source1, source2, source3 );

		expect( result ).toEqual( { a: 1, b: 2, c: 3, d: 4 } );
	});

	it('should handle empty sources', () => {
		const target = { a: 1 };

		const result = merge( target );

		expect( result ).toEqual( { a: 1 } );
		expect( result ).toBe( target );
	});

	it('should create nested objects when target lacks them', () => {
		const target = {};
		const source = { nested: { deep: { value: 42 } } };

		const result = merge( target, source );

		expect( result ).toEqual( { nested: { deep: { value: 42 } } } );
	});

	it('should handle non-object values', () => {
		const target = { a: 1 };
		const source = { a: 'string', b: true, c: null };

		const result = merge( target, source );

		expect( result ).toEqual( { a: 'string', b: true, c: null } );
	});

	it('should not merge arrays deeply', () => {
		const target = { arr: [ 1, 2 ] };
		const source = { arr: [ 3, 4 ] };

		const result = merge( target, source );

		expect( result ).toEqual( { arr: [ 3, 4 ] } );
	});

	it('should handle null and undefined sources', () => {
		const target = { a: 1 };

		// These should not cause errors
		expect( () => merge( target, null ) ).not.toThrow();
		expect( () => merge( target, undefined ) ).not.toThrow();
	});
});
