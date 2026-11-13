import { describe, expect, it } from 'vitest';
import { clampNumeric, sanitizeText, spliceText } from '../datagrid_edit';
import type { DataGridField } from '../datagrid_types';

const field = ( options : DataGridField['options'] ) : DataGridField => ( {
	name: 'f',
	type: 'string',
	options,
} );

describe('datagrid_edit', () => {
	it('sanitizeText leaves the value untouched without options', () => {
		expect( sanitizeText( 'AbC-1', field( undefined ) ) ).toBe( 'AbC-1' );
	});

	it('sanitizeText lowercases when options.lower is set', () => {
		expect( sanitizeText( 'AbC', field( { lower: true } ) ) ).toBe( 'abc' );
	});

	it('sanitizeText drops characters outside options.validChars', () => {
		expect( sanitizeText( 'a1b2c3', field( { validChars: 'abc' } ) ) ).toBe( 'abc' );
	});

	it('sanitizeText lowercases before applying validChars', () => {
		expect( sanitizeText( 'AbC', field( { lower: true, validChars: 'abc' } ) ) ).toBe( 'abc' );
	});

	it('clampNumeric returns null for a non numeric value', () => {
		expect( clampNumeric( NaN, field( { min: 0 } ) ) ).toBeNull();
	});

	it('clampNumeric clamps to min and max', () => {
		const f = field( { min: 10, max: 20 } );

		expect( clampNumeric( 5, f ) ).toBe( 10 );
		expect( clampNumeric( 25, f ) ).toBe( 20 );
		expect( clampNumeric( 15, f ) ).toBe( 15 );
	});

	it('spliceText replaces the selection', () => {
		expect( spliceText( 'hello', 'XY', 1, 3 ) ).toBe( 'hXYlo' );
		expect( spliceText( 'hello', 'XY', 5, 5 ) ).toBe( 'helloXY' );
	});
});
