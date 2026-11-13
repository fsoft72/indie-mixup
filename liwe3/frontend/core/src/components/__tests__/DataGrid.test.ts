import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { filterModes } from '../../utils/match_filter';
import DataGrid from '../DataGrid.svelte';
import type { DataGridField, DataGridRow } from '../DataGrid.svelte';

// jsdom does not implement Element.scrollTo, which DataGrid calls in an
// $effect whenever `page` changes; stub it so mounting/updates don't throw.
beforeAll( () => {
	Element.prototype.scrollTo = vi.fn();
} );

const fields : DataGridField[] = [
	{ name: 'name', type: 'string', label: 'Name', sortable: true },
	{ name: 'age', type: 'number', label: 'Age', sortable: true },
];

const data : DataGridRow[] = [
	{ id: '1', name: 'Charlie', age: 40 },
	{ id: '2', name: 'Alice', age: 30 },
	{ id: '3', name: 'Bob', age: 20 },
];

describe('DataGrid', () => {
	it('renders column headers from fields', () => {
		render( DataGrid, { props: { fields, data: [ ...data ] } } );

		expect( screen.getByText( 'Name' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Age' ) ).toBeInTheDocument();
	});

	it('renders a row for each data item', () => {
		render( DataGrid, { props: { fields, data: [ ...data ] } } );

		expect( screen.getByText( 'Charlie' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Alice' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Bob' ) ).toBeInTheDocument();
	});

	it('sorts rows ascending then descending when clicking a sortable header', async () => {
		const { container } = render( DataGrid, { props: { fields, data: [ ...data ] } } );

		const nameHeader = screen.getByText( 'Name' );
		const getBodyRows = () => container.querySelectorAll( 'tbody tr' );
		const getFirstCellText = () => {
			const rows = getBodyRows();
			return rows[0].querySelectorAll( 'td' )[0].textContent;
		};

		await userEvent.click( nameHeader );
		expect( getFirstCellText() ).toBe( 'Alice' );

		await userEvent.click( nameHeader );
		expect( getFirstCellText() ).toBe( 'Charlie' );
	});

	it('sorts numeric fields numerically', async () => {
		const { container } = render( DataGrid, { props: { fields, data: [ ...data ] } } );

		const ageHeader = screen.getByText( 'Age' );
		await userEvent.click( ageHeader );

		const rows = container.querySelectorAll( 'tbody tr' );
		const firstRowAge = rows[0].querySelectorAll( 'td' )[1].textContent;
		expect( firstRowAge ).toBe( '20' );
	});

	it('does not mutate the original data array reference when sorting (sorts a copy)', async () => {
		const original = [ ...data ];
		const onchange = vi.fn();
		render( DataGrid, { props: { fields, data: original, onsortchange: onchange } } );

		const nameHeader = screen.getByText( 'Name' );
		await userEvent.click( nameHeader );

		// the original array passed in should still be in its initial order,
		// since DataGrid.sortData() sorts a copy instead of mutating in place
		expect( original.map( ( r ) => r.name ) ).toEqual( [ 'Charlie', 'Alice', 'Bob' ] );
	});

	it('calls onsortchange with the field name and direction when a sortable header is clicked', async () => {
		const onsortchange = vi.fn();
		render( DataGrid, { props: { fields, data: [ ...data ], onsortchange } } );

		await userEvent.click( screen.getByText( 'Name' ) );

		expect( onsortchange ).toHaveBeenCalledWith( 'name', 'asc' );
	});

	it('does not sort when clicking a non-sortable header', async () => {
		const unsortableFields : DataGridField[] = [
			{ name: 'name', type: 'string', label: 'Name', sortable: false },
		];
		const { container } = render( DataGrid, {
			props: { fields: unsortableFields, data: [ ...data ] },
		} );

		await userEvent.click( screen.getByText( 'Name' ) );

		const rows = container.querySelectorAll( 'tbody tr' );
		expect( rows[0].querySelectorAll( 'td' )[0].textContent ).toBe( 'Charlie' );
	});

	it('renders action buttons for each row and invokes onclick with the row', async () => {
		const onclick = vi.fn();
		render( DataGrid, {
			props: {
				fields,
				data: [ ...data ],
				actions: [ { label: 'Edit', onclick } ],
			},
		} );

		const editButtons = screen.getAllByRole( 'button', { name: 'Edit' } );
		expect( editButtons ).toHaveLength( data.length );

		await userEvent.click( editButtons[0] );

		expect( onclick ).toHaveBeenCalledOnce();
		expect( onclick.mock.calls[0][0] ).toMatchObject( { name: 'Charlie' } );
	});

	it('renders the title bar when a title is provided', () => {
		render( DataGrid, { props: { fields, data: [ ...data ], title: 'My Grid' } } );

		expect( screen.getByText( 'My Grid' ) ).toBeInTheDocument();
	});

	it('renders custom buttons in the title bar and invokes their onclick', async () => {
		const onclick = vi.fn();
		render( DataGrid, {
			props: {
				fields,
				data: [ ...data ],
				title: 'My Grid',
				buttons: [ { label: 'Export', onclick } ],
			},
		} );

		await userEvent.click( screen.getByRole( 'button', { name: 'Export' } ) );

		expect( onclick ).toHaveBeenCalledOnce();
	});

	it('writes an edited cell back to the right row when a filter is active', async () => {
		const editableFields : DataGridField[] = [
			{ name: 'name', type: 'string', label: 'Name', editable: true, filterable: true },
		];
		const oncelledit = vi.fn();
		const rows = data.map( ( r ) => ( { ...r } ) );
		const { container } = render( DataGrid, {
			props: {
				fields: editableFields,
				data: rows,
				// only the third row (Bob) passes the filter, so its position in the
				// page (0) is not its position in `data` (2)
				filters: { name: { mode: filterModes.CONTAINS, value: 'bob' } },
				oncelledit,
			},
		} );

		const cell = container.querySelectorAll( 'tbody tr td' )[0] as HTMLElement;
		await userEvent.dblClick( cell );

		const input = container.querySelector( 'tbody input' ) as HTMLInputElement;
		await userEvent.clear( input );
		await userEvent.type( input, 'Bobby{Enter}' );

		expect( oncelledit ).toHaveBeenCalledOnce();
		expect( oncelledit.mock.calls[0][0] ).toMatchObject( { id: '3', name: 'Bobby' } );

		// the edit must land on the row it came from: indexing by page position
		// would have overwritten Charlie (rows[0]) with the edited row
		expect( rows.map( ( r ) => r.name ) ).toEqual( [ 'Charlie', 'Alice', 'Bobby' ] );
	});

	it('renders the paginator when the row count exceeds rowsPerPage', () => {
		const manyRows : DataGridRow[] = Array.from( { length: 25 }, ( _, i ) => ( {
			id: `${i}`,
			name: `Row ${i}`,
			age: i,
		} ) );

		const { container } = render( DataGrid, {
			props: { fields, data: manyRows, rowsPerPage: 10 },
		} );

		// only rowsPerPage rows should be rendered on the first page
		const rows = container.querySelectorAll( 'tbody tr' );
		expect( rows ).toHaveLength( 10 );
	});

	it('scrolls the rows back to the top on a page change, but not on mount', async () => {
		const manyRows : DataGridRow[] = Array.from( { length: 25 }, ( _, i ) => ( {
			id: `${i}`,
			name: `Row ${i}`,
			age: i,
		} ) );
		const scrollTo = vi.spyOn( Element.prototype, 'scrollTo' );

		render( DataGrid, { props: { fields, data: manyRows, rowsPerPage: 10 } } );
		expect( scrollTo ).not.toHaveBeenCalled();

		await userEvent.click( screen.getByRole( 'button', { name: 'Next' } ) );
		expect( scrollTo ).toHaveBeenCalledWith( 0, 0 );

		scrollTo.mockRestore();
	});

	it('does not render the paginator when disablePaginator is true', () => {
		const manyRows : DataGridRow[] = Array.from( { length: 25 }, ( _, i ) => ( {
			id: `${i}`,
			name: `Row ${i}`,
			age: i,
		} ) );

		const { container } = render( DataGrid, {
			props: { fields, data: manyRows, disablePaginator: true },
		} );

		const rows = container.querySelectorAll( 'tbody tr' );
		expect( rows ).toHaveLength( 25 );
		expect( container.querySelector( '.dg-footer' ) ).toBeNull();
	});
});
