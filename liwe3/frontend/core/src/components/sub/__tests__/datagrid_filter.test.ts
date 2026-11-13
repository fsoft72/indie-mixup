import { describe, expect, it } from 'vitest';
import { filterModes } from '../../../utils/match_filter';
import {
	applyFilters,
	buildFilters,
	removeFilter,
	rowMatchesFilters,
} from '../datagrid_filter';
import type { DataGridRow } from '../datagrid_types';

const data : DataGridRow[] = [
	{ id: '1', name: 'Charlie', age: 40, born: '1985-04-02' },
	{ id: '2', name: 'Alice', age: 30, born: '1995-01-20' },
	{ id: '3', name: 'Bob', age: 20, born: '2005-11-30' },
];

describe('datagrid_filter', () => {
	it('returns the same array when there are no filters', () => {
		expect( applyFilters( data ) ).toBe( data );
		expect( applyFilters( data, {} ) ).toBe( data );
	});

	it('filters with CONTAINS, case insensitive', () => {
		const res = applyFilters( data, {
			name: { mode: filterModes.CONTAINS, value: 'li' },
		} );

		expect( res.map( ( r ) => r.name ) ).toEqual( [ 'Charlie', 'Alice' ] );
	});

	it('filters numbers with GREATER_THAN_OR_EQUAL numerically', () => {
		const res = applyFilters( data, {
			age: { mode: filterModes.GREATER_THAN_OR_EQUAL, value: '30', type: 'number' },
		} );

		expect( res.map( ( r ) => r.age ) ).toEqual( [ 40, 30 ] );
	});

	it('filters numbers with LESS_THAN_OR_EQUAL numerically', () => {
		const res = applyFilters( data, {
			age: { mode: filterModes.LESS_THAN_OR_EQUAL, value: '30', type: 'number' },
		} );

		expect( res.map( ( r ) => r.age ) ).toEqual( [ 30, 20 ] );
	});

	it('filters dates with BETWEEN', () => {
		const res = applyFilters( data, {
			born: {
				mode: filterModes.BETWEEN,
				value: '1990-01-01|2000-01-01',
				type: 'date',
			},
		} );

		expect( res.map( ( r ) => r.name ) ).toEqual( [ 'Alice' ] );
	});

	it('filters numbers with BETWEEN', () => {
		const res = applyFilters( data, {
			age: { mode: filterModes.BETWEEN, value: '25|45', type: 'number' },
		} );

		expect( res.map( ( r ) => r.age ) ).toEqual( [ 40, 30 ] );
	});

	it('combines multiple filters with AND', () => {
		const res = applyFilters( data, {
			name: { mode: filterModes.CONTAINS, value: 'l' },
			age: { mode: filterModes.LESS_THAN_OR_EQUAL, value: '35', type: 'number' },
		} );

		expect( res.map( ( r ) => r.name ) ).toEqual( [ 'Alice' ] );
	});

	it('excludes rows with a falsy value on a filtered field', () => {
		const rows : DataGridRow[] = [ { id: '1', name: '' }, { id: '2', name: 'Alice' } ];

		const res = applyFilters( rows, {
			name: { mode: filterModes.CONTAINS, value: 'a' },
		} );

		expect( res.map( ( r ) => r.id ) ).toEqual( [ '2' ] );
	});

	it('does not filter on unhandled filter modes', () => {
		expect(
			rowMatchesFilters( data[0], { name: { mode: filterModes.IN, value: 'nope' } } ),
		).toBe( true );
	});

	it('buildFilters adds a filter without mutating the input', () => {
		const current = { name: { mode: filterModes.CONTAINS, value: 'a' } };
		const res = buildFilters( current, 'age', {
			mode: filterModes.GREATER_THAN_OR_EQUAL,
			value: '18',
			type: 'number',
		} );

		expect( Object.keys( res ) ).toEqual( [ 'name', 'age' ] );
		expect( Object.keys( current ) ).toEqual( [ 'name' ] );
	});

	it('buildFilters drops filters with an empty value', () => {
		const current = { name: { mode: filterModes.CONTAINS, value: 'a' } };
		const res = buildFilters( current, 'name', {
			mode: filterModes.CONTAINS,
			value: '',
		} );

		expect( res ).toEqual( {} );
	});

	it('removeFilter removes one filter without mutating the input', () => {
		const current = {
			name: { mode: filterModes.CONTAINS, value: 'a' },
			age: { mode: filterModes.CONTAINS, value: '3' },
		};
		const res = removeFilter( current, 'name' );

		expect( Object.keys( res ) ).toEqual( [ 'age' ] );
		expect( Object.keys( current ) ).toEqual( [ 'name', 'age' ] );
	});

	it('filters on looked-up value when field defines a filter function', () => {
		const lookupRows : DataGridRow[] = [
			{ id: '1', buyer_id: 'usr_abc' },
			{ id: '2', buyer_id: 'usr_xyz' },
		];
		const fields : any[] = [
			{
				name: 'buyer_id',
				type: 'string',
				filter: ( val : string ) => val === 'usr_abc' ? 'Acme Corp' : 'Beta Inc',
			},
		];

		const res = applyFilters( lookupRows, {
			buyer_id: { mode: filterModes.CONTAINS, value: 'Acme' },
		}, fields );

		expect( res.map( ( r ) => r.id ) ).toEqual( [ '1' ] );
	});

	it('filters on computed value when field is missing on row but filter function provides it', () => {
		const compRows : DataGridRow[] = [
			{ id: '1', contract_id: 'c1' },
			{ id: '2', contract_id: 'c2' },
		];
		const fields : any[] = [
			{
				name: 'unit_cost',
				type: 'number',
				filter: ( _val : any, row : any ) => row.contract_id === 'c1' ? 100 : 200,
			},
		];

		const res = applyFilters( compRows, {
			unit_cost: { mode: filterModes.LESS_THAN_OR_EQUAL, value: '150', type: 'number' },
		}, fields );

		expect( res.map( ( r ) => r.id ) ).toEqual( [ '1' ] );
	});

	it('filters with EQUAL mode for exact select matching', () => {
		const selectRows : DataGridRow[] = [
			{ id: '1', type: 'client' },
			{ id: '2', type: 'client_vip' },
		];

		const res = applyFilters( selectRows, {
			type: { mode: filterModes.EQUAL, value: 'client' },
		} );

		expect( res.map( ( r ) => r.id ) ).toEqual( [ '1' ] );
	});
});
