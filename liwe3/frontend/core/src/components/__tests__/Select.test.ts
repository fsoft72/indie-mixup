import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Select from '../Select.svelte';

const items = [
	{ label: 'One', value: '1' },
	{ label: 'Two', value: '2' },
];

describe('Select', () => {
	it('renders a text input by default', () => {
		const { container } = render( Select, { props: { name: 'sel', items, value: '' } } );

		expect( container.querySelector( 'input.liwe3-input' ) ).toBeInTheDocument();
		expect( container.querySelector( 'select' ) ).toBeNull();
	});

	it('renders a native select when dropdownOnly is true', () => {
		const { container } = render( Select, {
			props: { name: 'sel', items, value: '', dropdownOnly: true, placeholder: 'Pick one' },
		} );

		const select = container.querySelector( 'select.liwe3-select' );
		expect( select ).toBeInTheDocument();
		// the placeholder option is hidden, so only the real items are exposed via role queries
		expect( screen.getAllByRole( 'option' ) ).toHaveLength( 2 );
		expect( container.querySelectorAll( 'option' ) ).toHaveLength( 3 ); // placeholder + 2 items
	});

	it('renders options from string items', () => {
		render( Select, {
			props: { name: 'sel', items: [ 'a', 'b' ], value: '', dropdownOnly: true },
		} );

		expect( screen.getByRole( 'option', { name: 'a' } ) ).toBeInTheDocument();
		expect( screen.getByRole( 'option', { name: 'b' } ) ).toBeInTheDocument();
	});

	it('does not show the clear button when value is empty', () => {
		render( Select, { props: { name: 'sel', items, value: '' } } );

		expect( screen.queryByRole( 'button' ) ).toBeNull();
	});

	it('shows the clear button when a value is set', () => {
		render( Select, { props: { name: 'sel', items, value: '1' } } );

		expect( screen.getByRole( 'button' ) ).toBeInTheDocument();
	});

	it('does not show the clear button when readonly', () => {
		render( Select, { props: { name: 'sel', items, value: '1', readonly: true } } );

		expect( screen.queryByRole( 'button' ) ).toBeNull();
	});

	it('calls onchange with the cleared value when the clear button is clicked', async () => {
		const onchange = vi.fn();
		render( Select, { props: { name: 'sel', items, value: '1', onchange } } );

		await userEvent.click( screen.getByRole( 'button' ) );

		expect( onchange ).toHaveBeenCalledWith( '' );
	});

	it('calls onchange when typing in the text input', async () => {
		const onchange = vi.fn();
		const { container } = render( Select, { props: { name: 'sel', items, value: '', onchange } } );

		const input = container.querySelector( 'input.liwe3-input' ) as HTMLInputElement;
		await userEvent.type( input, 'x' );

		expect( onchange ).toHaveBeenCalledWith( 'x' );
	});

	it('marks the readonly text input as readonly', () => {
		const { container } = render( Select, {
			props: { name: 'sel', items, value: '', readonly: true },
		} );

		expect( container.querySelector( 'input.liwe3-input' ) ).toHaveAttribute( 'readonly' );
	});
});
