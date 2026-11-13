import { z } from 'zod';

// Copied from liwe3/frontend/core/src/utils/zod.ts:82-89
export const zodBoolean = z.preprocess( ( val ) => {
	if ( typeof val === 'string' ) {
		const lowerVal = val.toLowerCase();
		if ( lowerVal === 'true' || lowerVal === '1' ) return true;
		if ( lowerVal === 'false' || lowerVal === '0' ) return false;
	}
	return val;
}, z.boolean() );
