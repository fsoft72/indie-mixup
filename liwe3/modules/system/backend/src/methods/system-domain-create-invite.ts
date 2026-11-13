import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for This endpoint creates an invitation token for a domain.

The invitation can have an `expire` date, so you can create temporary tokens.
The `expire` field is expressed in `minutes`. If you specify a value different that `0`, the token will last the `expire` minutes.
If the `expire` is set to `0` (default), the token does not expire.
 *
 * @property {string} code - The Domain unique code (required)
 * @property {number} expire - The amount of minutes the link is valid (required)
 */
const SystemDomainCreateInviteSchema = z.object( {
	code: z.string(),
	expire: z.coerce.number().default( 0 ),
} );

/** Parameters for system_domain_create_invite */
export type SystemDomainCreateInviteParams = z.infer<typeof SystemDomainCreateInviteSchema>;

/*=== f2c_start system_domain_create_invite_headers ===*/
import { system_domains } from '../schema';
import { mkid } from '@backend/liwe3';
/*=== f2c_end system_domain_create_invite_headers ===*/

/**
 * This endpoint creates an invitation token for a domain.
 *
 * The invitation can have an `expire` date, so you can create temporary tokens.
 * The `expire` field is expressed in `minutes`. If you specify a value different that `0`, the token will last the `expire` minutes.
 * If the `expire` is set to `0` (default), the token does not expire.
 *
 * @permissions logged
 *
 * @param {LiWEApp} app - The LiWE application instance with database access
 * @param {SystemDomainCreateInviteParams} params - Request parameters
 * @param {string} params.code - The Domain unique code
 * @param {number} params.expire - The amount of minutes the link is valid
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<string>>} Result object with success status and data or error details
 */
export const system_domain_create_invite = async ( ctx : LiWECtx, params : SystemDomainCreateInviteParams, sys? : LiWESysParams ) : Promise<LiWEResponse<string>> => {
	const validation = paramsValidation<SystemDomainCreateInviteParams>( SystemDomainCreateInviteSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { code, expire } = validation.data;

	/*=== f2c_start system_domain_create_invite ===*/
	try {
		// Check if domain exists and is visible
		const domain = await ctx.app.db
			.select( {
				code: system_domains.code,
				name: system_domains.name,
				visible: system_domains.visible,
			} )
			.from( system_domains )
			.where( eq( system_domains.code, code ) )
			.get();

		if ( !domain ) return responseError( 'Domain not found', 404, 'DOMAIN_NOT_FOUND' );

		if ( !domain.visible ) return responseError( 'Domain is not available for invitations', 403, 'DOMAIN_NOT_VISIBLE' );

		// Generate a simple invitation token
		// In a real implementation, this would be a secure JWT or similar token
		const inviteToken = mkid( 'inv' );

		// TODO: Store invitation token with expiration in database when invitation system is implemented
		// For now, we just return the generated token

		return responseSuccess( inviteToken );
	} catch ( error : any ) {
		return responseError( error.message, 500, 'DATABASE_ERROR' );
	}
	/*=== f2c_end system_domain_create_invite ===*/
};
