import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, and, eq, isNull, like, or, responseError, responseSuccess, z, zodBoolean } from './utils';
import { ERR_PERMISSION_DENIED, ERR_UNAUTHORIZED, paramsValidation } from '@backend/liwe3';

/**
 * Schema for Verify code against user secret.
If the code is valid, returns the recovery codes and enable 2FA for the user.

 *
 * @property {string} code - The current OTP code (required)
 */
const User2faEnableSchema = z.object( {
	code: z.string(),
} );

/** Parameters for user_2fa_enable */
export type User2faEnableParams = z.infer<typeof User2faEnableSchema>;

/*=== f2c_start user_2fa_enable_headers ===*/
import { decryptData, hashPassword, totpVerify } from '@backend/liwe3/src/crypto';
import { users } from '../schema';

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I, avoids ambiguous chars

/**
 * Generates a set of random, human-typeable recovery codes
 */
const generateRecoveryCodes = ( count : number = RECOVERY_CODE_COUNT ) : string[] => {
	const codes : string[] = [];

	for ( let i = 0; i < count; i++ ) {
		const bytes = crypto.getRandomValues( new Uint8Array( 10 ) );
		let code = '';
		for ( const byte of bytes ) code += RECOVERY_CODE_ALPHABET[byte % RECOVERY_CODE_ALPHABET.length];
		codes.push( code );
	}

	return codes;
};
/*=== f2c_end user_2fa_enable_headers ===*/

/**
 * Verify code against user secret.
 * If the code is valid, returns the recovery codes and enable 2FA for the user.
 *
 * @permissions logged
 *
 * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)
 * @param {User2faEnableParams} params - Request parameters
 * @param {string} params.code - The current OTP code
 * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<string[]>>} Result object with success status and data or error details
 */
export const user_2fa_enable = async ( ctx : LiWECtx, params : User2faEnableParams, sys? : LiWESysParams ) : Promise<LiWEResponse<string[]>> => {
	const validation = paramsValidation<User2faEnableParams>( User2faEnableSchema as any, params );
	if ( !validation.success ) return validation.error;

	const { code } = validation.data;

	/*=== f2c_start user_2fa_enable ===*/

	const user = await ctx.user();
	if ( !user ) return responseError( 'Not logged in', 401, ERR_UNAUTHORIZED );

	const dbUser = await ctx.app.db.select().from( users ).where( eq( users.id, user.id! ) ).get();
	if ( !dbUser?.two_factor_secret ) return responseError( '2FA setup was not started', 400, '2FA_NOT_STARTED' );

	const { secret } = await decryptData( dbUser.two_factor_secret, ctx.app.cfg.jwt.secret ) as { secret : string };
	if ( !await totpVerify( secret, code ) ) return responseError( 'Invalid code', 400, '2FA_INVALID_CODE' );

	const recoveryCodes = generateRecoveryCodes();
	const hashedRecoveryCodes = await Promise.all( recoveryCodes.map( ( c ) => hashPassword( c ) ) );

	await ctx.app.db.update( users ).set( {
		two_factor_enabled: true,
		two_factor_recovery_codes: hashedRecoveryCodes,
	} ).where( eq( users.id, user.id! ) ).run();

	return responseSuccess( recoveryCodes );
	/*=== f2c_end user_2fa_enable ===*/
};
