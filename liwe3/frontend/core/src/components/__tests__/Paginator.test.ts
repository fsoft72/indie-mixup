import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Paginator from '../Paginator.svelte';

describe('Paginator', () => {
	it('renders the current page and total pages', () => {
		render( Paginator, { props: { page: 2, rows: 10, total: 45 } } );

		expect( screen.getByText( '2 of 5' ) ).toBeInTheDocument();
	});

	it('disables First/Prev on the first page', () => {
		render( Paginator, { props: { page: 1, rows: 10, total: 45 } } );

		expect( screen.getByRole( 'button', { name: 'First' } ) ).toBeDisabled();
		expect( screen.getByRole( 'button', { name: 'Prev' } ) ).toBeDisabled();
		expect( screen.getByRole( 'button', { name: 'Next' } ) ).toBeEnabled();
		expect( screen.getByRole( 'button', { name: 'Last' } ) ).toBeEnabled();
	});

	it('disables Next/Last on the last page', () => {
		render( Paginator, { props: { page: 5, rows: 10, total: 45 } } );

		expect( screen.getByRole( 'button', { name: 'Next' } ) ).toBeDisabled();
		expect( screen.getByRole( 'button', { name: 'Last' } ) ).toBeDisabled();
		expect( screen.getByRole( 'button', { name: 'First' } ) ).toBeEnabled();
		expect( screen.getByRole( 'button', { name: 'Prev' } ) ).toBeEnabled();
	});

	it('calls onpagechange with the next page when Next is clicked', async () => {
		const onpagechange = vi.fn();
		render( Paginator, { props: { page: 2, rows: 10, total: 45, onpagechange } } );

		await userEvent.click( screen.getByRole( 'button', { name: 'Next' } ) );

		expect( onpagechange ).toHaveBeenCalledWith( 3, 10 );
	});

	it('calls onpagechange with page 1 when First is clicked', async () => {
		const onpagechange = vi.fn();
		render( Paginator, { props: { page: 3, rows: 10, total: 45, onpagechange } } );

		await userEvent.click( screen.getByRole( 'button', { name: 'First' } ) );

		expect( onpagechange ).toHaveBeenCalledWith( 1, 10 );
	});

	it('calls onpagechange with the last page when Last is clicked', async () => {
		const onpagechange = vi.fn();
		render( Paginator, { props: { page: 1, rows: 10, total: 45, onpagechange } } );

		await userEvent.click( screen.getByRole( 'button', { name: 'Last' } ) );

		expect( onpagechange ).toHaveBeenCalledWith( 5, 10 );
	});

	it('does not call onpagechange when clicking a disabled boundary button', async () => {
		const onpagechange = vi.fn();
		render( Paginator, { props: { page: 1, rows: 10, total: 45, onpagechange } } );

		await userEvent.click( screen.getByRole( 'button', { name: 'Prev' } ) );

		expect( onpagechange ).not.toHaveBeenCalled();
	});
});
