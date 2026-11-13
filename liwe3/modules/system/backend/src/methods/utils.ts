/**
 * @fileoverview Common utilities for system module methods
 */

// Core imports
export { LiWEApp, LiWEResponse, LiWESysParams, responseError, responseSuccess, zodBoolean } from '@backend/liwe3';
export type { LiWECtx } from '@backend/liwe3';

// Database operation imports
export { eq, and, ne, desc, asc, count, avg, sql, inArray, or, like, isNull } from 'drizzle-orm';

// Schema imports
// TODO: Import your schema tables here

// Zod for validation
export { z } from 'zod';

/*=== f2c_start utils ===*/

// Add custom imports or utilities here
import { LiWEApp, LiWEUser } from '@backend/liwe3';
export const generate_domain_segment_code = async ( app : LiWEApp, user : LiWEUser, domain? : string ) : Promise<string> => {
	const code = new Date().getTime().toString( 36 );

	if ( !domain || domain.length === 0 ) return user.domain + '.' + code;

	return domain + '.' + code;
};
/*=== f2c_end utils ===*/
