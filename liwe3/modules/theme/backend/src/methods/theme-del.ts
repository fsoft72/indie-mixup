import { type LiWEApp, type LiWEResponse, eq, responseError, responseSuccess, z } from '@backend/liwe3';
import { themes } from '../schema';

const DelThemeSchema = z.object( {
	id: z.number(),
} );

export type ThemeDelParams = z.infer<typeof DelThemeSchema>;

/**
 * Delete a theme.
 */
export const theme_del = async ( app : LiWEApp, params : ThemeDelParams ) : Promise<LiWEResponse<{}>> => {
	const validation = DelThemeSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	try {
		await app.db.delete( themes )
			.where( eq( themes.id, validation.data.id ) )
			.run();

		return responseSuccess( {} );
	} catch ( error ) {
		return responseError( 'Failed to delete theme', 500, 'DATABASE_ERROR' );
	}
};
