import { SCALE_CURVES, SEED_COLORS, SEMANTIC_MAP } from '../tokens';
import { SPACE_TOKENS } from '../tokens/space';
import { TYPOGRAPHY_TOKENS } from '../tokens/typography';
import { MOTION_TOKENS } from '../tokens/motion';

/**
 * Generate TypeScript type declarations for all token names.
 */
export function generateTypes() : string {
	const lines : string[] = [];

	// Seed color names
	lines.push( `export type SeedColorName = ${Object.keys( SEED_COLORS.light ).map( ( k ) => `'${k}'` ).join( ' | ' )};` );
	lines.push( '' );

	// Scale steps
	lines.push( `export type ScaleStep = ${Object.keys( SCALE_CURVES ).join( ' | ' )};` );
	lines.push( '' );

	// All CSS variable names
	const allVars : string[] = [];

	// Seed vars
	for ( const name of Object.keys( SEED_COLORS.light ) ) {
		allVars.push( `'--liwe3-seed-${name}'` );
	}

	// Scale vars
	for ( const name of Object.keys( SEED_COLORS.light ) ) {
		for ( const step of Object.keys( SCALE_CURVES ) ) {
			allVars.push( `'--liwe3-${name}-${step}'` );
		}
	}

	// Semantic vars
	for ( const name of Object.keys( SEMANTIC_MAP ) ) {
		allVars.push( `'${name}'` );
	}

	// Space vars
	for ( const name of Object.keys( SPACE_TOKENS ) ) {
		allVars.push( `'${name}'` );
	}

	// Typography vars
	for ( const name of Object.keys( TYPOGRAPHY_TOKENS ) ) {
		allVars.push( `'${name}'` );
	}

	// Motion vars
	for ( const name of Object.keys( MOTION_TOKENS ) ) {
		allVars.push( `'${name}'` );
	}

	lines.push( `export type CSSVariableName =` );
	lines.push( allVars.join( '\n\t| ' ) );
	lines.push( '\t;' );

	return lines.join( '\n' );
}
