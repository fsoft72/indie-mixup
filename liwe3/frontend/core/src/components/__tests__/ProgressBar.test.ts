import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ProgressBar from '../ProgressBar.svelte';

describe('ProgressBar', () => {
	it('sets the fill width from the percentage prop', () => {
		const { container } = render( ProgressBar, { props: { percentage: 42 } } );

		const fill = container.querySelector( '.liwe3-progress-bar__fill' );
		expect( fill ).toHaveStyle( { width: '42%' } );
	});

	it('does not render the text label when text is empty', () => {
		const { container } = render( ProgressBar );

		expect( container.querySelector( '.liwe3-progress-bar__text' ) ).toBeNull();
	});

	it('renders the text label when provided', () => {
		render( ProgressBar, { props: { text: 'Loading...' } } );

		expect( screen.getByText( 'Loading...' ) ).toBeInTheDocument();
	});
});
