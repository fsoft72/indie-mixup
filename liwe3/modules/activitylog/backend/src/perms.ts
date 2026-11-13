/**
 * @fileoverview Activitylog Module Permissions
 *
 * Defines all permissions available in the activitylog module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

// Permission constants
export const ACTIVITYLOG_PERM_EVENT_ADD = 'activitylog.event_add';
export const ACTIVITYLOG_PERM_EVENT_VIEW = 'activitylog.event_view';
export const ACTIVITYLOG_PERM_EVENT_DEL = 'activitylog.event_del';

/**
 * All permissions available in the activitylog module
 */
export const ACTIVITYLOG_PERMISSIONS : SystemPermission[] = [
	{
		name: ACTIVITYLOG_PERM_EVENT_ADD,
		description: 'Can add an event to the system',
	},
	{
		name: ACTIVITYLOG_PERM_EVENT_VIEW,
		description: 'Can get all events',
	},
	{
		name: ACTIVITYLOG_PERM_EVENT_DEL,
		description: 'Allows to remove an event',
	},
];
