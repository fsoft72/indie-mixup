/**
 * @fileoverview UTC days and ranking windows.
 */

/** Ranking windows: all time, last 30 days, last 7 days, today (UTC) */
export type RankWindow = 'all' | '30d' | '7d' | '1d';

const WINDOW_DAYS : Record<Exclude<RankWindow, 'all'>, number> = { '30d': 30, '7d': 7, '1d': 1 };
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Type guard for the ranking windows.
 *
 * @param value - Any string
 * @returns True if the value is one of `all`, `30d`, `7d`, `1d`
 */
export const isRankWindow = ( value : string ) : value is RankWindow => value === 'all' || value in WINDOW_DAYS;

/**
 * UTC day of a date.
 *
 * @param now - The date
 * @returns The day as `YYYY-MM-DD`
 */
export const dayOf = ( now : Date ) : string => now.toISOString().slice( 0, 10 );

/**
 * First UTC day included in a window. The window always includes today: `1d` starts today, `7d` six days ago, `30d` twenty-nine days ago.
 *
 * @param window - The ranking window
 * @param now - The current date
 * @returns The first day as `YYYY-MM-DD`, or null for `all`
 */
export const windowStartDay = ( window : RankWindow, now : Date ) : string | null => {
	if ( window === 'all' ) return null;

	const todayStart = Date.UTC( now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() );

	return dayOf( new Date( todayStart - ( WINDOW_DAYS[window] - 1 ) * DAY_MS ) );
};
