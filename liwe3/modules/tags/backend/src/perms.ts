/**
 * @fileoverview Tags Module Permissions
 *
 * Defines all permissions available in the tags module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

// Permission constants (same naming the flow2code generated perms.ts would use)
export const TAGS_PERM_CREATE = 'tags.create';
export const TAGS_PERM_READ = 'tags.read';
export const TAGS_PERM_UPDATE = 'tags.update';
export const TAGS_PERM_DELETE = 'tags.delete';
export const TAGS_PERM_ADMIN = 'tags.admin';

/**
 * All permissions available in the tags module
 */
export const TAGS_PERMISSIONS : SystemPermission[] = [
	{
		name: TAGS_PERM_CREATE,
		description: 'Create new tags and add tags to objects',
	},
	{
		name: TAGS_PERM_READ,
		description: 'View and search tags and tagged objects',
	},
	{
		name: TAGS_PERM_UPDATE,
		description: 'Update tag relevance and merge tags',
	},
	{
		name: TAGS_PERM_DELETE,
		description: 'Remove tags from objects and delete tags',
	},
	{
		name: TAGS_PERM_ADMIN,
		description: 'Full administrative access to tags system including bulk operations',
	},
];
