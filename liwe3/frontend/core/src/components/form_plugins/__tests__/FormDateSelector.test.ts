import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock( '@liwe3/webcomponents-svelte', async () => {
	const { default: DateSelector } = await import( './mocks/DateSelectorStub.svelte' );
	return { DateSelector };
} );

import FormDateSelector from '../FormDateSelector.svelte';
import type { FormField } from '../../FormCreator.svelte';

const baseField : FormField = { name: 'when', label: 'When' };

describe('FormDateSelector', () => {
	it('renders the field label', () => {
		render( FormDateSelector, {
			props: { field: baseField, name: 'when', _v: () => null, onchange: vi.fn() },
		} );

		expect( screen.getByText( 'When' ) ).toBeInTheDocument();
	});

	it('does not render a label when the field has none', () => {
		const field : FormField = { name: 'when' };
		render( FormDateSelector, { props: { field, name: 'when', _v: () => null, onchange: vi.fn() } } );

		expect( screen.queryByText( 'When' ) ).not.toBeInTheDocument();
	});

	it('passes the current value as selectedDate in single mode', () => {
		render( FormDateSelector, {
			props: { field: baseField, name: 'when', _v: () => '2024-05-01', onchange: vi.fn() },
		} );

		expect( screen.getByTestId( 'date-selector-stub' ) ).toHaveAttribute( 'data-selected-date', '2024-05-01' );
	});

	it('defaults to a null/null range when rangeMode is enabled with no value', () => {
		const field : FormField = { ...baseField, extra: { rangeMode: true } };
		render( FormDateSelector, { props: { field, name: 'when', _v: () => undefined, onchange: vi.fn() } } );

		const stub = screen.getByTestId( 'date-selector-stub' );
		expect( stub ).toHaveAttribute( 'data-range-mode', 'true' );
		expect( stub ).toHaveAttribute( 'data-selected-range', JSON.stringify( { start: null, end: null } ) );
	});

	it('calls onchange with the selected date when a date is chosen', async () => {
		const onchange = vi.fn();
		render( FormDateSelector, { props: { field: baseField, name: 'when', _v: () => null, onchange } } );

		await userEvent.click( screen.getByText( 'trigger-date' ) );

		expect( onchange ).toHaveBeenCalledWith( 'when', '2024-01-15', baseField );
	});

	it('calls onchange with the selected range when a range is chosen', async () => {
		const onchange = vi.fn();
		const field : FormField = { ...baseField, extra: { rangeMode: true } };
		render( FormDateSelector, { props: { field, name: 'when', _v: () => null, onchange } } );

		await userEvent.click( screen.getByText( 'trigger-range' ) );

		expect( onchange ).toHaveBeenCalledWith( 'when', { start: '2024-01-01', end: '2024-01-31' }, field );
	});
});
