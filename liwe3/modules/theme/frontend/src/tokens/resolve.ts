/**
 * Build-time resolution of semantic tokens to concrete OKLCH values.
 *
 * The generated CSS defers this work to the browser via `oklch(from ...)` and
 * `color-mix()`. To validate contrast before shipping, we need the same result
 * in TypeScript, so this module mirrors those two operations. It is the single
 * source of truth for both the generator's contrast check and the unit tests.
 */

import { SEED_COLORS, SEMANTIC_MAP } from './colors';
import type { SemanticTokenName } from './colors';

export interface Oklch {
	l : number;
	c : number;
	h : number;
}

/** Seeds of a single variant, keyed by seed name. */
export type VariantSeeds = Record<string, string>;

/**
 * Parses an `oklch(l c h)` literal.
 *
 * @param value OKLCH literal as written in SEED_COLORS
 * @returns Its three components
 */
export const parseOklchLiteral = ( value : string ) : Oklch => {
	const m = value.match( /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/ );
	if ( !m ) throw new Error( `unparsable OKLCH literal: ${value}` );
	return { l: Number( m[1] ), c: Number( m[2] ), h: Number( m[3] ) };
};

/** Formats an OKLCH triple back into a CSS literal. */
export const formatOklch = ( v : Oklch ) : string => `oklch(${v.l.toFixed( 4 )} ${v.c.toFixed( 4 )} ${v.h.toFixed( 2 )})`;

const clamp01 = ( n : number ) : number => Math.min( 1, Math.max( 0, n ) );

/**
 * Interpolates two hues along the shortest arc, the way `color-mix(in oklch)` does.
 *
 * @param a First hue in degrees
 * @param b Second hue in degrees
 * @param weightA Weight of the first hue, 0..1
 * @returns The interpolated hue in degrees, normalised to 0..360
 */
const mixHue = ( a : number, b : number, weightA : number ) : number => {
	let delta = ( ( b - a ) % 360 + 540 ) % 360 - 180;
	return ( ( a + delta * ( 1 - weightA ) ) % 360 + 360 ) % 360;
};

/**
 * Resolves a semantic token to a concrete OKLCH value for one variant.
 *
 * @param tokenName Semantic token, e.g. `--liwe3-primary-subtle`
 * @param seeds The variant's seed colors
 * @returns The resolved color, or null for tokens with no single solid value
 *          (translucent overlays and the runtime auto-contrast text tokens)
 */
export const resolveSemanticOklch = ( tokenName : SemanticTokenName, seeds : VariantSeeds ) : Oklch | null => {
	const mapping = SEMANTIC_MAP[tokenName] as any;
	if ( !mapping ) return null;

	// Auto-contrast tokens are decided by the browser against the live background.
	if ( mapping.contrast ) return null;
	// Overlays are translucent: contrast depends on whatever sits underneath.
	if ( 'alpha' in mapping ) return null;

	const from = parseOklchLiteral( seeds[mapping.from] );

	if ( 'mix' in mapping ) {
		const toward = parseOklchLiteral( seeds[mapping.toward] );
		const w = mapping.mix;
		return {
			l: clamp01( from.l * w + toward.l * ( 1 - w ) ),
			c: from.c * w + toward.c * ( 1 - w ),
			h: mixHue( from.h, toward.h, w ),
		};
	}

	return {
		l: clamp01( from.l + mapping.lightness ),
		c: from.c * mapping.chroma,
		h: from.h,
	};
};

/**
 * Resolves a semantic token for a named variant.
 *
 * @param tokenName Semantic token name
 * @param variant Variant name as declared in SEED_COLORS
 * @returns The resolved color, or null when the token has no solid value
 */
export const resolveForVariant = (
	tokenName : SemanticTokenName,
	variant : keyof typeof SEED_COLORS,
) : Oklch | null => resolveSemanticOklch( tokenName, SEED_COLORS[variant] as unknown as VariantSeeds );

/**
 * Semantic tokens that are used as backgrounds behind `--liwe3-text`.
 *
 * The solid role colors are excluded: they pair with their own `text-on-*`
 * token, which is validated separately.
 */
export const TEXT_BEARING_BACKGROUNDS : SemanticTokenName[] = [
	'--liwe3-surface',
	'--liwe3-surface-sunken',
	'--liwe3-surface-raised',
	'--liwe3-surface-overlay',
	'--liwe3-primary-subtle',
	'--liwe3-secondary-subtle',
	'--liwe3-accent-subtle',
	'--liwe3-info-subtle',
	'--liwe3-success-subtle',
	'--liwe3-warning-subtle',
	'--liwe3-error-subtle',
] as SemanticTokenName[];
