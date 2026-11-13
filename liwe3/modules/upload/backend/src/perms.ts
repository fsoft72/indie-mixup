/**
 * @fileoverview Upload Module Permissions
 *
 * Defines all permissions available in the upload module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

// Permission constants
export const UPLOAD_PERM_SEND_FILE = 'upload.send_file';
export const UPLOAD_PERM_DELETE = 'upload.delete';

/**
 * All permissions available in the upload module
 */
export const UPLOAD_PERMISSIONS : SystemPermission[] = [
	{
		name: UPLOAD_PERM_SEND_FILE,
		description: 'The user can upload a file',
	},
	{
		name: UPLOAD_PERM_DELETE,
		description: 'The user can delete files and folder',
	},
];
