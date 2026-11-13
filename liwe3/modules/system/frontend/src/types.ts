import { z } from 'zod';
import { zodBoolean } from '@frontend/liwe3';

/*=== f2c_start __types ===*/

/*=== f2c_end __types ===*/

/**
 * Schema for SystemDomain
 *
 * @property {str} code - The domain unique code (required, max 30 chars)
 * @property {str} name - The domain name (required, max 50 chars)
 * @property {bool} visible - If the domain is visible (required)
 * @property {num} total_max_tiers - Maximum number of tiers this domain can handle (required)
 * @property {num} tiers_allocated - The sum of `total_max_tiers` values of all **direct children** of this domain. Dynamically updated when children are created or deleted (required)
 */
const ZSystemDomain = z.object( {
	code: z.string().max( 30, 'Code must be at most 30 characters' ),
	name: z.string().max( 50, 'Name must be at most 50 characters' ),
	visible: zodBoolean.default( false ),
	total_max_tiers: z.coerce.number(),
	tiers_allocated: z.coerce.number(),
} );

export type SystemDomain = z.infer<typeof ZSystemDomain>;
export { ZSystemDomain };

/**
 * Schema for SystemDomainAdmin
 *
 * @property {str} code - The domain unique code (required)
 * @property {str} name - The domain name (required)
 * @property {bool} visible - If the domain is visible (required)
 * @property {num} tiers_allocated - Number of allocated tiers (required)
 * @property {num} total_max_tiers - Total tiers the domain can create (required)
 */
const ZSystemDomainAdmin = z.object( {
	code: z.string(),
	name: z.string(),
	visible: zodBoolean.default( false ),
	tiers_allocated: z.coerce.number(),
	total_max_tiers: z.coerce.number(),
} );

export type SystemDomainAdmin = z.infer<typeof ZSystemDomainAdmin>;
export { ZSystemDomainAdmin };

/**
 * Schema for SystemDomainPublic
 *
 * @property {str} code - code field (required)
 * @property {str} name - name field (required)
 */
const ZSystemDomainPublic = z.object( {
	code: z.string(),
	name: z.string(),
} );

export type SystemDomainPublic = z.infer<typeof ZSystemDomainPublic>;
export { ZSystemDomainPublic };

/**
 * Schema for SystemTheme
 *
 * @property {str} code - The domain code (required, max 30 chars)
 * @property {none} data - The Theme data (required)
 */
const ZSystemTheme = z.object( {
	code: z.string().max( 30, 'Code must be at most 30 characters' ),
	data: z.any(),
} );

export type SystemTheme = z.infer<typeof ZSystemTheme>;
export { ZSystemTheme };

/**
 * Schema for SystemConfigOverride
 *
 * @property {str} key - Dotted path of the overridden config key (e.g. jwt.expiresIn) (required, max 100 chars)
 * @property {none} value - The overriding value, stored as JSON so its type is preserved (required)
 */
const ZSystemConfigOverride = z.object( {
	key: z.string().max( 100, 'Key must be at most 100 characters' ),
	value: z.any(),
} );

export type SystemConfigOverride = z.infer<typeof ZSystemConfigOverride>;
export { ZSystemConfigOverride };

/**
 * Schema for SystemConfigGroup
 *
 * @property {str} id - Group identifier (required)
 * @property {str} label - Group label (required)
 * @property {none} fields - FormCreator fields of the group, with the current effective value as default (required)
 */
const ZSystemConfigGroup = z.object( {
	id: z.string(),
	label: z.string(),
	fields: z.any(),
} );

export type SystemConfigGroup = z.infer<typeof ZSystemConfigGroup>;
export { ZSystemConfigGroup };
