/**
 * @fileoverview Loads the runtime config overrides from the database and applies them to the app.
 *
 * The overrides are global to the installation, so the table has no `domain` column and the
 * select below has no domain filter on purpose. Every Worker instance caches them for a couple
 * of minutes: a change made from /sys/config reaches the other instances within that time.
 */

import { logger } from '@backend/liwe3';
import type { LiWEApp } from '@backend/liwe3/src/app';
import { systemConfigIsEditable } from './config-fields';
import { system_config_overrides } from './schema';

/** How long an instance keeps the overrides it loaded before reading the table again */
export const SYSTEM_CONFIG_OVERRIDES_TTL_MS = 120_000;

/** When (epoch ms) the overrides were last read, or tried to be, by this instance */
let loadedAt = 0;

/** The read in progress, shared by the requests that arrive while it runs */
let inflight : Promise<boolean> | null = null;

/** Forgets that the overrides were loaded, so the next refresh reads the table. Used by tests */
export const systemConfigOverridesInvalidate = () : void => {
	loadedAt = 0;
	inflight = null;
};

/** Reads the table and applies the rows; never throws, a failure is logged and the current config stays. Returns whether the table could be read */
const _load = async ( app : LiWEApp ) : Promise<boolean> => {
	try {
		const rows = await app.db.select().from( system_config_overrides );
		const overrides : Record<string, unknown> = {};

		// A stored key that left the editable list is ignored, so the list stays the only authority
		for ( const row of rows ) {
			if ( systemConfigIsEditable( row.key ) ) overrides[row.key] = row.value;
		}

		app.applyConfigOverrides( overrides );
		return true;
	} catch ( error : any ) {
		logger.warn( 'Config overrides could not be loaded, using config.json only', { module: 'system', method: 'systemConfigOverridesRefresh', error: error?.message } );
		return false;
	}
};

/**
 * Makes sure the app config includes the stored overrides, reading the table at most once
 * per `SYSTEM_CONFIG_OVERRIDES_TTL_MS` (and once at a time). After a failed read the next
 * attempt is one TTL later, except after a forced refresh (which follows a write), that is retried
 * by the next request. Never throws.
 *
 * @param app - The application
 * @param opts - `force` skips the cache (used at startup and after a save or reset)
 * @returns Whether the table could be read (false: the app keeps its current config)
 */
export const systemConfigOverridesRefresh = async ( app : LiWEApp, opts? : { force? : boolean } ) : Promise<boolean> => {
	if ( !opts?.force && Date.now() - loadedAt < SYSTEM_CONFIG_OVERRIDES_TTL_MS ) return true;

	// A forced refresh follows a write: wait for the running read (it may predate the write) and read again
	if ( inflight && opts?.force ) await inflight;
	if ( inflight ) return inflight;

	loadedAt = Date.now();
	const running = _load( app ).finally( () => {
		if ( inflight === running ) inflight = null;
	} );
	inflight = running;

	const ok = await running;
	if ( !ok && opts?.force ) loadedAt = 0;

	return ok;
};
