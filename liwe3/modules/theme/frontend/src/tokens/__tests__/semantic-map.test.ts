import { describe, expect, it } from 'vitest';
import { SEED_COLORS } from '../colors';
import type { SemanticTokenName } from '../colors';
import {
	TEXT_BEARING_BACKGROUNDS,
	type VariantSeeds,
	formatOklch,
	parseOklchLiteral,
	resolveSemanticOklch,
} from '../resolve';
import { checkContrast } from '../../generate/contrast';
import { contrastRatio } from '../../runtime/color';

const ROLES = [ 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error' ];
const VARIANTS = Object.keys( SEED_COLORS ) as (keyof typeof SEED_COLORS)[];

/** Resolves a token's lightness for a variant, failing loudly if it has none. */
const L = ( token : string, seeds : VariantSeeds ) : number => {
	const v = resolveSemanticOklch( token as SemanticTokenName, seeds );
	if ( !v ) throw new Error( `${token} has no solid value` );
	return v.l;
};

describe('semantic token derivation', () => {
	describe.each( VARIANTS )( 'variant %s', ( variant ) => {
		const seeds = SEED_COLORS[variant] as unknown as VariantSeeds;
		const surface = parseOklchLiteral( seeds.surface ).l;
		const text = parseOklchLiteral( seeds.text ).l;

		it.each( ROLES )( '%s-subtle sits near the surface, not near the text', ( role ) => {
			const l = L( `--liwe3-${role}-subtle`, seeds );
			// A "subtle" background is a tint of the surface. It must never drift to
			// the opposite end of the lightness axis, which is where the text lives.
			expect( Math.abs( l - surface ) ).toBeLessThan( Math.abs( l - text ) );
		} );

		it('muted, subtle and disabled text fade progressively toward the surface', () => {
			const muted = L( '--liwe3-text-muted', seeds );
			const subtle = L( '--liwe3-text-subtle', seeds );
			const disabled = L( '--liwe3-text-disabled', seeds );

			expect( Math.abs( muted - surface ) ).toBeLessThan( Math.abs( text - surface ) );
			expect( Math.abs( subtle - surface ) ).toBeLessThan( Math.abs( muted - surface ) );
			expect( Math.abs( disabled - surface ) ).toBeLessThan( Math.abs( subtle - surface ) );
		});

		it('border strength increases away from the surface', () => {
			const sub = L( '--liwe3-border-subtle', seeds );
			const base = L( '--liwe3-border', seeds );
			const strong = L( '--liwe3-border-strong', seeds );

			expect( Math.abs( sub - surface ) ).toBeLessThan( Math.abs( base - surface ) );
			expect( Math.abs( base - surface ) ).toBeLessThan( Math.abs( strong - surface ) );
		});

		it.each( TEXT_BEARING_BACKGROUNDS )( '%s carries --liwe3-text at 4.5:1 or better', ( bgToken ) => {
			const bg = resolveSemanticOklch( bgToken, seeds )!;
			const fg = resolveSemanticOklch( '--liwe3-text' as SemanticTokenName, seeds )!;
			expect( contrastRatio( formatOklch( fg ), formatOklch( bg ) ) ).toBeGreaterThanOrEqual( 4.5 );
		} );
	} );
});

describe('the build-time contrast guard actually fires', () => {
	// Sentinel for the regression this guard exists to catch: before the
	// color-mix change, the dark variant derived --liwe3-primary-subtle by adding
	// 0.30 to an already light seed, landing at oklch 1.0 behind light text.
	it('flags the pre-fix dark primary-subtle value', () => {
		const darkSeeds = SEED_COLORS.dark as unknown as VariantSeeds;
		const primary = parseOklchLiteral( darkSeeds.primary );
		const brokenSubtle = formatOklch( {
			l: Math.min( 1, primary.l + 0.30 ),
			c: primary.c * 0.4,
			h: primary.h,
		} );
		const text = formatOklch( parseOklchLiteral( darkSeeds.text ) );

		const warning = checkContrast( '--liwe3-text', text, '--liwe3-primary-subtle', brokenSubtle );
		expect( warning ).not.toBeNull();
		expect( warning!.ratio ).toBeLessThan( 4.5 );
	});

	it('stays silent on a pair that is comfortably legible', () => {
		expect( checkContrast( 'fg', 'oklch(0.15 0 0)', 'bg', 'oklch(0.98 0 0)' ) ).toBeNull();
	});
});
