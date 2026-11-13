import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
	generateBaseCss,
	generateComponentsCss,
	generateTokensCss,
	generateTypographyCss,
	generateUtilitiesCss,
} from './build-css';
import { generateTypes } from './build-types';

const __filename = fileURLToPath( import.meta.url );
const __dirname = dirname( __filename );

const DIST_DIR = join( __dirname, '..', '..', 'dist', 'theme' );
const STATIC_DIR = join( __dirname, '..', '..', '..', '..', '..', '..', 'playground', 'frontend', 'static', 'theme' );

function ensureDir( dir : string ) {
	if ( !existsSync( dir ) ) mkdirSync( dir, { recursive: true } );
}

function main() {
	ensureDir( DIST_DIR );

	console.log( 'Generating LiWE3 theme CSS...' );

	// Generate tokens.css
	const { css: tokensCss, warnings } = generateTokensCss();
	writeFileSync( join( DIST_DIR, 'tokens.css' ), tokensCss );

	const failures = warnings.filter( ( w ) => w.severity === 'error' );
	const notices = warnings.filter( ( w ) => w.severity !== 'error' );

	if ( notices.length > 0 ) {
		console.warn( '\nContrast notices (text-on-* resolves at runtime):' );
		for ( const w of notices ) {
			console.warn( `  ${w.token}: ratio ${w.ratio.toFixed( 2 )} (min ${w.minimum})` );
		}
	}

	if ( failures.length > 0 ) {
		console.error( '\nContrast FAILURES - a semantic background is illegible under --liwe3-text:' );
		for ( const w of failures ) {
			console.error( `  ${w.token}: ratio ${w.ratio.toFixed( 2 )} (min ${w.minimum})` );
		}
	}

	// Generate other parts
	writeFileSync( join( DIST_DIR, 'base.css' ), generateBaseCss() );
	writeFileSync( join( DIST_DIR, 'typography.css' ), generateTypographyCss() );
	writeFileSync( join( DIST_DIR, 'components.css' ), generateComponentsCss() );
	writeFileSync( join( DIST_DIR, 'utilities.css' ), generateUtilitiesCss() );

	// Generate types
	const typesContent = generateTypes();
	writeFileSync( join( DIST_DIR, '..', 'theme-types.d.ts' ), typesContent );

	// A broken theme must not reach the playground: report and stop. dist/ is
	// still written so the generated CSS can be inspected.
	if ( failures.length > 0 ) {
		console.error( `\n${failures.length} contrast failure(s). Theme not published to the playground.` );
		process.exit( 1 );
	}

	// Copy to static if playground exists
	if ( existsSync( STATIC_DIR ) ) {
		ensureDir( STATIC_DIR );
		copyFileSync( join( DIST_DIR, 'tokens.css' ), join( STATIC_DIR, 'tokens.css' ) );
		copyFileSync( join( DIST_DIR, 'base.css' ), join( STATIC_DIR, 'base.css' ) );
		copyFileSync( join( DIST_DIR, 'typography.css' ), join( STATIC_DIR, 'typography.css' ) );
		copyFileSync( join( DIST_DIR, 'components.css' ), join( STATIC_DIR, 'components.css' ) );
		copyFileSync( join( DIST_DIR, 'utilities.css' ), join( STATIC_DIR, 'utilities.css' ) );
		console.log( 'Copied to playground/static/theme/' );
	}

	console.log( `Generated ${5} CSS files in ${DIST_DIR}` );
	if ( notices.length > 0 ) {
		console.warn( `\n${notices.length} contrast notice(s) found.` );
		console.warn( '(Informational - text-on-* tokens use auto-contrast at runtime)' );
	}
}

main();
