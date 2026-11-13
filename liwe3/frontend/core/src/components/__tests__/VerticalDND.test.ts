import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import VerticalDNDHost from './VerticalDNDHost.svelte';

describe('VerticalDND', () => {
	it('renders the provided children inside the container', () => {
		const { container } = render( VerticalDNDHost );

		expect( container.querySelector( '.vertical-dnd-container' ) ).toBeInTheDocument();
		expect( container.textContent ).toContain( 'Item 1' );
		expect( container.textContent ).toContain( 'Item 2' );
		expect( container.textContent ).toContain( 'Item 3' );
	});

	it('wraps each child element with a drag handle', async () => {
		const { container } = render( VerticalDNDHost );

		// MutationObserver / onMount setup runs asynchronously, wait for wrappers to appear.
		await vi.waitFor( () => {
			expect( container.querySelectorAll( '.dnd-item-wrapper' ) ).toHaveLength( 3 );
		} );
		expect( container.querySelectorAll( '.dnd-drag-handle' ) ).toHaveLength( 3 );
	});

	it('places the drag handle after the content by default (handlePosition right)', async () => {
		const { container } = render( VerticalDNDHost );

		await vi.waitFor( () => {
			expect( container.querySelectorAll( '.dnd-item-wrapper' ) ).toHaveLength( 3 );
		} );

		const firstWrapper = container.querySelector( '.dnd-item-wrapper' ) as HTMLElement;
		const lastChild = firstWrapper.lastElementChild as HTMLElement;
		expect( lastChild ).toHaveClass( 'dnd-drag-handle' );
	});

	it('places the drag handle before the content when handlePosition is left', async () => {
		const { container } = render( VerticalDNDHost, { props: { handlePosition: 'left' } } );

		await vi.waitFor( () => {
			expect( container.querySelectorAll( '.dnd-item-wrapper' ) ).toHaveLength( 3 );
		} );

		const firstWrapper = container.querySelector( '.dnd-item-wrapper' ) as HTMLElement;
		const firstChild = firstWrapper.firstElementChild as HTMLElement;
		expect( firstChild ).toHaveClass( 'dnd-drag-handle' );
	});

	it('does not set a move cursor on handles when disabled', async () => {
		const { container } = render( VerticalDNDHost, { props: { disabled: true } } );

		await vi.waitFor( () => {
			expect( container.querySelectorAll( '.dnd-item-wrapper' ) ).toHaveLength( 3 );
		} );

		const handle = container.querySelector( '.dnd-drag-handle' ) as HTMLElement;
		expect( handle.style.cursor ).not.toBe( 'move' );
	});

	it('sets a move cursor on handles when enabled', async () => {
		const { container } = render( VerticalDNDHost );

		await vi.waitFor( () => {
			expect( container.querySelectorAll( '.dnd-item-wrapper' ) ).toHaveLength( 3 );
		} );

		const handle = container.querySelector( '.dnd-drag-handle' ) as HTMLElement;
		expect( handle.style.cursor ).toBe( 'move' );
	});

	it('starts a drag on handle mousedown and ends cleanly without moving past the threshold', async () => {
		const onreorder = vi.fn();
		const { container } = render( VerticalDNDHost, { props: { onreorder } } );

		await vi.waitFor( () => {
			expect( container.querySelectorAll( '.dnd-item-wrapper' ) ).toHaveLength( 3 );
		} );

		const handle = container.querySelectorAll( '.dnd-drag-handle' )[0] as HTMLElement;
		handle.dispatchEvent(
			new MouseEvent( 'mousedown', { bubbles: true, clientX: 10, clientY: 10 } ),
		);

		document.dispatchEvent( new MouseEvent( 'mouseup', { bubbles: true } ) );

		// Drag ended without moving past the threshold: no reorder should be reported.
		expect( onreorder ).not.toHaveBeenCalled();
	});
});
