import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FormTextInput from '../FormTextInput.svelte';
import type { FormField } from '../../FormCreator.svelte';

const baseField : FormField = { id: 'fld-username', name: 'username', label: 'Username' };

describe('FormTextInput', () => {
	it('renders a text input with the field id', () => {
		render( FormTextInput, {
			props: { field: baseField, name: 'username', _v: () => '', onchange: vi.fn() },
		} );

		const input = screen.getByRole( 'textbox' ) as HTMLInputElement;
		expect( input.type ).toBe( 'text' );
		expect( input.id ).toBe( 'fld-username' );
	});

	it('renders the field label', () => {
		render( FormTextInput, {
			props: { field: baseField, name: 'username', _v: () => '', onchange: vi.fn() },
		} );

		expect( screen.getByText( 'Username' ) ).toBeInTheDocument();
	});

	it('calls onchange with the field name, event and field on change', async () => {
		const onchange = vi.fn();
		render( FormTextInput, { props: { field: baseField, name: 'username', _v: () => '', onchange } } );

		const input = screen.getByRole( 'textbox' );
		await userEvent.type( input, 'x' );
		await userEvent.tab();

		expect( onchange ).toHaveBeenCalled();
		const lastCall = onchange.mock.calls[onchange.mock.calls.length - 1];
		expect( lastCall[0] ).toBe( 'username' );
		expect( lastCall[2] ).toBe( baseField );
	});
});
