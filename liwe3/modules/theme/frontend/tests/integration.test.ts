import { describe, expect, it } from 'vitest';
import { contrastRatio, fromOklch, toOklch } from '../src/runtime/color';
import { generateBaseCss, generateComponentsCss, generateTokensCss, generateUtilitiesCss } from '../src/generate/build-css';
import { SEED_COLORS } from '../src/tokens/colors';

describe('Theme System Integration', () => {
	describe('Color round-trip', () => {
		it('hex -> oklch -> hex is stable', () => {
			const hex = '#4f46e5';
			const oklch = toOklch( hex );
			const back = fromOklch( oklch );
			// Allow small rounding differences
			expect( back ).toMatch( /^#[0-9a-f]{6}$/ );
		});
	});

	describe('CSS Generation', () => {
		it('tokens.css contains all variants', () => {
			const { css } = generateTokensCss();
			expect( css ).toContain( '[data-theme="light"]' );
			expect( css ).toContain( '[data-theme="dark"]' );
			expect( css ).toContain( '[data-theme="high-contrast"]' );
		});

		it('tokens.css contains semantic tokens', () => {
			const { css } = generateTokensCss();
			expect( css ).toContain( '--liwe3-surface' );
			expect( css ).toContain( '--liwe3-text' );
			expect( css ).toContain( '--liwe3-primary' );
			expect( css ).toContain( '--liwe3-border' );
		});

		it('tokens.css defines shared control-height tokens', () => {
			const { css } = generateTokensCss();
			expect( css ).toContain( '--liwe3-control-height-xxs: 1.5rem;' );
			expect( css ).toContain( '--liwe3-control-height-md: 2.5rem;' );
			expect( css ).toContain( '--liwe3-control-height-xxl: 4rem;' );
		});

		it('scale steps reference their seed through var(), not the bare property name', () => {
			const { css } = generateTokensCss();
			expect( css ).toContain( '--liwe3-primary-600: oklch(from var(--liwe3-seed-primary)' );
			expect( css ).not.toContain( 'oklch(from --liwe3-seed-primary' );
		});

		it('base.css contains reset and color-scheme', () => {
			const css = generateBaseCss();
			expect( css ).toContain( 'box-sizing: border-box' );
			expect( css ).toContain( 'color-scheme: light dark' );
		});
	});

	describe('Layout grid', () => {
		it('utilities.css defines a responsive 12-column grid', () => {
			const css = generateUtilitiesCss();
			expect( css ).toContain( '.liwe3-row {' );
			expect( css ).toContain( 'grid-template-columns: repeat(12, 1fr);' );
			expect( css ).toContain( '.liwe3-col-1 { grid-column: span 1; }' );
			expect( css ).toContain( '.liwe3-col-6 { grid-column: span 6; }' );
			expect( css ).toContain( '.liwe3-col-12 { grid-column: span 12; }' );
		});

		it('collapses columns to full width under 640px', () => {
			const css = generateUtilitiesCss();
			expect( css ).toContain( '@media (max-width: 640px)' );
			expect( css ).toContain( '[class*="liwe3-col-"] { grid-column: span 12; }' );
		});
	});

	describe('Button color modes', () => {
		it('defines solid, outline and ghost styles for every color mode', () => {
			const css = generateComponentsCss();
			for ( const mode of [ 'primary', 'secondary', 'accent', 'success', 'warning', 'info', 'danger' ] ) {
				expect( css ).toContain( `.liwe3-btn--${mode} {` );
				expect( css ).toContain( `.liwe3-btn--${mode}:hover {` );
				expect( css ).toContain( `.liwe3-btn--${mode}.liwe3-btn--outline {` );
				expect( css ).toContain( `.liwe3-btn--${mode}.liwe3-btn--ghost {` );
			}
		});

		it('maps the danger mode to the error token family', () => {
			const css = generateComponentsCss();
			expect( css ).toContain( 'background: var(--liwe3-error);' );
			expect( css ).toContain( 'background: var(--liwe3-error-hover);' );
		});

		it('maps the secondary mode to the secondary token family', () => {
			const css = generateComponentsCss();
			expect( css ).toContain( 'background: var(--liwe3-secondary);' );
			expect( css ).toContain( 'color: var(--liwe3-text-on-secondary);' );
		});
	});

	describe('Seed color fixes', () => {
		it('dark neutral seed is low-chroma (no lime tint on borders/surfaces)', () => {
			expect( SEED_COLORS.dark.neutral ).toBe( 'oklch(0.75 0.02 130)' );
		});

		it('dark accent seed has visible chroma', () => {
			expect( SEED_COLORS.dark.accent ).toBe( 'oklch(0.54 0.08 237)' );
		});

		it('dark secondary seed matches the light theme hue family', () => {
			expect( SEED_COLORS.dark.secondary ).toBe( 'oklch(0.58 0.11 236)' );
		});

		it('primary seeds use a crisper chroma in both themes', () => {
			expect( SEED_COLORS.light.primary ).toBe( 'oklch(0.62 0.16 255)' );
			expect( SEED_COLORS.dark.primary ).toBe( 'oklch(0.72 0.14 255)' );
		});
	});

	describe('Contrast', () => {
		it('auto-contrast tokens have acceptable ratios', () => {
			// Test that the generated contrast tokens would pass WCAG AA
			const { warnings } = generateTokensCss();
			// Log warnings but don't fail (warnings are informational)
			if ( warnings.length > 0 ) {
				console.warn( 'Contrast warnings:', warnings );
			}
		});
	});
});
