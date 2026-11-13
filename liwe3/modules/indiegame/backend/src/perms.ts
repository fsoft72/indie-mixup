/**
 * @fileoverview Indiegame Module Permissions
 *
 * Defines all permissions available in the indiegame module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

// Permission constants
export const INDIEGAME_PERM_MODERATE = 'indiegame.moderate';

/**
 * All permissions available in the indiegame module
 */
export const INDIEGAME_PERMISSIONS : SystemPermission[] = [
	{
		name: INDIEGAME_PERM_MODERATE,
		description: 'Can hide games and decide reports',
	},
];
