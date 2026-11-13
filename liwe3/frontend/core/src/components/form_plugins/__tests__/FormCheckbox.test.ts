import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FormCheckbox from '../FormCheckbox.svelte';
import type { FormField } from '../../FormCreator.svelte';

const baseField : FormField = { name: 'agree', label: 'I agree' };

describe('FormCheckbox', () => {
	it('renders the field label next to the checkbox', () => {
		render( FormCheckbox, { props: { field: baseField, name: 'agree', _v: () => false, onchange: vi.fn() } } );

		expect( screen.getByRole( 'checkbox' ) ).toBeInTheDocument();
		expect( screen.getByText( 'I agree' ) ).toBeInTheDocument();
	});

	it('reflects a truthy value from _v as checked', () => {
		render( FormCheckbox, { props: { field: baseField, name: 'agree', _v: () => true, onchange: vi.fn() } } );

		expect( screen.getByRole( 'checkbox' ) ).toBeChecked();
	});

	it('reflects a falsy value from _v as unchecked', () => {
		render( FormCheckbox, { props: { field: baseField, name: 'agree', _v: () => false, onchange: vi.fn() } } );

		expect( screen.getByRole( 'checkbox' ) ).not.toBeChecked();
	});

	it('calls onchange with the field name, event and field when toggled', async () => {
		const onchange = vi.fn();
		render( FormCheckbox, { props: { field: baseField, name: 'agree', _v: () => false, onchange } } );

		await userEvent.click( screen.getByRole( 'checkbox' ) );

		expect( onchange ).toHaveBeenCalledOnce();
		expect( onchange.mock.calls[0][0] ).toBe( 'agree' );
		expect( onchange.mock.calls[0][2] ).toBe( baseField );
	});
});
