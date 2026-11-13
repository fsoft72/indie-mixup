#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const distTypesJs = path.join( process.cwd(), 'dist', 'types.js' );

if ( fs.existsSync( distTypesJs ) ) {
	let content = fs.readFileSync( distTypesJs, 'utf8' );

	// Check if UserSchema export is missing
	if ( !content.includes( 'export type UserSchema' ) && !content.includes( 'export { userSchema as UserSchema }' ) ) {
		// Add the missing export
		content += '\nexport { userSchema as UserSchema };\n';
		fs.writeFileSync( distTypesJs, content );
		console.log( '✅ Fixed missing UserSchema export in types.js' );
	} else {
		console.log( '✅ UserSchema export already present in types.js' );
	}
} else {
	console.log( '❌ dist/types.js not found' );
	process.exit( 1 );
}
