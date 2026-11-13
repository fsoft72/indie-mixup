const _formatDatetime = ( date : Date, format : string ) => {
	const _padStart = ( value : number ) : string => value.toString().padStart( 2, '0' );
	return format.replace( /yyyy/g, _padStart( date.getFullYear() ) )
		.replace( /dd/g, _padStart( date.getDate() ) )
		.replace( /mm/g, _padStart( date.getMonth() + 1 ) )
		.replace( /HH/g, _padStart( date.getHours() ) )
		.replace( /MM/g, _padStart( date.getMinutes() ) )
		.replace( /SS/g, _padStart( date.getSeconds() ) );
};

/**
 * Checks if a given date is valid.
 * @param d - The date to be checked.
 * @returns A boolean indicating whether the date is valid or not.
 */
const isValidDate = ( d : Date ) : boolean => !isNaN( d.getTime() );

/**
 *  converts a date into a string with the desired format
 *
 *  yyyy - year
 *   mm  - month
 *   dd  - day
 *
 *   HH - hour
 *   MM - minutes
 *   SS - seconds
 */
export const date_format = ( date : any, format = 'yyyy-mm-dd HH:MM:SS' ) : string => {
	if ( date === undefined ) date = null;
	const datetime = new Date( date );

	return isValidDate( datetime ) ? _formatDatetime( datetime, format ) : '';
};

/**
 * Returns a date in international format 'YYYY-MM-DD'
 */
export const date_get = ( d : Date ) : string => {
	let year = d.getFullYear();
	let month : any = d.getMonth() + 1;
	let day = d.getDate();

	if ( month < 10 ) month = `0${month}`;
	return `${year}-${month}-${day}`;
};

/**
 * Parses time from various formats to seconds
 * Supports: numbers (as seconds), strings like "7d", "24h", "30m", "3600s"
 *
 * @param value - time value (number or string)
 * @returns time time in seconds, or default if invalid
 */
export const parseTime = ( value : any, defTime = 10800 ) : number => {
	// If it's already a valid number in seconds, return it
	if ( typeof value === 'number' && value > 0 && value <= 2592000 ) {
		return Math.floor( value );
	}

	// If it's a string, try to parse it
	if ( typeof value === 'string' ) {
		const trimmed = value.trim();

		// Prevent ReDoS: reject strings longer than the maximum valid format
		if ( trimmed.length > 20 ) {
			console.warn( `Invalid time value: ${value}, using default ${defTime} seconds` );
			return defTime;
		}

		// Match patterns like "7d", "24h", "30m", "3600s", "3600"
		const match = trimmed.match( /^(\d+(?:\.\d+)?)\s*([dhms])?$/i );

		if ( match ) {
			const num = parseFloat( match[1] );
			const unit = ( match[2] || 's' ).toLowerCase();

			let seconds : number;
			switch ( unit ) {
				case 'd': // days
					seconds = num * 86400;
					break;
				case 'h': // hours
					seconds = num * 3600;
					break;
				case 'm': // minutes
					seconds = num * 60;
					break;
				case 's': // seconds
				default:
					seconds = num;
					break;
			}

			// Validate result is within bounds (1 second to 30 days)
			if ( seconds > 0 && seconds <= 2592000 ) {
				return Math.floor( seconds );
			}
		}
	}

	// Invalid or out of bounds, return default
	console.warn( `Invalid time value: ${value}, using default ${defTime} seconds` );
	return defTime;
};
