import { type LiWEApp, type LiWEResponse, eq, responseError, responseSuccess, z } from '@backend/liwe3';
import { type Theme, themes } from '../schema';

const UpdateThemeSchema = z.object( {
	id: z.number(),
	name: z.string().optional(),
	is_default: z.boolean().optional(),
	extends: z.string().optional(),
	tokens: z.record( z.record( z.string() ) ).optional(),
} );

export type ThemeUpdateParams = z.infer<typeof UpdateThemeSchema>;

/**
 * Update an existing theme.
 */
export const theme_update = async ( app : LiWEApp, params : ThemeUpdateParams ) : Promise<LiWEResponse<{ theme : Theme }>> => {
	const validation = UpdateThemeSchema.safeParse( params );
	if ( !validation.success ) {
		return responseError( validation.error.message, 400, 'VALIDATION_ERROR' );
	}

	const { id, ...updates } = validation.data;

	try {
		// If setting as default, get the theme's domain first
		if ( updates.is_default ) {
			const existing = await app.db.select()
				.from( themes )
				.where( eq( themes.id, id ) )
				.get();

			if ( existing ) {
				await app.db.update( themes )
					.set( { is_default: false } )
					.where( eq( themes.domain, existing.domain ) )
					.run();
			}
		}

		const updateData : Record<string, any> = {
			updated_at: new Date(),
		};
		if ( updates.name !== undefined ) updateData.name = updates.name;
		if ( updates.is_default !== undefined ) updateData.is_default = updates.is_default;
		if ( updates.extends !== undefined ) updateData.extends = updates.extends;
		if ( updates.tokens !== undefined ) updateData.tokens = JSON.stringify( updates.tokens );

		const result = await app.db.update( themes )
			.set( updateData )
			.where( eq( themes.id, id ) )
			.returning()
			.get();

		return responseSuccess( { theme: result } );
	} catch ( error ) {
		return responseError( 'Failed to update theme', 500, 'DATABASE_ERROR' );
	}
};
