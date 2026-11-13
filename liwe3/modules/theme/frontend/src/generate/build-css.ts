import { CONTRAST_THRESHOLD, SCALE_CURVES, SEED_COLORS, SEMANTIC_MAP } from '../tokens/colors';
import { SPACE_TOKENS } from '../tokens/space';
import { TYPOGRAPHY_TOKENS } from '../tokens/typography';
import { MOTION_TOKENS } from '../tokens/motion';
import { THEMES } from '../tokens/themes';
import type { ThemeName } from '../tokens/themes';
import type { SeedColorName, SemanticTokenName } from '../tokens/colors';
import { type ContrastWarning, checkContrast } from './contrast';
import {
	TEXT_BEARING_BACKGROUNDS,
	type VariantSeeds,
	formatOklch,
	resolveSemanticOklch,
} from '../tokens/resolve';

const LAYER_DECLARATION = '@layer liwe3.reset, liwe3.tokens, liwe3.base, liwe3.components, liwe3.utilities;';

/**
 * Generate scale variables (50-950) for a given seed color.
 */
function generateScale( varPrefix : string, seedVar : string ) : string {
	const lines : string[] = [];
	for ( const [ step, curve ] of Object.entries( SCALE_CURVES ) ) {
		lines.push(
			`\t${varPrefix}-${step}: oklch(from var(${seedVar}) calc(l + ${curve.lightnessDelta}) calc(c * ${curve.chromaMultiplier}) h);`,
		);
	}
	return lines.join( '\n' );
}

/**
 * Generate all scale CSS for a variant.
 */
function generateVariantScales( variant : ThemeName, seeds : Record<string, string> ) : string {
	const lines : string[] = [];
	const prefix = `[data-theme="${variant}"]`;

	lines.push( `${prefix} {` );
	for ( const seedName of Object.keys( seeds ) ) {
		const seedVar = `--liwe3-seed-${seedName}`;
		lines.push( generateScale( `--liwe3-${seedName}`, seedVar ) );
	}
	lines.push( '}' );
	return lines.join( '\n' );
}

/**
 * Generate semantic tokens CSS.
 */
function generateSemanticTokens() : string {
	const lines : string[] = [];
	lines.push( '[data-theme] {' );

	for ( const [ tokenName, mapping ] of Object.entries( SEMANTIC_MAP ) ) {
		const seedVar = `--liwe3-seed-${mapping.from}`;
		if ( 'contrast' in mapping && mapping.contrast ) {
			// Auto-contrast text: uses clamp to pick light/dark
			lines.push(
				`\t${tokenName}: oklch(from var(${seedVar}) clamp(0, (${CONTRAST_THRESHOLD} - l) * 1000, 1) 0 h);`,
			);
		} else if ( 'mix' in mapping ) {
			// Blend toward another seed instead of applying an absolute lightness
			// delta. A fixed delta assumes a light variant: on a dark one it pushes
			// the token past the surface and into the text's end of the scale.
			const towardVar = `--liwe3-seed-${( mapping as any ).toward}`;
			const pct = Math.round( ( mapping as any ).mix * 100 );
			lines.push(
				`\t${tokenName}: color-mix(in oklch, var(${seedVar}) ${pct}%, var(${towardVar}));`,
			);
		} else if ( 'alpha' in mapping ) {
			lines.push(
				`\t${tokenName}: oklch(from var(${seedVar}) calc(l + ${( mapping as any ).lightness}) calc(c * ${( mapping as any ).chroma}) h / ${( mapping as any ).alpha});`,
			);
		} else {
			lines.push(
				`\t${tokenName}: oklch(from var(${seedVar}) calc(l + ${( mapping as any ).lightness}) calc(c * ${( mapping as any ).chroma}) h);`,
			);
		}
	}

	lines.push( '}' );
	return lines.join( '\n' );
}

/**
 * Generate the complete tokens.css file.
 */
export function generateTokensCss() : { css : string; warnings : ContrastWarning[] } {
	const warnings : ContrastWarning[] = [];
	const parts : string[] = [];

	parts.push( `/* LiWE3 Theme Tokens - Generated */` );
	parts.push( LAYER_DECLARATION );
	parts.push( '' );

	// Seed variables per variant
	for ( const [ themeName, themeDef ] of Object.entries( THEMES ) ) {
		const selector = `[data-theme="${themeName}"]`;
		parts.push( `${selector} {` );
		for ( const [ seedName, seedValue ] of Object.entries( themeDef.seeds ) ) {
			parts.push( `\t--liwe3-seed-${seedName}: ${seedValue};` );
		}
		parts.push( '}' );
		parts.push( '' );
	}

	// Scale variables
	for ( const [ themeName, themeDef ] of Object.entries( THEMES ) ) {
		parts.push( generateVariantScales( themeName as ThemeName, themeDef.seeds ) );
		parts.push( '' );
	}

	// Semantic tokens
	parts.push( generateSemanticTokens() );
	parts.push( '' );

	// Non-color tokens
	parts.push( '[data-theme] {' );
	for ( const [ name, value ] of Object.entries( SPACE_TOKENS ) ) {
		parts.push( `\t${name}: ${value};` );
	}
	for ( const [ name, value ] of Object.entries( TYPOGRAPHY_TOKENS ) ) {
		parts.push( `\t${name}: ${value};` );
	}
	for ( const [ name, value ] of Object.entries( MOTION_TOKENS ) ) {
		parts.push( `\t${name}: ${value};` );
	}
	parts.push( '}' );

	// Contrast warnings - check text-on-* against their respective colored backgrounds
	for ( const themeDef of Object.values( THEMES ) ) {
		for ( const [ tokenName, mapping ] of Object.entries( SEMANTIC_MAP ) ) {
			if ( 'contrast' in mapping && mapping.contrast ) {
				const bgColor = themeDef.seeds[mapping.from as SeedColorName];
				const textColor = themeDef.seeds.text;
				if ( bgColor && textColor ) {
					// Check text color against colored background
					const warning = checkContrast( '--liwe3-text', textColor, tokenName.replace( 'text-on-', '' ), bgColor, 4.5, 'info' );
					if ( warning ) warnings.push( warning );
				}
			}
		}
	}

	// Contrast warnings - every semantic background that carries --liwe3-text.
	// The text-on-* loop above only covers the solid role colors, which is how a
	// dark variant once shipped with near-white *-subtle backgrounds unnoticed.
	for ( const [ variantName, themeDef ] of Object.entries( THEMES ) ) {
		const seeds = themeDef.seeds as unknown as VariantSeeds;
		if ( !seeds.text ) continue;

		for ( const bgToken of TEXT_BEARING_BACKGROUNDS ) {
			const bg = resolveSemanticOklch( bgToken, seeds );
			const text = resolveSemanticOklch( '--liwe3-text' as SemanticTokenName, seeds );
			if ( !bg || !text ) continue;

			const warning = checkContrast(
				'--liwe3-text',
				formatOklch( text ),
				`${bgToken} [${variantName}]`,
				formatOklch( bg ),
			);
			if ( warning ) warnings.push( warning );
		}
	}

	return { css: parts.join( '\n' ), warnings };
}

/**
 * Generate base.css (reset, color-scheme, box-sizing).
 */
export function generateBaseCss() : string {
	return `/* LiWE3 Base Styles - Generated */
@layer liwe3.reset {
	*, *::before, *::after {
		box-sizing: border-box;
	}
}

@layer liwe3.base {
	:root {
		color-scheme: light dark;
		background-color: var(--liwe3-surface);
	}

	@media (prefers-reduced-motion: reduce) {
		[data-theme] {
			--liwe3-duration-fast: 0ms;
			--liwe3-duration-base: 0ms;
			--liwe3-duration-slow: 0ms;
		}
	}

	:focus-visible {
		outline: 2px solid var(--liwe3-focus-ring);
		outline-offset: 2px;
	}
}`;
}

const BUTTON_COLOR_MODES : [ string, string ][] = [
	[ 'primary', 'primary' ],
	[ 'secondary', 'secondary' ],
	[ 'accent', 'accent' ],
	[ 'success', 'success' ],
	[ 'warning', 'warning' ],
	[ 'info', 'info' ],
	[ 'danger', 'error' ],
];

/**
 * Generate solid, outline and ghost CSS for every button color mode.
 */
function generateButtonModeCss() : string {
	const lines : string[] = [];

	for ( const [ mode, token ] of BUTTON_COLOR_MODES ) {
		lines.push( `
	.liwe3-btn--${mode} {
		background: var(--liwe3-${token});
		color: var(--liwe3-text-on-${token});
		border-color: var(--liwe3-${token});
	}

	.liwe3-btn--${mode}:hover {
		background: var(--liwe3-${token}-hover);
		border-color: var(--liwe3-${token}-hover);
	}

	.liwe3-btn--${mode}.liwe3-btn--outline {
		background: transparent;
		color: var(--liwe3-${token});
		border-color: var(--liwe3-${token});
	}

	.liwe3-btn--${mode}.liwe3-btn--outline:hover {
		background: var(--liwe3-${token}-subtle);
	}

	.liwe3-btn--${mode}.liwe3-btn--ghost {
		background: transparent;
		border-color: transparent;
		color: var(--liwe3-${token});
	}

	.liwe3-btn--${mode}.liwe3-btn--ghost:hover {
		background: var(--liwe3-${token}-subtle);
	}` );
	}

	return lines.join( '\n' );
}

/**
 * Generate components.css (opt-in classes).
 */
export function generateComponentsCss() : string {
	return `/* LiWE3 Components - Generated */
@layer liwe3.components {
	.liwe3-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--liwe3-space-2);
		padding: var(--liwe3-space-2) var(--liwe3-space-4);
		border: 1px solid var(--liwe3-border);
		border-radius: var(--liwe3-radius-md);
		background: var(--liwe3-surface);
		color: var(--liwe3-text);
		font-family: var(--liwe3-font-sans);
		font-size: var(--liwe3-text-sm);
		font-weight: var(--liwe3-weight-medium);
		line-height: var(--liwe3-leading-normal);
		cursor: pointer;
		transition: all var(--liwe3-duration-fast) var(--liwe3-ease-out);
	}

	.liwe3-btn:hover {
		background: var(--liwe3-surface-raised);
		border-color: var(--liwe3-border-strong);
	}

	.liwe3-btn--ghost {
		background: transparent;
		border-color: transparent;
	}

	.liwe3-btn--ghost:hover {
		background: var(--liwe3-hover-overlay);
	}
${generateButtonModeCss()}

	.liwe3-input, .liwe3-select, .liwe3-textarea {
		padding: var(--liwe3-space-2) var(--liwe3-space-3);
		border: 1px solid var(--liwe3-border);
		border-radius: var(--liwe3-radius-md);
		background: var(--liwe3-surface);
		color: var(--liwe3-text);
		font-family: var(--liwe3-font-sans);
		font-size: var(--liwe3-text-sm);
		line-height: var(--liwe3-leading-normal);
		transition: border-color var(--liwe3-duration-fast) var(--liwe3-ease-out);
	}

	.liwe3-input:focus, .liwe3-select:focus, .liwe3-textarea:focus {
		border-color: var(--liwe3-primary);
		outline: none;
		box-shadow: 0 0 0 2px oklch(from var(--liwe3-primary) l c h / 0.2);
	}

	.liwe3-card {
		background: var(--liwe3-surface-raised);
		border: 1px solid var(--liwe3-border-subtle);
		border-radius: var(--liwe3-radius-lg);
		padding: var(--liwe3-space-6);
	}

	.liwe3-alert--info { background: var(--liwe3-info-subtle); color: var(--liwe3-text); border: 1px solid var(--liwe3-info); }
	.liwe3-alert--success { background: var(--liwe3-success-subtle); color: var(--liwe3-text); border: 1px solid var(--liwe3-success); }
	.liwe3-alert--warning { background: var(--liwe3-warning-subtle); color: var(--liwe3-text); border: 1px solid var(--liwe3-warning); }
	.liwe3-alert--error { background: var(--liwe3-error-subtle); color: var(--liwe3-text); border: 1px solid var(--liwe3-error); }
}`;
}

/**
 * Generate typography.css (base typography styles for text elements).
 */
export function generateTypographyCss() : string {
	return `/* LiWE3 Typography - Generated */
@layer liwe3.base {
	body {
		margin: 0;
		padding: 0;
		font-family: var(--liwe3-font-sans);
		font-size: var(--liwe3-text-base);
		line-height: var(--liwe3-leading-normal);
		background-color: var(--liwe3-surface);
		color: var(--liwe3-text);
	}

	h1, h2, h3, h4, h5, h6 {
		color: var(--liwe3-text);
		font-weight: var(--liwe3-weight-semibold);
		line-height: var(--liwe3-leading-tight);
	}

	h1 { font-size: var(--liwe3-text-3xl); }
	h2 { font-size: var(--liwe3-text-2xl); }
	h3 { font-size: var(--liwe3-text-xl); }
	h4 { font-size: var(--liwe3-text-lg); }
	h5 { font-size: var(--liwe3-text-base); font-weight: var(--liwe3-weight-medium); }
	h6 { font-size: var(--liwe3-text-sm); font-weight: var(--liwe3-weight-medium); }

	p {
		color: var(--liwe3-text-muted);
		line-height: var(--liwe3-leading-relaxed);
		margin: 0 0 var(--liwe3-space-4);
	}

	a {
		color: var(--liwe3-primary);
		text-decoration: none;
		transition: color var(--liwe3-duration-fast) var(--liwe3-ease-out);
	}

	a:hover {
		color: var(--liwe3-primary-hover);
		text-decoration: underline;
	}

	small {
		font-size: var(--liwe3-text-sm);
	}

	code {
		font-family: var(--liwe3-font-mono);
		font-size: 0.9em;
		background: var(--liwe3-surface-sunken);
		padding: var(--liwe3-space-1) var(--liwe3-space-2);
		border-radius: var(--liwe3-radius-sm);
	}

	pre {
		font-family: var(--liwe3-font-mono);
		font-size: var(--liwe3-text-sm);
		background: var(--liwe3-surface-sunken);
		padding: var(--liwe3-space-4);
		border-radius: var(--liwe3-radius-md);
		overflow-x: auto;
	}

	pre code {
		background: none;
		padding: 0;
	}

	blockquote {
		border-left: 4px solid var(--liwe3-primary);
		margin: 0 0 var(--liwe3-space-4);
		padding: var(--liwe3-space-2) var(--liwe3-space-4);
		color: var(--liwe3-text-muted);
		font-style: italic;
	}
}`;
}
/**
 * Generate the .liwe3-col-1..12 CSS Grid column classes.
 */
function generateGridColumnsCss() : string {
	const lines : string[] = [];
	for ( let col = 1; col <= 12; col++ ) {
		lines.push( `\t.liwe3-col-${col} { grid-column: span ${col}; }` );
	}
	return lines.join( '\n' );
}

export function generateUtilitiesCss() : string {
	return `/* LiWE3 Utilities - Generated */
@layer liwe3.utilities {
	.liwe3-surface { background: var(--liwe3-surface); color: var(--liwe3-text); }
	.liwe3-surface-sunken { background: var(--liwe3-surface-sunken); color: var(--liwe3-text); }
	.liwe3-surface-raised { background: var(--liwe3-surface-raised); color: var(--liwe3-text); }

	.liwe3-stack { display: flex; flex-direction: column; gap: var(--liwe3-space-4); }
	.liwe3-stack--sm { gap: var(--liwe3-space-2); }
	.liwe3-stack--lg { gap: var(--liwe3-space-8); }

	.liwe3-inline { display: flex; flex-direction: row; gap: var(--liwe3-space-4); align-items: center; }

	.liwe3-row { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--liwe3-space-4); width: 100%; }
${generateGridColumnsCss()}

	@media (max-width: 640px) {
		[class*="liwe3-col-"] { grid-column: span 12; }
	}
}`;
}
