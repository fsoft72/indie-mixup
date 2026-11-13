export const TYPOGRAPHY_TOKENS = {
	// Font families
	'--liwe3-font-sans': 'Inter, system-ui, -apple-system, sans-serif',
	'--liwe3-font-serif': 'Georgia, Cambria, serif',
	'--liwe3-font-mono': 'JetBrains Mono, Fira Code, monospace',

	// Size scale (derived from base + ratio)
	'--liwe3-font-size-base': '16px',
	'--liwe3-type-ratio': '1.25',
	'--liwe3-text-xs': 'calc(var(--liwe3-font-size-base) / var(--liwe3-type-ratio) / var(--liwe3-type-ratio))',
	'--liwe3-text-sm': 'calc(var(--liwe3-font-size-base) / var(--liwe3-type-ratio))',
	'--liwe3-text-base': 'var(--liwe3-font-size-base)',
	'--liwe3-text-lg': 'calc(var(--liwe3-font-size-base) * var(--liwe3-type-ratio))',
	'--liwe3-text-xl': 'calc(var(--liwe3-font-size-base) * var(--liwe3-type-ratio) * var(--liwe3-type-ratio))',
	'--liwe3-text-2xl': 'calc(var(--liwe3-font-size-base) * var(--liwe3-type-ratio) * var(--liwe3-type-ratio) * var(--liwe3-type-ratio))',
	'--liwe3-text-3xl': 'calc(var(--liwe3-font-size-base) * pow(var(--liwe3-type-ratio), 4))',
	'--liwe3-text-4xl': 'calc(var(--liwe3-font-size-base) * pow(var(--liwe3-type-ratio), 5))',

	// Line heights
	'--liwe3-leading-none': '1',
	'--liwe3-leading-tight': '1.25',
	'--liwe3-leading-snug': '1.375',
	'--liwe3-leading-normal': '1.5',
	'--liwe3-leading-relaxed': '1.625',
	'--liwe3-leading-loose': '2',

	// Font weights
	'--liwe3-weight-light': '300',
	'--liwe3-weight-normal': '400',
	'--liwe3-weight-medium': '500',
	'--liwe3-weight-semibold': '600',
	'--liwe3-weight-bold': '700',
} as const;
