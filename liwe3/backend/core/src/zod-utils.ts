import { z } from 'zod';

// Define the reusable boolean processor
export const zodBoolean = z.preprocess( ( val ) => {
	if ( val === null ) return null;

	if ( typeof val === 'string' ) {
		const lowerVal = val.toLowerCase();
		if ( lowerVal === 'true' || lowerVal === '1' ) return true;
		if ( lowerVal === 'false' || lowerVal === '0' ) return false;
	}
	return val;
}, z.boolean().nullable() );

/*
const mySchema = z.object({
  enabled: zodBoolean.default(false),
});
*/
