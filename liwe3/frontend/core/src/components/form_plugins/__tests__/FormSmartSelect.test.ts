import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock( '@liwe3/webcomponents-svelte', async () => {
	const { default: SmartSelect } = await import( './mocks/SmartSelectStub.svelte' );
	return { SmartSelect };
} );

import FormSmartSelect from '../FormSmartSelect.svelte';
import type { FormField } from '../../FormCreator.svelte';

const baseField : FormField = {
	name: 'country',
	label: 'Country',
	options: [
		{ label: 'Italy', value: 'it' },
		{ label: 'France', value: 'fr' },
	],
};

describe('FormSmartSelect', () => {
	it('renders the field label', () => {
		render( FormSmartSelect, {
			props: { field: baseField, name: 'country', _v: () => '', onchange: vi.fn() },
		} );

		expect( screen.getByText( 'Country' ) ).toBeInTheDocument();
	});

	it('does not render a label when the field has none', () => {
		const field : FormField = { name: 'country' };
		render( FormSmartSelect, { props: { field, name: 'country', _v: () => '', onchange: vi.fn() } } );

		expect( screen.queryByText( 'Country' ) ).not.toBeInTheDocument();
	});

	it('passes the current value from _v to the underlying select', () => {
		render( FormSmartSelect, {
			props: { field: baseField, name: 'country', _v: () => 'it', onchange: vi.fn() },
		} );

		expect( screen.getByTestId( 'smart-select-stub' ) ).toHaveAttribute( 'data-value', 'it' );
	});

	it('defaults to an empty array value when multiple mode has no value', () => {
		const field : FormField = { ...baseField, extra: { multiple: true } };
		render( FormSmartSelect, { props: { field, name: 'country', _v: () => undefined, onchange: vi.fn() } } );

		expect( screen.getByTestId( 'smart-select-stub' ) ).toHaveAttribute( 'data-value', '[]' );
	});

	it('defaults to an empty string value in single mode', () => {
		render( FormSmartSelect, {
			props: { field: baseField, name: 'country', _v: () => undefined, onchange: vi.fn() },
		} );

		expect( screen.getByTestId( 'smart-select-stub' ) ).toHaveAttribute( 'data-value', '' );
	});

	it('forwards the options to the underlying select', () => {
		render( FormSmartSelect, {
			props: { field: baseField, name: 'country', _v: () => '', onchange: vi.fn() },
		} );

		expect( screen.getByTestId( 'smart-select-stub' ) ).toHaveAttribute( 'data-options-count', '2' );
	});

	it('calls onchange with the field name, value and field when the selection changes', async () => {
		const onchange = vi.fn();
		render( FormSmartSelect, { props: { field: baseField, name: 'country', _v: () => '', onchange } } );

		await userEvent.click( screen.getByText( 'trigger-change' ) );

		expect( onchange ).toHaveBeenCalledWith( 'country', 'opt-1', baseField );
	});
});
