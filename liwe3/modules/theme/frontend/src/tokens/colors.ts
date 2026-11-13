/**
 * Color token definitions for the LiWE3 theme system.
 *
 * Layer 1 (Seed): The few values a theme actually defines.
 * Layer 2 (Scale): Derived via CSS oklch(from ...) - curves defined here.
 * Layer 3 (Semantic): The public API components consume.
 */

/** Seed colors per variant - these are what the admin edits */
export const SEED_COLORS = {
	light: {
		primary: 'oklch(0.62 0.16 255)',
		secondary: 'oklch(0.59 0.07 236)',
		accent: 'oklch(0.52 0.08 232)',
		neutral: 'oklch(0.55 0.04 139)',
		info: 'oklch(0.60 0.10 250)',
		success: 'oklch(0.75 0.12 150)',
		warning: 'oklch(0.82 0.14 80)',
		error: 'oklch(0.65 0.18 25)',
		surface: 'oklch(0.98 0.004 271)',
		text: 'oklch(0.28 0.02 250)',
	},
	dark: {
		primary: 'oklch(0.72 0.14 255)',
		secondary: 'oklch(0.58 0.11 236)',
		accent: 'oklch(0.54 0.08 237)',
		neutral: 'oklch(0.75 0.02 130)',
		info: 'oklch(0.55 0.10 250)',
		success: 'oklch(0.60 0.10 150)',
		warning: 'oklch(0.67 0.10 80)',
		error: 'oklch(0.52 0.12 25)',
		surface: 'oklch(0.27 0.008 240)',
		text: 'oklch(0.92 0.015 110)',
	},
	'high-contrast': {
		primary: 'oklch(0.55 0.20 255)',
		secondary: 'oklch(0.50 0.10 236)',
		accent: 'oklch(0.45 0.12 232)',
		neutral: 'oklch(0.50 0.05 139)',
		info: 'oklch(0.50 0.15 250)',
		success: 'oklch(0.65 0.18 150)',
		warning: 'oklch(0.75 0.18 80)',
		error: 'oklch(0.55 0.22 25)',
		surface: 'oklch(1.0 0 0)',
		text: 'oklch(0.0 0 0)',
	},
} as const;

/** Lightness delta and chroma multiplier per scale step (relative to seed at 500) */
export const SCALE_CURVES = {
	50: { lightnessDelta: 0.35, chromaMultiplier: 0.3 },
	100: { lightnessDelta: 0.30, chromaMultiplier: 0.4 },
	200: { lightnessDelta: 0.25, chromaMultiplier: 0.6 },
	300: { lightnessDelta: 0.20, chromaMultiplier: 0.7 },
	400: { lightnessDelta: 0.10, chromaMultiplier: 0.85 },
	500: { lightnessDelta: 0.00, chromaMultiplier: 1.0 },
	600: { lightnessDelta: -0.10, chromaMultiplier: 1.1 },
	700: { lightnessDelta: -0.20, chromaMultiplier: 1.2 },
	800: { lightnessDelta: -0.30, chromaMultiplier: 1.1 },
	900: { lightnessDelta: -0.40, chromaMultiplier: 0.9 },
	950: { lightnessDelta: -0.45, chromaMultiplier: 0.7 },
} as const;

/** Semantic token mappings: which seed + adjustments for each semantic role */
export const SEMANTIC_MAP = {
	// Surfaces
	'--liwe3-surface': { from: 'surface', lightness: 0, chroma: 1 },
	'--liwe3-surface-sunken': { from: 'surface', lightness: -0.03, chroma: 1 },
	'--liwe3-surface-raised': { from: 'surface', lightness: 0.02, chroma: 1 },
	'--liwe3-surface-overlay': { from: 'surface', lightness: 0.04, chroma: 1 },

	// Text
	'--liwe3-text': { from: 'text', lightness: 0, chroma: 1 },
	'--liwe3-text-muted': { from: 'text', toward: 'surface', mix: 0.65 },
	'--liwe3-text-subtle': { from: 'text', toward: 'surface', mix: 0.50 },
	'--liwe3-text-disabled': { from: 'text', toward: 'surface', mix: 0.30 },

	// Text on colored surfaces (auto-contrast)
	'--liwe3-text-on-primary': { from: 'primary', contrast: true },
	'--liwe3-text-on-secondary': { from: 'secondary', contrast: true },
	'--liwe3-text-on-accent': { from: 'accent', contrast: true },
	'--liwe3-text-on-neutral': { from: 'neutral', contrast: true },
	'--liwe3-text-on-info': { from: 'info', contrast: true },
	'--liwe3-text-on-success': { from: 'success', contrast: true },
	'--liwe3-text-on-warning': { from: 'warning', contrast: true },
	'--liwe3-text-on-error': { from: 'error', contrast: true },

	// Borders
	'--liwe3-border-subtle': { from: 'neutral', toward: 'surface', mix: 0.30 },
	'--liwe3-border': { from: 'neutral', toward: 'surface', mix: 0.65 },
	'--liwe3-border-strong': { from: 'neutral', lightness: 0.00, chroma: 0.5 },

	// Color roles (hover/active states derived)
	'--liwe3-primary': { from: 'primary', lightness: 0, chroma: 1 },
	'--liwe3-primary-hover': { from: 'primary', lightness: -0.05, chroma: 1.05 },
	'--liwe3-primary-active': { from: 'primary', lightness: -0.10, chroma: 1.1 },
	'--liwe3-primary-subtle': { from: 'primary', toward: 'surface', mix: 0.15 },

	'--liwe3-secondary': { from: 'secondary', lightness: 0, chroma: 1 },
	'--liwe3-secondary-hover': { from: 'secondary', lightness: -0.05, chroma: 1.05 },
	'--liwe3-secondary-active': { from: 'secondary', lightness: -0.10, chroma: 1.1 },
	'--liwe3-secondary-subtle': { from: 'secondary', toward: 'surface', mix: 0.15 },

	'--liwe3-accent': { from: 'accent', lightness: 0, chroma: 1 },
	'--liwe3-accent-hover': { from: 'accent', lightness: -0.05, chroma: 1.05 },
	'--liwe3-accent-active': { from: 'accent', lightness: -0.10, chroma: 1.1 },
	'--liwe3-accent-subtle': { from: 'accent', toward: 'surface', mix: 0.15 },

	'--liwe3-info': { from: 'info', lightness: 0, chroma: 1 },
	'--liwe3-info-hover': { from: 'info', lightness: -0.05, chroma: 1.05 },
	'--liwe3-info-subtle': { from: 'info', toward: 'surface', mix: 0.15 },

	'--liwe3-success': { from: 'success', lightness: 0, chroma: 1 },
	'--liwe3-success-hover': { from: 'success', lightness: -0.05, chroma: 1.05 },
	'--liwe3-success-subtle': { from: 'success', toward: 'surface', mix: 0.15 },

	'--liwe3-warning': { from: 'warning', lightness: 0, chroma: 1 },
	'--liwe3-warning-hover': { from: 'warning', lightness: -0.05, chroma: 1.05 },
	'--liwe3-warning-subtle': { from: 'warning', toward: 'surface', mix: 0.15 },

	'--liwe3-error': { from: 'error', lightness: 0, chroma: 1 },
	'--liwe3-error-hover': { from: 'error', lightness: -0.05, chroma: 1.05 },
	'--liwe3-error-subtle': { from: 'error', toward: 'surface', mix: 0.15 },

	// State indicators
	'--liwe3-focus-ring': { from: 'primary', lightness: 0, chroma: 1 },
	'--liwe3-hover-overlay': { from: 'neutral', lightness: 0, chroma: 0, alpha: 0.05 },
	'--liwe3-active-overlay': { from: 'neutral', lightness: 0, chroma: 0, alpha: 0.10 },
	'--liwe3-scrim': { from: 'neutral', lightness: -0.40, chroma: 0, alpha: 0.5 },
} as const;

/** Contrast threshold for auto text color */
export const CONTRAST_THRESHOLD = 0.62;

export type SeedColorName = keyof typeof SEED_COLORS.light;
export type ScaleStep = keyof typeof SCALE_CURVES;
export type SemanticTokenName = keyof typeof SEMANTIC_MAP;
