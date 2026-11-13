import { describe, expect, it } from 'vitest';
import { activity_log_events } from '../src/schema';

describe('activity_log_events table schema', () => {
	it('should be defined', () => {
		expect( activity_log_events ).toBeDefined();
	});

	it('should have a required event column', () => {
		expect( activity_log_events.event ).toBeDefined();
		expect( activity_log_events.event.notNull ).toBe( true );
	});

	it('should have an optional id_user column', () => {
		expect( activity_log_events.id_user ).toBeDefined();
		expect( activity_log_events.id_user.notNull ).toBe( false );
	});
});
