import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// FormCreator imports toastAdd from @liwe3/webcomponents-svelte, which ships
// uncompiled .svelte sources that vite-plugin-svelte won't transform when
// loaded from node_modules, so the module is stubbed (same approach used in
// form_plugins/__tests__/FormGroup.test.ts).
vi.mock( '@liwe3/webcomponents-svelte', () => ( { toastAdd: vi.fn() } ) );

import FormCreator, { checkRequiredFields, formCreatorPluginRegister } from '../FormCreator.svelte';
import type { FormField } from '../FormCreator.svelte';
import FormTextInput from '../form_plugins/FormTextInput.svelte';
import FormCheckbox from '../form_plugins/FormCheckbox.svelte';

beforeAll( () => {
	// Register the field types used by these tests, mirroring how a consumer
	// application wires up field types via formCreatorPluginRegister.
	formCreatorPluginRegister( 'text', FormTextInput );
	formCreatorPluginRegister( 'checkbox', FormCheckbox );
} );

describe('FormCreator', () => {
	it('renders a labeled input for each field', () => {
		const fields : FormField[] = [
			{ name: 'first_name', type: 'text', label: 'First name' },
			{ name: 'last_name', type: 'text', label: 'Last name' },
		];

		render( FormCreator, { props: { fields } } );

		expect( screen.getByLabelText( 'First name' ) ).toBeInTheDocument();
		expect( screen.getByLabelText( 'Last name' ) ).toBeInTheDocument();
	});

	it('prefills field values from the values prop', () => {
		const fields : FormField[] = [ { name: 'first_name', type: 'text', label: 'First name' } ];

		render( FormCreator, { props: { fields, values: { first_name: 'Ada' } } } );

		expect( screen.getByDisplayValue( 'Ada' ) ).toBeInTheDocument();
	});

	it('does not render fields with hide set to true', () => {
		const fields : FormField[] = [
			{ name: 'first_name', type: 'text', label: 'First name' },
			{ name: 'secret', type: 'text', label: 'Secret', hide: true },
		];

		render( FormCreator, { props: { fields } } );

		expect( screen.getByLabelText( 'First name' ) ).toBeInTheDocument();
		expect( screen.queryByLabelText( 'Secret' ) ).not.toBeInTheDocument();
	});

	it('renders submit and reset buttons by default', () => {
		render( FormCreator, { props: { fields: [] } } );

		expect( screen.getByRole( 'button', { name: 'Submit' } ) ).toBeInTheDocument();
		expect( screen.getByRole( 'button', { name: 'Reset' } ) ).toBeInTheDocument();
	});

	it('hides the buttons row when showButtons is false', () => {
		render( FormCreator, { props: { fields: [], showButtons: false } } );

		expect( screen.queryByRole( 'button', { name: 'Submit' } ) ).not.toBeInTheDocument();
	});

	it('hides only the reset button when showReset is false', () => {
		render( FormCreator, { props: { fields: [], showReset: false } } );

		expect( screen.getByRole( 'button', { name: 'Submit' } ) ).toBeInTheDocument();
		expect( screen.queryByRole( 'button', { name: 'Reset' } ) ).not.toBeInTheDocument();
	});

	it('uses custom submit and reset labels', () => {
		render( FormCreator, { props: { fields: [], submitLabel: 'Save', resetLabel: 'Clear' } } );

		expect( screen.getByRole( 'button', { name: 'Save' } ) ).toBeInTheDocument();
		expect( screen.getByRole( 'button', { name: 'Clear' } ) ).toBeInTheDocument();
	});

	it('calls onchange when a field value changes', async () => {
		const onchange = vi.fn();
		const fields : FormField[] = [ { name: 'first_name', type: 'text', label: 'First name' } ];

		render( FormCreator, { props: { fields, onchange } } );

		const input = screen.getByLabelText( 'First name' );
		await userEvent.type( input, 'A' );
		await userEvent.tab();

		expect( onchange ).toHaveBeenCalledWith( 'first_name', 'A' );
	});

	it('calls onsubmit with the current values when all required fields are filled', async () => {
		const onsubmit = vi.fn();
		const fields : FormField[] = [
			{ name: 'first_name', type: 'text', label: 'First name', required: true },
		];

		render( FormCreator, {
			props: { fields, values: { first_name: 'Ada' }, onsubmit },
		} );

		await userEvent.click( screen.getByRole( 'button', { name: 'Submit' } ) );

		expect( onsubmit ).toHaveBeenCalledWith( { first_name: 'Ada' } );
	});

	it('calls onmissing instead of onsubmit when a required field is empty', async () => {
		const onsubmit = vi.fn();
		const onmissing = vi.fn();
		const fields : FormField[] = [
			{ name: 'first_name', type: 'text', label: 'First name', required: true },
		];

		render( FormCreator, { props: { fields, onsubmit, onmissing } } );

		await userEvent.click( screen.getByRole( 'button', { name: 'Submit' } ) );

		expect( onmissing ).toHaveBeenCalledWith( [ 'First name' ] );
		expect( onsubmit ).not.toHaveBeenCalled();
	});

	it('checkRequiredFields (module export) reports missing required fields across multiple field sets', () => {
		const setA : FormField[] = [ { name: 'first_name', label: 'First name', required: true } ];
		const setB : FormField[] = [ { name: 'email', label: 'Email', required: true } ];

		const missing = checkRequiredFields( [ setA, setB ], { first_name: 'Ada' } );

		expect( missing ).toEqual( [ 'Email' ] );
	});
});
