/**
 * @fileoverview One-shot async initializer with retry-on-failure.
 *
 * A Worker isolate initializes the app once and reuses it for every later
 * request. If the first attempt is memoized as a promise and it rejects, every
 * later request awaits that same rejected promise and fails forever, until the
 * isolate is recycled. `createInitGuard` memoizes the success and drops the
 * memo on failure, so the next call retries.
 */

/**
 * Wraps an async initializer so its result is computed at most once, but a
 * failed attempt does not poison later calls.
 *
 * - While an attempt is in flight, concurrent callers share that one promise.
 * - On success, the resolved value is cached and returned to every later caller.
 * - On failure, the memo is cleared and the rejection is propagated; the next
 *   call starts a fresh attempt.
 *
 * @param init - the initializer to run
 * @returns a function returning the shared/cached initialization promise
 */
export const createInitGuard = <T>( init : () => Promise<T> ) : () => Promise<T> => {
	let pending : Promise<T> | null = null;

	return () : Promise<T> => {
		if ( pending ) return pending;

		pending = init().catch( ( err ) => {
			pending = null;
			throw err;
		} );

		return pending;
	};
};
