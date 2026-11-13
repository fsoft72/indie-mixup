import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import FormHidden from '../FormHidden.svelte';
import type { FormField } from '../../FormCreator.svelte';

const baseField : FormField = { name: 'token' };

describe('FormHidden', () => {
	it('renders a hidden input with the given name', () => {
		const { container } = render( FormHidden, {
			props: { field: baseField, name: 'token', _v: () => 'abc123', onchange: vi.fn() },
		} );

		const input = container.querySelector( 'input[type="hidden"]' ) as HTMLInputElement;
		expect( input ).not.toBeNull();
		expect( input.name ).toBe( 'token' );
	});

	it('sets the input value from _v', () => {
		const { container } = render( FormHidden, {
			props: { field: baseField, name: 'token', _v: () => 'abc123', onchange: vi.fn() },
		} );

		const input = container.querySelector( 'input[type="hidden"]' ) as HTMLInputElement;
		expect( input.value ).toBe( 'abc123' );
	});
});
