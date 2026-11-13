/**
 * @fileoverview Comment Module Permissions
 *
 * Defines all permissions available in the comment module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

// Permission constants
export const COMMENT_PERM_DEL = 'comment.del';

/**
 * All permissions available in the comment module
 */
export const COMMENT_PERMISSIONS : SystemPermission[] = [
	{
		name: COMMENT_PERM_DEL,
		description: 'User can delete all comments (not just his/hers)',
	},
];
