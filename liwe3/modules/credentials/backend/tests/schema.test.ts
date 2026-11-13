import { describe, expect, it } from 'vitest';
import { credentials_items } from '../src/schema';

describe('credentials_items table schema', () => {
	it('should be defined', () => {
		expect( credentials_items ).toBeDefined();
	});

	it('should have a required type column', () => {
		expect( credentials_items.type ).toBeDefined();
		expect( credentials_items.type.notNull ).toBe( true );
	});

	it('should have an optional data_enc column', () => {
		expect( credentials_items.data_enc ).toBeDefined();
		expect( credentials_items.data_enc.notNull ).toBe( false );
	});
});
