import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Button from '../Button.svelte';

const textSnippet = ( text : string ) =>
	createRawSnippet( () => ( {
		render: () => `<span>${text}</span>`,
	} ) );

describe('Button', () => {
	it('renders children content', () => {
		render( Button, { props: { children: textSnippet( 'Click me' ) } } );

		expect( screen.getByRole( 'button' ) ).toHaveTextContent( 'Click me' );
	});

	it('applies the mode and size classes', () => {
		render( Button, { props: { mode: 'danger', size: 'lg' } } );

		const button = screen.getByRole( 'button' );
		expect( button ).toHaveClass( 'liwe3-btn--danger' );
		expect( button ).toHaveClass( 'liwe3-btn--lg' );
	});

	it('applies the outline variant class', () => {
		render( Button, { props: { variant: 'outline' } } );

		expect( screen.getByRole( 'button' ) ).toHaveClass( 'liwe3-btn--outline' );
	});

	it('disables the button when disabled is true', () => {
		render( Button, { props: { disabled: true } } );

		expect( screen.getByRole( 'button' ) ).toBeDisabled();
	});

	it('calls onclick when clicked', async () => {
		const onclick = vi.fn();
		render( Button, { props: { onclick } } );

		await userEvent.click( screen.getByRole( 'button' ) );

		expect( onclick ).toHaveBeenCalledOnce();
	});

	it('does not call onclick when disabled', async () => {
		const onclick = vi.fn();
		render( Button, { props: { onclick, disabled: true } } );

		await userEvent.click( screen.getByRole( 'button' ) );

		expect( onclick ).not.toHaveBeenCalled();
	});
});
