import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Tab from '../Tab.svelte';

const textSnippet = ( text : string ) =>
	createRawSnippet( () => ( {
		render: () => `<span>${text}</span>`,
	} ) );

describe('Tab', () => {
	it('renders with default id and title', () => {
		const { container } = render( Tab, { props: { children: textSnippet( 'content' ) } } );

		const tab = container.querySelector( '.tab' );
		expect( tab ).toBeInTheDocument();
		expect( tab ).toHaveAttribute( 'data-title', 'Tab' );
		expect( tab ).toHaveAttribute( 'data-id' );
	});

	it('renders the provided id and title', () => {
		const { container } = render( Tab, {
			props: { id: 'tab-1', title: 'My Tab', children: textSnippet( 'content' ) },
		} );

		const tab = container.querySelector( '.tab' );
		expect( tab ).toHaveAttribute( 'data-id', 'tab-1' );
		expect( tab ).toHaveAttribute( 'data-title', 'My Tab' );
	});

	it('renders the children snippet content', () => {
		const { container } = render( Tab, { props: { children: textSnippet( 'Hello Tab' ) } } );

		expect( container.querySelector( '.tab-content' ) ).toHaveTextContent( 'Hello Tab' );
	});
});
