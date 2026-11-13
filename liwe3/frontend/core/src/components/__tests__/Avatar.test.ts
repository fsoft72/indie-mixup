import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Avatar from '../Avatar.svelte';

describe('Avatar', () => {
	it('renders the initials from the name when there is no url', () => {
		const { container } = render( Avatar, { props: { name: 'John Doe' } } );

		expect( container.querySelector( '.liwe3-avatar' ) ).toHaveTextContent( 'JD' );
	});

	it('falls back to "A" when there is no name and no url', () => {
		const { container } = render( Avatar, { props: { name: '' } } );

		expect( container.querySelector( '.liwe3-avatar' ) ).toHaveTextContent( 'A' );
	});

	it('does not render initials when an absolute image url is given', () => {
		const { container } = render( Avatar, {
			props: { url: 'https://example.com/avatar.png', name: 'John Doe' },
		} );

		expect( container.querySelector( '.liwe3-avatar' ) ).toHaveTextContent( '' );
	});

	it('applies the square shape class', () => {
		const { container } = render( Avatar, { props: { shape: 'square' } } );

		expect( container.querySelector( '.liwe3-avatar' ) ).toHaveClass( 'square' );
	});

	it('applies the shadow class when shadow is true', () => {
		const { container } = render( Avatar, { props: { shadow: true } } );

		expect( container.querySelector( '.liwe3-avatar' ) ).toHaveClass( 'shadow' );
	});
});
