import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import Tabs from '../Tabs.svelte';

const tabsSnippet = () =>
	createRawSnippet( () => ( {
		render: () => `
			<div>
				<div class="tab" data-id="tab1" data-title="Tab One">
					<div class="tab-content">Content One</div>
				</div>
				<div class="tab" data-id="tab2" data-title="Tab Two">
					<div class="tab-content">Content Two</div>
				</div>
			</div>
		`,
	} ) );

describe('Tabs', () => {
	it('renders a label for each tab', () => {
		render( Tabs, { props: { children: tabsSnippet() } } );

		expect( screen.getByText( 'Tab One' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Tab Two' ) ).toBeInTheDocument();
	});

	it('activates the first tab by default and shows its content', () => {
		const { container } = render( Tabs, { props: { children: tabsSnippet() } } );

		expect( screen.getByText( 'Tab One' ) ).toHaveClass( 'active' );
		expect( container.querySelector( '.liwe3-tabs__content' ) ).toHaveTextContent( 'Content One' );
	});

	it('honors the active prop to select the initial tab', () => {
		const { container } = render( Tabs, {
			props: { children: tabsSnippet(), active: 'tab2' },
		} );

		expect( screen.getByText( 'Tab Two' ) ).toHaveClass( 'active' );
		expect( container.querySelector( '.liwe3-tabs__content' ) ).toHaveTextContent( 'Content Two' );
	});

	it('switches tabs and content when a label is clicked', async () => {
		const { container } = render( Tabs, { props: { children: tabsSnippet() } } );

		await userEvent.click( screen.getByText( 'Tab Two' ) );

		expect( screen.getByText( 'Tab Two' ) ).toHaveClass( 'active' );
		expect( screen.getByText( 'Tab One' ) ).not.toHaveClass( 'active' );
		expect( container.querySelector( '.liwe3-tabs__content' ) ).toHaveTextContent( 'Content Two' );
	});

	it('switches tabs when the label is activated with Enter', async () => {
		const { container } = render( Tabs, { props: { children: tabsSnippet() } } );

		screen.getByText( 'Tab Two' ).focus();
		await userEvent.keyboard( '{Enter}' );

		expect( screen.getByText( 'Tab Two' ) ).toHaveClass( 'active' );
		expect( container.querySelector( '.liwe3-tabs__content' ) ).toHaveTextContent( 'Content Two' );
	});

	it('applies the height and min-height styles', () => {
		const { container } = render( Tabs, {
			props: { children: tabsSnippet(), height: '200px', minHeight: '100px' },
		} );

		const content = container.querySelector( '.liwe3-tabs__content' );
		expect( content ).toHaveStyle( { height: '200px', 'min-height': '100px' } );
	});
});
