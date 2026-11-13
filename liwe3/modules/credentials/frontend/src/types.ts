import { z } from 'zod';
import { zodBoolean } from '@frontend/liwe3';

/*=== f2c_start __types ===*/

// Add custom types here
/*=== f2c_end __types ===*/

/**
 * Schema for CredentialsItem
 *
 * @property {str} id - CredentialsItem main ID (required, max 64 chars)
 * @property {str} domain - Credentials domain (required, max 64 chars)
 * @property {str} id_owner - User ID who created the credentials (required, max 64 chars)
 * @property {str} name - Credentials name (required, max 120 chars)
 * @property {str} type - Credentials type (required, max 30 chars)
 * @property {none} metadata - Public metadata (required)
 * @property {[str]} data_enc - IV + Ciphertext
 */
const ZCredentialsItem = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	id_owner: z.string().max( 64, 'Id_owner must be at most 64 characters' ),
	name: z.string().max( 120, 'Name must be at most 120 characters' ),
	type: z.string().max( 30, 'Type must be at most 30 characters' ),
	metadata: z.any(),
	data_enc: z.string().optional(),
} );

export type CredentialsItem = z.infer<typeof ZCredentialsItem>;
export { ZCredentialsItem };
