import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Spinner from '../Spinner.svelte';

describe('Spinner', () => {
	it('renders five animated dots', () => {
		const { container } = render( Spinner );

		expect( container.querySelectorAll( '.dot' ) ).toHaveLength( 5 );
	});
});
