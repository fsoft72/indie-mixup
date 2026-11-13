/**
 * @fileoverview System Module Permissions
 *
 * Defines all permissions available in the system module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

// Permission constants
export const SYSTEM_PERM_ADMIN = 'system.admin';
export const SYSTEM_PERM_DOMAIN = 'system.domain';
export const SYSTEM_PERM_THEME = 'system.theme';
export const SYSTEM_PERM_MULTI_TIER = 'system.multi-tier';
export const SYSTEM_PERM_MULTI_TIER_CREATE_SUB = 'system.multi-tier.create-sub';
export const SYSTEM_PERM_ROLE_CHANGE = 'system.role_change';

/**
 * All permissions available in the system module
 */
export const SYSTEM_PERMISSIONS : SystemPermission[] = [
	{
		name: SYSTEM_PERM_ADMIN,
		description: 'The super user permission to do everything',
	},
	{
		name: SYSTEM_PERM_DOMAIN,
		description: 'The user can operate on system domains',
	},
	{
		name: SYSTEM_PERM_THEME,
		description: 'The user can manage system themes',
	},
	{
		name: SYSTEM_PERM_MULTI_TIER,
		description: 'Ability to create subdomains and assign roles within their domain hierarchy',
	},
	{
		name: SYSTEM_PERM_MULTI_TIER_CREATE_SUB,
		description: 'Can create a subdomain inside a multi-tier domain',
	},
	{
		name: SYSTEM_PERM_ROLE_CHANGE,
		description: 'Can change the role of a user  (multi-tier | user)',
	},
];
