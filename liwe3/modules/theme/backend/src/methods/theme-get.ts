import { and, eq } from 'drizzle-orm';
import { type LiWEApp, type LiWEResponse, responseError, responseSuccess } from '@backend/liwe3';
import { type Theme, themes } from '../schema';

interface ThemeGetParams {
	domain? : string;
}

/**
 * Get the active theme for a domain.
 */
export const theme_get = async ( app : LiWEApp, params : ThemeGetParams ) : Promise<LiWEResponse<{ theme : Theme | null }>> => {
	const domain = params?.domain || app.cfg?.system?.domain || '_';

	try {
		const theme = await app.db.select()
			.from( themes )
			.where( and( eq( themes.domain, domain ), eq( themes.is_default, true ) ) )
			.get();

		return responseSuccess( { theme: theme || null } );
	} catch ( error ) {
		return responseError( 'Failed to fetch theme', 500, 'DATABASE_ERROR' );
	}
};
