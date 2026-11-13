/**
 * ESLint rule to prevent hardcoded hex colors in component styles.
 * Encourages use of CSS variables (--liwe3-*) for theming.
 */
module.exports = {
	rules: {
		'no-restricted-syntax': [
			'warn',
			{
				selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
				message: 'Use CSS variables (--liwe3-*) instead of hardcoded hex colors in component styles.',
			},
		],
	},
};
