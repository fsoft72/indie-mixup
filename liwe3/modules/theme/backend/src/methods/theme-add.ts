import { type LiWEApp, type LiWEResponse, eq, responseError, responseSuccess, z } from '@backend/liwe3';
import { type Theme, themes } from '../schema';

const AddThemeSchema = z.object( {
	name: z.string().min( 1, 'Theme name is required' ),
	domain: z.string().optional().default( '_' ),
	is_default: z.boolean().optional().default( false ),
	extends: z.string().optional(),
	tokens: z.record( z.record( z.string() ) ),
} );

export type ThemeAddParams = z.infer<typeof AddThemeSchema>;

/**
 * Create a new theme.
 */
export const theme_add = async ( app : LiWEApp, params : ThemeAddParams ) : Promise<LiWEResponse<{ theme : Theme }>> => {
	const validation = AddThemeSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { name, domain, is_default, extends: extendsTheme, tokens } = validation.data;

	try {
		// If setting as default, unset existing default for this domain
		if ( is_default ) {
			await app.db.update( themes )
				.set( { is_default: false } )
				.where( eq( themes.domain, domain ) )
				.run();
		}

		const result = await app.db.insert( themes ).values( {
			name,
			domain,
			is_default,
			extends: extendsTheme,
			tokens: JSON.stringify( tokens ),
		} ).returning().get();

		return responseSuccess( { theme: result } );
	} catch ( error ) {
		return responseError( 'Failed to create theme', 500, 'DATABASE_ERROR' );
	}
};
