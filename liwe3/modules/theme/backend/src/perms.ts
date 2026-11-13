/**
 * @fileoverview Theme Module Permissions
 *
 * Defines all permissions available in the theme module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

/**
 * All permissions available in the theme module
 */
export const THEME_PERMISSIONS : SystemPermission[] = [
	{
		name: 'theme.read',
		description: 'View theme configuration and list themes',
	},
	{
		name: 'theme.admin',
		description: 'Create, update, delete, import, and export themes',
	},
];
