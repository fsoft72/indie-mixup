import type { Theme } from './schema';

/**
 * Generate instance.css from a theme's seed tokens.
 * This file is small (few KB) and gets served with ETag caching.
 */
export function generateInstanceCss( theme : Theme ) : string {
	const tokens = JSON.parse( theme.tokens );
	const lines : string[] = [];

	lines.push( `/* LiWE3 Instance Theme: ${theme.name} */` );

	for ( const [ variant, seeds ] of Object.entries( tokens ) ) {
		if ( typeof seeds !== 'object' || seeds === null ) continue;
		lines.push( `[data-theme="${variant}"] {` );
		for ( const [ name, value ] of Object.entries( seeds as Record<string, string> ) ) {
			lines.push( `\t--liwe3-seed-${name}: ${value};` );
		}
		lines.push( '}' );
	}

	return lines.join( '\n' );
}
