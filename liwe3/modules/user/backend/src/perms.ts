/**
 * @fileoverview User Module Permissions
 *
 * Defines all permissions available in the user module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

// Permission constants
export const USER_PERM_CREATE = 'user.create';
export const USER_PERM_DELETE = 'user.delete';
export const USER_PERM_PASSWORD = 'user.password';
export const USER_PERM_LIST = 'user.list';
export const USER_PERM_PERMS = 'user.perms';
export const USER_PERM_CHANGE_IDENTITY = 'user.change_identity';
export const USER_PERM_ROLE_MANAGE = 'user.role.manage';
export const USER_PERM_2FA_MANAGE = 'user.2fa.manage';
export const USER_PERM_OAUTH_MANAGE = 'user.oauth.manage';
export const USER_PERM_ENABLE = 'user.enable';
export const USER_PERM_VERIFY = 'user.verify';

/**
 * All permissions available in the user module
 */
export const USER_PERMISSIONS : SystemPermission[] = [
	{
		name: USER_PERM_CREATE,
		description: 'Can create / update a user',
	},
	{
		name: USER_PERM_DELETE,
		description: 'Can delete a user',
	},
	{
		name: USER_PERM_PASSWORD,
		description: 'Can change the password for a user',
	},
	{
		name: USER_PERM_LIST,
		description: 'Can list all users in the system',
	},
	{
		name: USER_PERM_PERMS,
		description: "Can change user's perms",
	},
	{
		name: USER_PERM_CHANGE_IDENTITY,
		description: "The user can take another user's identity",
	},
	{
		name: USER_PERM_ROLE_MANAGE,
		description: 'The user can manage roles',
	},
	{
		name: USER_PERM_2FA_MANAGE,
		description: 'Manage 2FA',
	},
	{
		name: USER_PERM_OAUTH_MANAGE,
		description: 'Can change OAUTH settings',
	},
	{
		name: USER_PERM_ENABLE,
		description: 'Enable / Disable users',
	},
	{
		name: USER_PERM_VERIFY,
		description: 'Force email verification for user',
	},
];
