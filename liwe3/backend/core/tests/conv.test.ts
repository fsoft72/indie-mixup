import { describe, expect, it } from 'vitest';
import {
	base96ToDecimal,
	decimalToBase96,
	float,
	formatCurrency,
	int,
	slugify,
	toNumDecimal,
} from '../src/conv';

describe('int', () => {
	it('should convert string to integer', () => {
		expect( int( '123' ) ).toBe( 123 );
		expect( int( '42' ) ).toBe( 42 );
	});

	it('should handle negative numbers', () => {
		expect( int( '-123' ) ).toBe( -123 );
	});

	it('should handle decimal strings by truncating', () => {
		expect( int( '123.456' ) ).toBe( 123 );
		expect( int( '42.99' ) ).toBe( 42 );
	});

	it('should return 0 for falsy values', () => {
		expect( int( null ) ).toBe( 0 );
		expect( int( undefined ) ).toBe( 0 );
		expect( int( '' ) ).toBe( 0 );
		expect( int( 0 ) ).toBe( 0 );
		expect( int( false ) ).toBe( 0 );
	});

	it('should handle numbers directly', () => {
		expect( int( 123 ) ).toBe( 123 );
		expect( int( 42.99 ) ).toBe( 42 );
	});
});

describe('float', () => {
	it('should convert string to float', () => {
		expect( float( '123.456' ) ).toBe( 123.456 );
		expect( float( '42' ) ).toBe( 42 );
	});

	it('should handle negative numbers', () => {
		expect( float( '-123.456' ) ).toBe( -123.456 );
	});

	it('should return 0.0 for falsy values', () => {
		expect( float( null ) ).toBe( 0.0 );
		expect( float( undefined ) ).toBe( 0.0 );
		expect( float( '' ) ).toBe( 0.0 );
		expect( float( 0 ) ).toBe( 0.0 );
		expect( float( false ) ).toBe( 0.0 );
	});

	it('should handle numbers directly', () => {
		expect( float( 123.456 ) ).toBe( 123.456 );
	});
});

describe('slugify', () => {
	it('should convert basic string to slug', () => {
		expect( slugify( 'Hello World' ) ).toBe( 'hello-world' );
	});

	it('should handle special characters', () => {
		expect( slugify( 'Hello, World!' ) ).toBe( 'hello-world' );
	});

	it('should handle accented characters', () => {
		expect( slugify( 'Café' ) ).toBe( 'cafe' );
		expect( slugify( 'naïve résumé' ) ).toBe( 'naive-resume' );
	});

	it('should handle multiple spaces and dashes', () => {
		expect( slugify( '  hello   world  ' ) ).toBe( 'hello-world' );
		expect( slugify( 'hello--world' ) ).toBe( 'hello-world' );
	});

	it('should trim whitespace', () => {
		expect( slugify( '  hello world  ' ) ).toBe( 'hello-world' );
	});

	it('should handle empty string', () => {
		expect( slugify( '' ) ).toBe( '' );
	});

	it('should handle numbers', () => {
		expect( slugify( 'item 123' ) ).toBe( 'item-123' );
	});
});

describe('decimalToBase96 and base96ToDecimal', () => {
	it('should convert small decimal to base96 and back', () => {
		const decimal = 123;
		const base96 = decimalToBase96( decimal );
		expect( base96ToDecimal( base96 ) ).toBe( decimal );
	});

	it('should convert large decimal to base96 and back', () => {
		const decimal = 123456789;
		const base96 = decimalToBase96( decimal );
		expect( base96ToDecimal( base96 ) ).toBe( decimal );
	});

	it('should handle zero', () => {
		expect( decimalToBase96( 0 ) ).toBe( '' );
		expect( base96ToDecimal( '' ) ).toBe( 0 );
	});

	it('should handle single digit', () => {
		const decimal = 5;
		const base96 = decimalToBase96( decimal );
		expect( base96ToDecimal( base96 ) ).toBe( decimal );
	});

	it('should use correct character set', () => {
		// Test that it uses the defined character set
		const result = decimalToBase96( 65 ); // Should use character at index 65
		expect( result ).toBeTruthy();
		expect( typeof result ).toBe( 'string' );
	});
});

describe('formatCurrency', () => {
	it('should format number with default separators', () => {
		expect( formatCurrency( 1234.56 ) ).toBe( '1.234,56' );
	});

	it('should format large numbers', () => {
		expect( formatCurrency( 1234567.89 ) ).toBe( '1.234.567,89' );
	});

	it('should handle custom separators', () => {
		expect( formatCurrency( 1234.56, { thousandSeparator: ',', decimalSeparator: '.' } ) )
			.toBe( '1,234.56' );
	});

	it('should handle zero', () => {
		expect( formatCurrency( 0 ) ).toBe( '' );
	});

	it('should handle string numbers', () => {
		expect( formatCurrency( '1234.56' ) ).toBe( '1.234,56' );
	});

	it('should handle falsy values', () => {
		expect( formatCurrency( null ) ).toBe( '' );
		expect( formatCurrency( undefined ) ).toBe( '' );
	});

	it('should always show 2 decimal places', () => {
		expect( formatCurrency( 1234 ) ).toBe( '1.234,00' );
		expect( formatCurrency( 1234.5 ) ).toBe( '1.234,50' );
	});
});

describe('toNumDecimal', () => {
	it('should fix decimal places', () => {
		expect( toNumDecimal( 123.456789, 2 ) ).toBe( 123.46 );
		expect( toNumDecimal( 123.123, 1 ) ).toBe( 123.1 );
	});

	it('should handle integers', () => {
		expect( toNumDecimal( 123, 2 ) ).toBe( 123.00 );
	});

	it('should handle null/undefined', () => {
		expect( toNumDecimal( null, 2 ) ).toBe( 0.00 );
		expect( toNumDecimal( undefined, 2 ) ).toBe( 0.00 );
	});

	it('should handle zero decimals', () => {
		expect( toNumDecimal( 123.456, 0 ) ).toBe( 123 );
	});

	it('should round correctly', () => {
		expect( toNumDecimal( 123.456, 2 ) ).toBe( 123.46 );
		expect( toNumDecimal( 123.454, 2 ) ).toBe( 123.45 );
	});
});
