import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CopyTextToClipboard from '../CopyTextToClipboard.svelte';

/** Overrides navigator.clipboard.writeText for the duration of a test. */
const stubClipboard = ( writeText : ReturnType<typeof vi.fn> ) => {
	Object.defineProperty( navigator, 'clipboard', {
		value: { writeText },
		configurable: true,
	} );
};

describe('CopyTextToClipboard', () => {
	it('renders the default button label', () => {
		render( CopyTextToClipboard, { props: { text: 'hello world' } } );

		expect( screen.getByRole( 'button' ) ).toHaveTextContent( 'Copy to Clipboard' );
	});

	it('copies the given text and shows the success message', async () => {
		const writeText = vi.fn().mockResolvedValue( undefined );
		stubClipboard( writeText );

		render( CopyTextToClipboard, { props: { text: 'hello world' } } );
		await userEvent.click( screen.getByRole( 'button' ) );

		expect( writeText ).toHaveBeenCalledWith( 'hello world' );
		expect( screen.getByText( 'Copied!' ) ).toBeInTheDocument();
	});

	it('supports a text-producing function', async () => {
		const writeText = vi.fn().mockResolvedValue( undefined );
		stubClipboard( writeText );

		render( CopyTextToClipboard, { props: { text: () => 'dynamic text' } } );
		await userEvent.click( screen.getByRole( 'button' ) );

		expect( writeText ).toHaveBeenCalledWith( 'dynamic text' );
	});

	it('shows a custom success message', async () => {
		const writeText = vi.fn().mockResolvedValue( undefined );
		stubClipboard( writeText );

		render( CopyTextToClipboard, { props: { text: 'hello', successMessage: 'Done!' } } );
		await userEvent.click( screen.getByRole( 'button' ) );

		expect( screen.getByText( 'Done!' ) ).toBeInTheDocument();
	});

	it('shows the error message when the clipboard write fails', async () => {
		const writeText = vi.fn().mockRejectedValue( new Error( 'nope' ) );
		stubClipboard( writeText );
		vi.spyOn( console, 'error' ).mockImplementation( () => {} );

		render( CopyTextToClipboard, { props: { text: 'hello', errorMessage: 'Oops' } } );
		await userEvent.click( screen.getByRole( 'button' ) );

		expect( await screen.findByText( 'Oops' ) ).toBeInTheDocument();
	});

	it('resets the feedback message after the feedback duration', async () => {
		vi.useFakeTimers();

		const writeText = vi.fn().mockResolvedValue( undefined );
		stubClipboard( writeText );

		const user = userEvent.setup( { advanceTimers: vi.advanceTimersByTime } );
		render( CopyTextToClipboard, { props: { text: 'hello', feedbackDuration: 1000 } } );

		await user.click( screen.getByRole( 'button' ) );
		expect( screen.getByText( 'Copied!' ) ).toBeInTheDocument();

		await vi.advanceTimersByTimeAsync( 1000 );

		expect( screen.getByRole( 'button' ) ).toHaveTextContent( 'Copy to Clipboard' );

		vi.useRealTimers();
	});
});
