import { type LiWEApp, type LiWEResponse, eq, responseError, responseSuccess, z } from '@backend/liwe3';
import { type Theme, themes } from '../schema';

const ExportThemeSchema = z.object( {
	id: z.number(),
} );

export type ThemeExportParams = z.infer<typeof ExportThemeSchema>;

interface ThemeExportFormat {
	$schema : string;
	name : string;
	extends? : string;
	variants : Record<string, { seed : Record<string, string> }>;
}

/**
 * Export a theme in the exchange JSON format.
 */
export const theme_export = async ( app : LiWEApp, params : ThemeExportParams ) : Promise<LiWEResponse<ThemeExportFormat>> => {
	const validation = ExportThemeSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	try {
		const theme = await app.db.select()
			.from( themes )
			.where( eq( themes.id, validation.data.id ) )
			.get();

		if ( !theme ) {
			return responseError( 'Theme not found', 404, 'NOT_FOUND' );
		}

		const tokens = JSON.parse( theme.tokens );
		const variants : Record<string, { seed : Record<string, string> }> = {};

		for ( const [ variant, seeds ] of Object.entries( tokens ) ) {
			variants[variant] = { seed: seeds as Record<string, string> };
		}

		return responseSuccess( {
			$schema: 'liwe3-theme/v1',
			name: theme.name,
			extends: theme.extends || undefined,
			variants,
		} );
	} catch ( error ) {
		return responseError( 'Failed to export theme', 500, 'DATABASE_ERROR' );
	}
};
