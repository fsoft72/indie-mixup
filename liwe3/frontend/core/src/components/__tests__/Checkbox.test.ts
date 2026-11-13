import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Checkbox from '../Checkbox.svelte';

describe('Checkbox', () => {
	it('renders a checkbox input', () => {
		render( Checkbox );

		expect( screen.getByRole( 'checkbox' ) ).toBeInTheDocument();
	});

	it('renders the label when provided', () => {
		render( Checkbox, { props: { label: 'Accept terms' } } );

		expect( screen.getByText( 'Accept terms' ) ).toBeInTheDocument();
	});

	it('reflects the checked prop', () => {
		render( Checkbox, { props: { checked: true } } );

		expect( screen.getByRole( 'checkbox' ) ).toBeChecked();
	});

	it('toggles when clicked and calls onchange', async () => {
		const onchange = vi.fn();
		render( Checkbox, { props: { onchange } } );

		const checkbox = screen.getByRole( 'checkbox' );
		await userEvent.click( checkbox );

		expect( checkbox ).toBeChecked();
		expect( onchange ).toHaveBeenCalledOnce();
	});

	it('applies the size class', () => {
		render( Checkbox, { props: { size: 'lg' } } );

		expect( screen.getByRole( 'checkbox' ) ).toHaveClass( 'lg' );
	});
});
