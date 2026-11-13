import { type LiWEApp, type LiWEResponse, responseError, responseSuccess, z } from '@backend/liwe3';
import { theme_add } from './theme-add';

const ImportThemeSchema = z.object( {
	$schema: z.string().optional(),
	name: z.string(),
	extends: z.string().optional(),
	variants: z.record( z.object( {
		seed: z.record( z.string() ),
	} ) ),
	scales: z.record( z.string() ).optional(),
	fonts: z.record( z.string() ).optional(),
	domain: z.string().optional(),
} );

export type ThemeImportParams = z.infer<typeof ImportThemeSchema>;

/**
 * Import a theme from JSON format.
 * Converts the exchange format to internal seed storage.
 */
export const theme_import = async ( app : LiWEApp, params : ThemeImportParams ) : Promise<LiWEResponse<any>> => {
	const validation = ImportThemeSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { name, extends: extendsTheme, variants, domain } = validation.data;

	// Convert variants format to internal tokens format
	const tokens : Record<string, Record<string, string>> = {};
	for ( const [ variant, data ] of Object.entries( variants ) ) {
		tokens[variant] = data.seed;
	}

	return theme_add( app, {
		name,
		domain: domain || app.cfg?.system?.domain || '_',
		is_default: false,
		extends: extendsTheme,
		tokens,
	} );
};
