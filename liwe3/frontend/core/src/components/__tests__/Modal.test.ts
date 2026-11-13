import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Modal from '../Modal.svelte';

const bodySnippet = ( text : string ) =>
	createRawSnippet( () => ( {
		render: () => `<p>${text}</p>`,
	} ) );

describe('Modal', () => {
	it('renders the title and body content', () => {
		render( Modal, { props: { title: 'My Modal', children: bodySnippet( 'Body content' ) } } );

		expect( screen.getByText( 'My Modal' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Body content' ) ).toBeInTheDocument();
	});

	it('applies the size class', () => {
		const { container } = render( Modal, {
			props: { title: 'Sized', size: 'lg', children: bodySnippet( 'Body' ) },
		} );

		expect( container.querySelector( '.liwe3-modal' ) ).toHaveClass( 'liwe3-modal--lg' );
	});

	it('renders the close button by default and calls oncancel when clicked', async () => {
		const oncancel = vi.fn();
		render( Modal, { props: { title: 'Closable', oncancel, children: bodySnippet( 'Body' ) } } );

		const buttons = screen.getAllByRole( 'button' );
		await userEvent.click( buttons[buttons.length - 1] );

		expect( oncancel ).toHaveBeenCalledWith( false );
	});

	it('does not render the close button when showCloseButton is false', () => {
		render( Modal, {
			props: { title: 'No Close', showCloseButton: false, children: bodySnippet( 'Body' ) },
		} );

		expect( screen.queryAllByRole( 'button' ) ).toHaveLength( 0 );
	});

	it('renders action buttons and calls their action when clicked', async () => {
		const action = vi.fn();
		render( Modal, {
			props: {
				title: 'With Actions',
				actions: [ { label: 'Save', action } ],
				children: bodySnippet( 'Body' ),
			},
		} );

		await userEvent.click( screen.getByText( 'Save' ) );

		expect( action ).toHaveBeenCalledOnce();
	});

	it('calls oncancel when Escape is pressed and closeOnEsc is true', async () => {
		const oncancel = vi.fn();
		render( Modal, { props: { title: 'Esc Modal', oncancel, children: bodySnippet( 'Body' ) } } );

		await userEvent.keyboard( '{Escape}' );

		expect( oncancel ).toHaveBeenCalledWith( false );
	});

	it('does not call oncancel on Escape when closeOnEsc is false', async () => {
		const oncancel = vi.fn();
		render( Modal, {
			props: { title: 'No Esc Modal', closeOnEsc: false, oncancel, children: bodySnippet( 'Body' ) },
		} );

		await userEvent.keyboard( '{Escape}' );

		expect( oncancel ).not.toHaveBeenCalled();
	});

	it('calls oncancel when the overlay is clicked outside the modal', async () => {
		const oncancel = vi.fn();
		const { container } = render( Modal, {
			props: { title: 'Outside Click', oncancel, children: bodySnippet( 'Body' ) },
		} );

		const overlay = container.querySelector( '.liwe3-modal-overlay' ) as HTMLElement;
		await userEvent.click( overlay );

		expect( oncancel ).toHaveBeenCalledWith( false );
	});
});
