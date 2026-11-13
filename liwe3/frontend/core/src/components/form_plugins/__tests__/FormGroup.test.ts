import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// FormGroup renders a nested FormCreator, which in turn imports toastAdd from
// @liwe3/webcomponents-svelte. That package ships uncompiled .svelte sources
// in its dist folder, which vite-plugin-svelte will not transform when the
// files are loaded from node_modules, so the whole module must be stubbed.
vi.mock( '@liwe3/webcomponents-svelte', () => ( { toastAdd: vi.fn() } ) );

import FormGroup, { validate } from '../FormGroup.svelte';
import { formCreatorPluginRegister } from '../../FormCreator.svelte';
import FormTextInput from '../FormTextInput.svelte';
import type { FormField } from '../../FormCreator.svelte';

beforeAll( () => {
	// Register the 'text' plugin used by the nested FormCreator, mirroring how
	// the consumer application wires up field types via formCreatorPluginRegister.
	formCreatorPluginRegister( 'text', FormTextInput );
} );

const baseField : FormField = {
	name: 'address',
	label: 'Address',
	extra: {
		fields: [
			{ name: 'street', label: 'Street', type: 'text' },
			{ name: 'city', label: 'City', type: 'text' },
		],
	},
};

describe('FormGroup', () => {
	it('renders the group label', () => {
		render( FormGroup, {
			props: { field: baseField, name: 'address', _v: () => ( {} ), onchange: vi.fn() },
		} );

		expect( screen.getByText( 'Address' ) ).toBeInTheDocument();
	});

	it('renders each sub-field with its own label and prefilled value after mount', async () => {
		render( FormGroup, {
			props: {
				field: baseField,
				name: 'address',
				_v: () => ( { street: '123 Main St', city: 'Rome' } ),
				onchange: vi.fn(),
			},
		} );

		expect( await screen.findByDisplayValue( '123 Main St' ) ).toBeInTheDocument();
		expect( screen.getByDisplayValue( 'Rome' ) ).toBeInTheDocument();
	});

	it('calls onchange with the merged sub-field values when a nested field changes', async () => {
		const onchange = vi.fn();
		render( FormGroup, {
			props: {
				field: baseField,
				name: 'address',
				_v: () => ( { street: '123 Main St', city: 'Rome' } ),
				onchange,
			},
		} );

		const street = await screen.findByDisplayValue( '123 Main St' );
		await userEvent.type( street, '!' );
		await userEvent.tab();

		expect( onchange ).toHaveBeenCalledOnce();
		const [ name, value, field ] = onchange.mock.calls[0];
		expect( name ).toBe( 'address' );
		expect( value ).toEqual( { street: '123 Main St!', city: 'Rome' } );
		expect( field ).toBe( baseField );
	});
});

describe('FormGroup validate', () => {
	it('reports missing required sub-fields prefixed with the group label', () => {
		const field : FormField = {
			name: 'address',
			label: 'Address',
			extra: { fields: [ { name: 'street', label: 'Street', required: true } ] },
		};

		expect( validate( field, { address: {} } ) ).toEqual( [ 'Address > Street' ] );
	});

	it('returns an empty array when all required sub-fields are filled', () => {
		const field : FormField = {
			name: 'address',
			label: 'Address',
			extra: { fields: [ { name: 'street', label: 'Street', required: true } ] },
		};

		expect( validate( field, { address: { street: '123 Main St' } } ) ).toEqual( [] );
	});

	it('returns an empty array when the group has no configured fields', () => {
		const field : FormField = { name: 'address', label: 'Address', extra: {} };

		expect( validate( field, { address: {} } ) ).toEqual( [] );
	});
});
