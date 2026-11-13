/**
 * Helpers for the "password max age (days)" value of a user.
 *
 * The API distinguishes three cases, and the difference matters:
 * - a number (0 included): 0 = the password never expires, N = expires after N days
 * - NO `days` key: clears the value, the global default applies
 * The generated schema turns `null` into 0 (never expires), so a "no value" must be
 * a missing key, never `null` and never an empty string.
 */

/** Same upper bound as the backend (user_set_password_max_age) */
export const PASSWORD_MAX_AGE_MAX_DAYS = 3650;

export type MaxAgeDaysParsed = { ok : true; days : number | undefined } | { ok : false; error : string };

/**
 * Reads the value of the form field. An empty field is "no value" (undefined).
 *
 * @param raw - The field value: a string from the input, or a number
 * @returns `days` undefined when the field is empty, the number otherwise; `ok: false` with a message when it is not valid
 */
export const parseMaxAgeDays = ( raw : unknown ) : MaxAgeDaysParsed => {
	const text = String( raw ?? '' ).trim();
	if ( text === '' ) return { ok: true, days: undefined };

	const days = Number( text );
	if ( !Number.isInteger( days ) || days < 0 || days > PASSWORD_MAX_AGE_MAX_DAYS )
		return { ok: false, error: `Days must be a whole number between 0 and ${PASSWORD_MAX_AGE_MAX_DAYS}.` };

	return { ok: true, days };
};

/**
 * Builds the request params. With no value the `days` key is left OUT (not set to
 * undefined or null): it is not sent, and the backend clears the value.
 *
 * @param id - The user id
 * @param days - The value from {@link parseMaxAgeDays}
 */
export const maxAgeParams = ( id : string, days? : number ) : { id : string; days? : number } => {
	if ( days === undefined ) return { id };

	return { id, days };
};
