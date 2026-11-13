/**
 * @fileoverview Notifier Module Permissions
 *
 * Defines all permissions available in the notifier module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

// Permission constants
export const NOTIFIER_PERM_ADD = 'notifier.add';
export const NOTIFIER_PERM_LIST = 'notifier.list';
export const NOTIFIER_PERM_DISMISS = 'notifier.dismiss';
export const NOTIFIER_PERM_SNOOZE = 'notifier.snooze';
export const NOTIFIER_PERM_SETTINGS_VIEW = 'notifier.settings_view';
export const NOTIFIER_PERM_SETTINGS_UPDATE = 'notifier.settings_update';
export const NOTIFIER_PERM_SETTINGS_DELETE = 'notifier.settings_delete';

/**
 * All permissions available in the notifier module
 */
export const NOTIFIER_PERMISSIONS : SystemPermission[] = [
	{
		name: NOTIFIER_PERM_ADD,
		description: 'Can create notifications',
	},
	{
		name: NOTIFIER_PERM_LIST,
		description: 'Can list notifications',
	},
	{
		name: NOTIFIER_PERM_DISMISS,
		description: 'Can dismiss notifications',
	},
	{
		name: NOTIFIER_PERM_SNOOZE,
		description: 'Can snooze notifications',
	},
	{
		name: NOTIFIER_PERM_SETTINGS_VIEW,
		description: 'Can view notification settings',
	},
	{
		name: NOTIFIER_PERM_SETTINGS_UPDATE,
		description: 'Can update notification settings',
	},
	{
		name: NOTIFIER_PERM_SETTINGS_DELETE,
		description: 'Can delete notification settings',
	},
];
