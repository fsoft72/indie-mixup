import { type LiWEApp, type LiWEResponse, and, eq, responseError, responseSuccess } from '@backend/liwe3';
import { type Theme, themes } from '../schema';
import { generateInstanceCss } from '../css';

/**
 * Get the instance.css for the active theme.
 * This is the public endpoint that returns CSS with ETag caching.
 */
export const theme_css = async ( app : LiWEApp, params : { domain? : string } ) : Promise<LiWEResponse<{ css : string; etag : string }>> => {
	const domain = params?.domain || app.cfg?.system?.domain || '_';

	try {
		const theme = await app.db.select()
			.from( themes )
			.where( and( eq( themes.domain, domain ), eq( themes.is_default, true ) ) )
			.get();

		if ( !theme ) {
			return responseSuccess( { css: '', etag: '' } );
		}

		const css = generateInstanceCss( theme );
		const etag = `"${theme.updated_at?.getTime() || Date.now()}"`;

		return responseSuccess( { css, etag } );
	} catch ( error ) {
		return responseError( 'Failed to generate theme CSS', 500, 'DATABASE_ERROR' );
	}
};
