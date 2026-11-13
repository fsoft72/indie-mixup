import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FormButton from '../FormButton.svelte';
import type { FormField } from '../../FormCreator.svelte';

describe('FormButton', () => {
	it('renders the field label as the button text', () => {
		const field : FormField = { name: 'submit', label: 'Save' };
		render( FormButton, { props: { field, name: 'submit', _v: () => null, onchange: vi.fn() } } );

		expect( screen.getByRole( 'button' ) ).toHaveTextContent( 'Save' );
	});

	it('calls field.onclick when clicked', async () => {
		const onclick = vi.fn();
		const field : FormField = { name: 'submit', label: 'Save', onclick };
		render( FormButton, { props: { field, name: 'submit', _v: () => null, onchange: vi.fn() } } );

		await userEvent.click( screen.getByRole( 'button' ) );

		expect( onclick ).toHaveBeenCalledOnce();
	});

	it('applies mode from field.extra to the underlying Button', () => {
		const field : FormField = { name: 'submit', label: 'Save', extra: { mode: 'danger' } };
		render( FormButton, { props: { field, name: 'submit', _v: () => null, onchange: vi.fn() } } );

		expect( screen.getByRole( 'button' ) ).toHaveClass( 'liwe3-btn--danger' );
	});
});
