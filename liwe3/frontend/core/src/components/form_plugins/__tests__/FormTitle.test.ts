import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import FormTitle from '../FormTitle.svelte';
import type { FormField } from '../../FormCreator.svelte';

describe('FormTitle', () => {
	it('renders the field label', () => {
		const field : FormField = { name: 'section', label: 'Section Title' };
		render( FormTitle, { props: { field, name: 'section', _v: () => null, onchange: vi.fn() } } );

		expect( screen.getByText( 'Section Title' ) ).toBeInTheDocument();
	});

	it('renders an empty title when the field has no label', () => {
		const field : FormField = { name: 'section' };
		const { container } = render( FormTitle, { props: { field, name: 'section', _v: () => null, onchange: vi.fn() } } );

		expect( container.querySelector( '.title' ) ).toHaveTextContent( '' );
	});
});
