#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const distTypesJs = path.join( __dirname, 'dist', 'types.js' );

const fixFile = () => {
	if ( fs.existsSync( distTypesJs ) ) {
		let content = fs.readFileSync( distTypesJs, 'utf8' );

		// Check if UserSchema export is missing
		if ( !content.includes( 'export type UserSchema' ) && !content.includes( 'export { userSchema as UserSchema }' ) ) {
			// Add the missing export
			content += '\nexport { userSchema as UserSchema };\n';
			fs.writeFileSync( distTypesJs, content );
			console.log( '✅ Fixed missing UserSchema export in types.js' );
			return true;
		}
	}
	return false;
};

// Run once initially
fixFile();

// Watch for changes to the dist directory
if ( fs.existsSync( path.join( __dirname, 'dist' ) ) ) {
	const distDir = path.join( __dirname, 'dist' );
	console.log( '👀 Watching for changes to dist/types.js...' );

	fs.watch( distDir, ( eventType, filename ) => {
		if ( filename === 'types.js' && eventType === 'change' ) {
			// Small delay to ensure file is fully written
			setTimeout( () => {
				fixFile();
			}, 100 );
		}
	} );
}
