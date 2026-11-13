import { eq } from 'drizzle-orm';
import { type LiWEApp, type LiWEResponse, responseError, responseSuccess } from '@backend/liwe3';
import { type Theme, themes } from '../schema';

interface ThemeListParams {
	domain? : string;
}

/**
 * List all themes for a domain.
 */
export const theme_list = async ( app : LiWEApp, params : ThemeListParams ) : Promise<LiWEResponse<{ themes : Theme[] }>> => {
	const domain = params?.domain || app.cfg?.system?.domain || '_';

	try {
		const list = await app.db.select()
			.from( themes )
			.where( eq( themes.domain, domain ) )
			.all();

		return responseSuccess( { themes: list } );
	} catch ( error ) {
		return responseError( 'Failed to list themes', 500, 'DATABASE_ERROR' );
	}
};
