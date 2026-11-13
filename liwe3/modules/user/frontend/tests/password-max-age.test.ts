import { describe, expect, it } from 'vitest';
import { maxAgeParams, parseMaxAgeDays } from '../src/password-max-age';

describe('parseMaxAgeDays', () => {
	it.each( [ '', '   ', null, undefined ] )( 'an empty field (%j) means "no value": ok with days undefined', ( raw ) => {
		const res = parseMaxAgeDays( raw );

		expect( res ).toEqual( { ok: true, days: undefined } );
	} );

	it('an empty field is undefined, never null and never 0', () => {
		const res = parseMaxAgeDays( '' );

		expect( res.ok && res.days ).toBeUndefined();
		expect( res.ok && res.days === null ).toBe( false );
	});

	it.each( [ [ '0', 0 ], [ 0, 0 ], [ '45', 45 ], [ ' 45 ', 45 ], [ 45, 45 ], [ '3650', 3650 ] ] )( 'reads %j as %d (0 is a real value: never expires)', ( raw, days ) => {
		expect( parseMaxAgeDays( raw ) ).toEqual( { ok: true, days } );
	} );

	it.each( [ '-1', '1.5', 'abc', '3651', 'NaN', 'Infinity', -1, 1.5, NaN ] )( 'rejects %j', ( raw ) => {
		const res = parseMaxAgeDays( raw );

		expect( res.ok ).toBe( false );
		expect( !res.ok && res.error ).toEqual( expect.any( String ) );
	} );
});

describe('maxAgeParams', () => {
	it('leaves the days key OUT when there is no value', () => {
		const params = maxAgeParams( 'user_1', undefined );

		expect( 'days' in params ).toBe( false );
		expect( JSON.stringify( params ) ).toBe( '{"id":"user_1"}' );
	});

	it('sends 0 as a value: it is not the same as no value', () => {
		expect( maxAgeParams( 'user_1', 0 ) ).toEqual( { id: 'user_1', days: 0 } );
	});

	it('sends a positive number', () => {
		expect( maxAgeParams( 'user_1', 45 ) ).toEqual( { id: 'user_1', days: 45 } );
	});
});
