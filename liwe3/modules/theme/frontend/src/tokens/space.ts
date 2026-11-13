export const SPACE_TOKENS = {
	'--liwe3-space-unit': '4px',
	'--liwe3-space-0': '0',
	'--liwe3-space-1': 'calc(var(--liwe3-space-unit) * var(--liwe3-density-scale))',
	'--liwe3-space-2': 'calc(var(--liwe3-space-unit) * 2 * var(--liwe3-density-scale))',
	'--liwe3-space-3': 'calc(var(--liwe3-space-unit) * 3 * var(--liwe3-density-scale))',
	'--liwe3-space-4': 'calc(var(--liwe3-space-unit) * 4 * var(--liwe3-density-scale))',
	'--liwe3-space-5': 'calc(var(--liwe3-space-unit) * 5 * var(--liwe3-density-scale))',
	'--liwe3-space-6': 'calc(var(--liwe3-space-unit) * 6 * var(--liwe3-density-scale))',
	'--liwe3-space-8': 'calc(var(--liwe3-space-unit) * 8 * var(--liwe3-density-scale))',
	'--liwe3-space-10': 'calc(var(--liwe3-space-unit) * 10 * var(--liwe3-density-scale))',
	'--liwe3-space-12': 'calc(var(--liwe3-space-unit) * 12 * var(--liwe3-density-scale))',
	'--liwe3-space-16': 'calc(var(--liwe3-space-unit) * 16 * var(--liwe3-density-scale))',

	// Density
	'--liwe3-density-scale': '1',

	// Radius
	'--liwe3-radius-base': '6px',
	'--liwe3-radius-none': '0',
	'--liwe3-radius-sm': 'calc(var(--liwe3-radius-base) * 0.5)',
	'--liwe3-radius-md': 'var(--liwe3-radius-base)',
	'--liwe3-radius-lg': 'calc(var(--liwe3-radius-base) * 1.5)',
	'--liwe3-radius-xl': 'calc(var(--liwe3-radius-base) * 2)',
	'--liwe3-radius-full': '9999px',

	// Control height (shared min-height for Button/Input/Select/Checkbox so they align in a row)
	'--liwe3-control-height-xxs': '1.5rem',
	'--liwe3-control-height-xs': '1.75rem',
	'--liwe3-control-height-sm': '2rem',
	'--liwe3-control-height-md': '2.5rem',
	'--liwe3-control-height-lg': '3rem',
	'--liwe3-control-height-xl': '3.5rem',
	'--liwe3-control-height-xxl': '4rem',

	// Shadows (color derived from neutral in CSS)
	'--liwe3-shadow-color': 'oklch(from var(--liwe3-neutral) l c h / 0.15)',
	'--liwe3-shadow-sm': '0 1px 2px var(--liwe3-shadow-color)',
	'--liwe3-shadow-md': '0 4px 6px -1px var(--liwe3-shadow-color)',
	'--liwe3-shadow-lg': '0 10px 15px -3px var(--liwe3-shadow-color)',
	'--liwe3-shadow-xl': '0 20px 25px -5px var(--liwe3-shadow-color)',

	// Z-index
	'--liwe3-z-dropdown': '1000',
	'--liwe3-z-sticky': '1020',
	'--liwe3-z-overlay': '1040',
	'--liwe3-z-modal': '1060',
	'--liwe3-z-toast': '1080',
} as const;
