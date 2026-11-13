/* Custom JavaScript for LiWE3 documentation */

document.addEventListener( 'DOMContentLoaded', function() {
	// Add custom functionality here if needed

	// Example: Log when documentation is loaded
	console.log( 'LiWE3 Documentation loaded' );

	// Example: Add copy button functionality enhancement
	const codeBlocks = document.querySelectorAll( 'pre code' );
	codeBlocks.forEach( ( block ) => {
		block.addEventListener( 'copy', ( e ) => {
			console.log( 'Code copied to clipboard' );
		} );
	} );
} );
