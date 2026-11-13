import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PINInput from '../PINInput.svelte';

describe('PINInput', () => {
	it('renders the default number of fields (6)', () => {
		const { container } = render( PINInput );

		expect( container.querySelectorAll( 'input' ) ).toHaveLength( 6 );
	});

	it('renders a custom number of fields based on size', () => {
		const { container } = render( PINInput, { props: { size: 4 } } );

		expect( container.querySelectorAll( 'input' ) ).toHaveLength( 4 );
	});

	it('applies the mode class to the container', () => {
		const { container } = render( PINInput, { props: { mode: 'danger' } } );

		expect( container.querySelector( '.container' ) ).toHaveClass( 'danger' );
	});

	it('marks each field as required with a single character max length', () => {
		const { container } = render( PINInput, { props: { size: 4 } } );

		const inputs = container.querySelectorAll( 'input' );
		inputs.forEach( ( input ) => {
			expect( input ).toBeRequired();
			expect( input ).toHaveAttribute( 'maxLength', '1' );
		} );
	});

	it('moves focus to the next field when typing a digit', async () => {
		const { container } = render( PINInput, { props: { size: 3 } } );

		const inputs = container.querySelectorAll<HTMLInputElement>( 'input' );
		inputs[0].focus();
		await userEvent.type( inputs[0], '5' );

		expect( inputs[1] ).toHaveFocus();
	});

	it('moves focus to the previous field on Backspace', async () => {
		const { container } = render( PINInput, { props: { size: 3 } } );

		const inputs = container.querySelectorAll<HTMLInputElement>( 'input' );
		inputs[1].focus();
		await userEvent.keyboard( '{Backspace}' );

		expect( inputs[0] ).toHaveFocus();
	});
});
