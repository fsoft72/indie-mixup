/**
 * @fileoverview Credentials Module Permissions
 *
 * Defines all permissions available in the credentials module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

// Permission constants
export const CREDENTIALS_PERM_CREATE = 'credentials.create';
export const CREDENTIALS_PERM_DELETE = 'credentials.delete';
export const CREDENTIALS_PERM_ADMIN = 'credentials.admin';

/**
 * All permissions available in the credentials module
 */
export const CREDENTIALS_PERMISSIONS : SystemPermission[] = [
	{
		name: CREDENTIALS_PERM_CREATE,
		description: 'Can create / modify the credentials',
	},
	{
		name: CREDENTIALS_PERM_DELETE,
		description: 'Can delete some credentials',
	},
	{
		name: CREDENTIALS_PERM_ADMIN,
		description: 'Can edit / delete credentials owned by other users in the same domain',
	},
];
