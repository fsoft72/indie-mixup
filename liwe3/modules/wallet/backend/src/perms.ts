/**
 * @fileoverview Wallet Module Permissions
 *
 * Defines all permissions available in the wallet module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

// Permission constants
export const WALLET_PERM_CREATE = 'wallet.create';
export const WALLET_PERM_EDIT = 'wallet.edit';
export const WALLET_PERM_DELETE = 'wallet.delete';
export const WALLET_PERM_TRANSACT = 'wallet.transact';
export const WALLET_PERM_TRANSFER = 'wallet.transfer';
export const WALLET_PERM_ADMIN = 'wallet.admin';

/**
 * All permissions available in the wallet module
 */
export const WALLET_PERMISSIONS : SystemPermission[] = [
	{
		name: WALLET_PERM_CREATE,
		description: 'Can create new wallets',
	},
	{
		name: WALLET_PERM_EDIT,
		description: 'Can edit wallet details',
	},
	{
		name: WALLET_PERM_DELETE,
		description: 'Can delete wallets',
	},
	{
		name: WALLET_PERM_TRANSACT,
		description: 'Can credit or debit wallet funds',
	},
	{
		name: WALLET_PERM_TRANSFER,
		description: 'Can transfer funds between wallets',
	},
	{
		name: WALLET_PERM_ADMIN,
		description: 'Full administrative access to all wallets',
	},
];
