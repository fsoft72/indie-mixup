import { describe, expect, it } from 'vitest';
import { notification_settings, notifications } from '../src/schema';

describe('notifications table schema', () => {
	it('should be defined', () => {
		expect( notifications ).toBeDefined();
	});

	it('should have a required id_user column', () => {
		expect( notifications.id_user ).toBeDefined();
		expect( notifications.id_user.notNull ).toBe( true );
	});

	it('should have an optional snooze_until column', () => {
		expect( notifications.snooze_until ).toBeDefined();
		expect( notifications.snooze_until.notNull ).toBe( false );
	});
});

describe('notification_settings table schema', () => {
	it('should be defined', () => {
		expect( notification_settings ).toBeDefined();
	});

	it('should have a required event_type column', () => {
		expect( notification_settings.event_type ).toBeDefined();
		expect( notification_settings.event_type.notNull ).toBe( true );
	});
});
