import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Toast from '../Toast.svelte';

describe('Toast', () => {
	it('renders the title and message', () => {
		const { container } = render( Toast, {
			props: { title: 'Heads up', message: 'Something happened' },
		} );

		expect( screen.getByText( 'Heads up' ) ).toBeInTheDocument();
		expect( container.querySelector( '.liwe3-toast__body' ) ).toHaveTextContent(
			'Something happened',
		);
	});

	it('applies the type class', () => {
		const { container } = render( Toast, { props: { type: 'success' } } );

		expect( container.querySelector( '.liwe3-toast' ) ).toHaveClass( 'liwe3-toast--success' );
	});

	it('defaults to the error type', () => {
		const { container } = render( Toast );

		expect( container.querySelector( '.liwe3-toast' ) ).toHaveClass( 'liwe3-toast--error' );
	});

	it('renders the dismiss button when dismissible is true', () => {
		render( Toast, { props: { dismissible: true } } );

		expect( screen.getByRole( 'button' ) ).toBeInTheDocument();
	});

	it('does not render the dismiss button when dismissible is false', () => {
		render( Toast, { props: { dismissible: false } } );

		expect( screen.queryByRole( 'button' ) ).not.toBeInTheDocument();
	});

	it('calls ondismiss when the close button is clicked', async () => {
		const ondismiss = vi.fn();
		render( Toast, { props: { dismissible: true, ondismiss } } );

		await userEvent.click( screen.getByRole( 'button' ) );

		expect( ondismiss ).toHaveBeenCalledOnce();
	});

	it('strips <script> tags from the message and does not execute them', () => {
		const { container } = render( Toast, {
			props: { message: '<script>window.__xss = true;</script>Safe text' },
		} );

		const body = container.querySelector( '.liwe3-toast__body' );
		expect( body?.querySelector( 'script' ) ).toBeNull();
		expect( body ).toHaveTextContent( 'Safe text' );
		expect( ( window as any ).__xss ).toBeUndefined();
	});

	it('strips event handler attributes such as onerror from the message', () => {
		const { container } = render( Toast, {
			props: { message: '<img src="x" onerror="window.__xss = true" />' },
		} );

		const body = container.querySelector( '.liwe3-toast__body' );
		const img = body?.querySelector( 'img' );
		expect( img ).not.toBeNull();
		expect( img?.getAttribute( 'onerror' ) ).toBeNull();
		expect( ( window as any ).__xss ).toBeUndefined();
	});

	it('keeps allowlisted formatting tags in the message', () => {
		const { container } = render( Toast, {
			props: { message: '<strong>bold</strong> text' },
		} );

		const body = container.querySelector( '.liwe3-toast__body' );
		expect( body?.querySelector( 'strong' ) ).not.toBeNull();
		expect( body ).toHaveTextContent( 'bold text' );
	});
});
