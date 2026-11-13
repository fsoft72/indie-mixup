import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { filterModes } from '../../../utils/match_filter';
import DataGridFilterRow from '../DataGridFilterRow.svelte';
import type { DataGridField } from '../datagrid_types';

const fields : DataGridField[] = [
	{ name: 'name', type: 'string', label: 'Name', filterable: true },
	{ name: 'age', type: 'number', label: 'Age', filterable: true },
	{ name: 'active', type: 'bool', label: 'Active', filterable: true },
];

describe('DataGridFilterRow', () => {
	it('reports a CONTAINS filter when a text filter changes', async () => {
		const onchange = vi.fn();
		const { container } = render( DataGridFilterRow, { props: { fields, filters: {}, onchange } } );

		const input = container.querySelector( 'input[name="f_name"]' ) as HTMLInputElement;
		await userEvent.type( input, 'ali' );
		await userEvent.tab();

		expect( onchange ).toHaveBeenCalledWith( {
			name: { mode: filterModes.CONTAINS, value: 'ali', type: 'string' },
		} );
	});

	it('applies a range filter only when both ends are filled', async () => {
		const onchange = vi.fn();
		const { container } = render( DataGridFilterRow, { props: { fields, filters: {}, onchange } } );

		const from = container.querySelector( 'input[name="f_age_1"]' ) as HTMLInputElement;
		const to = container.querySelector( 'input[name="f_age_2"]' ) as HTMLInputElement;

		await userEvent.type( from, '20' );
		await userEvent.tab();
		expect( onchange ).toHaveBeenLastCalledWith( {} );

		await userEvent.type( to, '40' );
		await userEvent.tab();
		expect( onchange ).toHaveBeenLastCalledWith( {
			age: { mode: filterModes.BETWEEN, value: '20|40', type: 'number' },
		} );
	});

	it('shows both ends of an already active range filter', () => {
		const { container } = render( DataGridFilterRow, {
			props: {
				fields,
				filters: { age: { mode: filterModes.BETWEEN, value: '20|40', type: 'number' } },
				onchange: vi.fn(),
			},
		} );

		expect( ( container.querySelector( 'input[name="f_age_1"]' ) as HTMLInputElement ).value ).toBe( '20' );
		expect( ( container.querySelector( 'input[name="f_age_2"]' ) as HTMLInputElement ).value ).toBe( '40' );
	});

	it('sets and clears a boolean filter from the checkbox state', async () => {
		const onchange = vi.fn();
		const { container } = render( DataGridFilterRow, { props: { fields, filters: {}, onchange } } );

		const cb = container.querySelector( 'input[name="f_active"]' ) as HTMLInputElement;

		await userEvent.click( cb );
		expect( onchange ).toHaveBeenLastCalledWith( {
			active: { mode: filterModes.EQUAL, value: true, type: 'bool' },
		} );

		await userEvent.click( cb );
		expect( onchange ).toHaveBeenLastCalledWith( {} );
	});

	it('keeps two filter rows on the same page independent', async () => {
		const onchangeA = vi.fn();
		const onchangeB = vi.fn();
		const a = render( DataGridFilterRow, { props: { fields, filters: {}, onchange: onchangeA } } );
		const b = render( DataGridFilterRow, { props: { fields, filters: {}, onchange: onchangeB } } );

		// both grids have an input named f_age_1 / f_age_2: fill the first grid range
		await userEvent.type( a.container.querySelector( 'input[name="f_age_1"]' ) as HTMLInputElement, '20' );
		await userEvent.tab();
		await userEvent.type( a.container.querySelector( 'input[name="f_age_2"]' ) as HTMLInputElement, '40' );
		await userEvent.tab();

		expect( onchangeA ).toHaveBeenLastCalledWith( {
			age: { mode: filterModes.BETWEEN, value: '20|40', type: 'number' },
		} );
		// the second grid must not have been filtered by the first grid's inputs
		expect( onchangeB ).not.toHaveBeenCalled();
		expect( ( b.container.querySelector( 'input[name="f_age_1"]' ) as HTMLInputElement ).value ).toBe( '' );
	});

	it('renders an extra cell when the grid has an actions column', () => {
		const { container } = render( DataGridFilterRow, {
			props: { fields, filters: {}, onchange: vi.fn(), hasActions: true },
		} );

		expect( container.querySelectorAll( 'td' ) ).toHaveLength( fields.length + 1 );
	});
});
