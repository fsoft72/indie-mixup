import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FormTextArea from '../FormTextArea.svelte';
import type { FormField } from '../../FormCreator.svelte';

const baseField : FormField = { name: 'notes', label: 'Notes' };

describe('FormTextArea', () => {
	it('renders the field label as a title', () => {
		render( FormTextArea, { props: { field: baseField, name: 'notes', _v: () => '', onchange: vi.fn() } } );

		expect( screen.getByText( 'Notes' ) ).toBeInTheDocument();
	});

	it('renders an empty title when the field has no label', () => {
		const field : FormField = { name: 'notes' };
		const { container } = render( FormTextArea, {
			props: { field, name: 'notes', _v: () => '', onchange: vi.fn() },
		} );

		expect( container.querySelector( '.title' ) ).toHaveTextContent( '' );
	});

	it('sets the textarea value from _v', () => {
		render( FormTextArea, {
			props: { field: baseField, name: 'notes', _v: () => 'Some notes', onchange: vi.fn() },
		} );

		expect( screen.getByRole( 'textbox' ) ).toHaveValue( 'Some notes' );
	});

	it('applies the liwe3-textarea class', () => {
		render( FormTextArea, { props: { field: baseField, name: 'notes', _v: () => '', onchange: vi.fn() } } );

		expect( screen.getByRole( 'textbox' ) ).toHaveClass( 'liwe3-textarea' );
	});

	it('calls onchange with the field name, event and field on change', async () => {
		const onchange = vi.fn();
		render( FormTextArea, { props: { field: baseField, name: 'notes', _v: () => '', onchange } } );

		const textarea = screen.getByRole( 'textbox' );
		await userEvent.type( textarea, 'hi' );
		await userEvent.tab();

		expect( onchange ).toHaveBeenCalledOnce();
		expect( onchange.mock.calls[0][0] ).toBe( 'notes' );
		expect( onchange.mock.calls[0][2] ).toBe( baseField );
	});
});
