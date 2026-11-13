import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Input from '../Input.svelte';

describe('Input', () => {
	it('renders a text input by default', () => {
		render( Input );

		const input = screen.getByRole( 'textbox' );
		expect( input ).toBeInTheDocument();
		expect( input ).toHaveAttribute( 'type', 'text' );
	});

	it('renders the label when provided', () => {
		render( Input, { props: { label: 'Username', id: 'username-id' } } );

		const label = screen.getByText( 'Username' );
		expect( label ).toBeInTheDocument();
		expect( label ).toHaveAttribute( 'for', 'username-id' );
	});

	it('does not render a label when not provided', () => {
		const { container } = render( Input );

		expect( container.querySelector( '.liwe3-label' ) ).toBeNull();
	});

	it('applies the size class', () => {
		render( Input, { props: { size: 'lg' } } );

		expect( screen.getByRole( 'textbox' ) ).toHaveClass( 'liwe3-input', 'lg' );
	});

	it('reflects the initial value', () => {
		render( Input, { props: { value: 'hello' } } );

		expect( screen.getByRole( 'textbox' ) ).toHaveValue( 'hello' );
	});

	it('updates value and calls oninput when typing', async () => {
		const oninput = vi.fn();
		render( Input, { props: { oninput } } );

		const input = screen.getByRole( 'textbox' );
		await userEvent.type( input, 'abc' );

		expect( input ).toHaveValue( 'abc' );
		expect( oninput ).toHaveBeenCalled();
	});

	it('calls onblur and onchange handlers', async () => {
		const onblur = vi.fn();
		const onchange = vi.fn();
		render( Input, { props: { onblur, onchange } } );

		const input = screen.getByRole( 'textbox' );
		await userEvent.click( input );
		await userEvent.type( input, 'x' );
		await userEvent.tab();

		expect( onblur ).toHaveBeenCalledOnce();
		expect( onchange ).toHaveBeenCalledOnce();
	});

	it('blocks characters not present in validChars', async () => {
		render( Input, { props: { validChars: '0123456789' } } );

		const input = screen.getByRole( 'textbox' );
		await userEvent.type( input, 'a1b2c3' );

		expect( input ).toHaveValue( '123' );
	});

	it('is disabled when the disabled attribute is passed through rest props', () => {
		render( Input, { props: { disabled: true } } );

		expect( screen.getByRole( 'textbox' ) ).toBeDisabled();
	});
});
