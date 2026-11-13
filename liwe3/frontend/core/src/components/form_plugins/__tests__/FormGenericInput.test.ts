import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FormGenericInput from '../FormGenericInput.svelte';
import type { FormField } from '../../FormCreator.svelte';

const baseField : FormField = { name: 'username', label: 'Username' };

describe('FormGenericInput', () => {
	it('renders a text input', () => {
		render( FormGenericInput, {
			props: { field: baseField, name: 'username', _v: () => '', onchange: vi.fn() },
		} );

		const input = screen.getByRole( 'textbox' ) as HTMLInputElement;
		expect( input.type ).toBe( 'text' );
	});

	it('sets the input value from _v', () => {
		render( FormGenericInput, {
			props: { field: baseField, name: 'username', _v: () => 'fabio', onchange: vi.fn() },
		} );

		expect( screen.getByRole( 'textbox' ) ).toHaveValue( 'fabio' );
	});

	it('renders the field label via the underlying Input component', () => {
		render( FormGenericInput, {
			props: { field: baseField, name: 'username', _v: () => '', onchange: vi.fn() },
		} );

		expect( screen.getByText( 'Username' ) ).toBeInTheDocument();
	});

	it('calls onchange with the field name, event and field on change', async () => {
		const onchange = vi.fn();
		render( FormGenericInput, { props: { field: baseField, name: 'username', _v: () => '', onchange } } );

		const input = screen.getByRole( 'textbox' );
		await userEvent.type( input, 'x' );
		await userEvent.tab();

		expect( onchange ).toHaveBeenCalled();
		const lastCall = onchange.mock.calls[onchange.mock.calls.length - 1];
		expect( lastCall[0] ).toBe( 'username' );
		expect( lastCall[2] ).toBe( baseField );
	});
});
