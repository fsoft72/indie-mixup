import type { LiWECtx } from './ctx';
import { logger } from './logger';
import { LiWEResponse, responseError, responseSuccess } from './response';

type LiWEEventHandler = ( ctx : LiWECtx, data : any ) => Promise<LiWEResponse>;
const event_handlers : Record<string, LiWEEventHandler[]> = {};

/**
 * Registers an event handler for a specific event.
 *
 * @param event - The name of the event.
 * @param handler - The event handler function.
 *
 * @see liwe_event_unregister
 */
export const liwe_event_register = ( event : string, handler : LiWEEventHandler ) => {
	event = event.toLowerCase().trim();

	if ( !event_handlers[event] ) event_handlers[event] = [];
	event_handlers[event].push( handler );
};

/** Keys whose value must never reach the logs */
const SENSITIVE_KEY_RE = /^(key|password|token|secret|refresh_token|api_key|invite_token)$/i;

/**
 * Returns a copy of `data` safe to log: in a plain object the value of every sensitive key (key, password, token,
 * secret, refresh_token, api_key, invite_token, case insensitive) becomes `[redacted]`. Only the first level is
 * inspected; anything that is not a plain object is returned as is.
 *
 * @param data - the event payload
 * @returns the payload to log
 */
export const redactSensitive = ( data : unknown ) : unknown => {
	if ( !data || typeof data !== 'object' || Array.isArray( data ) ) return data;
	const out : Record<string, unknown> = {};
	for ( const [ k, v ] of Object.entries( data ) ) out[k] = SENSITIVE_KEY_RE.test( k ) ? '[redacted]' : v;
	return out;
};

/**
 * Emits a LiWE event and invokes all registered event handlers.
 * @param ctx - The request context, forwarded to every handler.
 * @param event - The name of the event to emit.
 * @param data - The data associated with the event.
 * @returns A Promise that resolves to an array of LiWEEventResponse objects.
 */
export const liwe_event_emit = async ( ctx : LiWECtx, event : string, data? : any ) : Promise<LiWEResponse> => {
	const responses : LiWEResponse[] = [];

	event = event.toLowerCase().trim();

	if ( ctx.app.cfg?.debug?.enabled && ctx.app.cfg?.debug?.events ) {
		logger.debug( 'Event emit', { module: 'core', method: 'liwe_event_emit', event, data: redactSensitive( data ) } );
	}

	const handlers = event_handlers[event];
	if ( !handlers || handlers.length === 0 ) return responseSuccess( [] );

	await Promise.all(
		handlers.map( async ( handler ) => {
			try {
				const res = await handler( ctx, data );
				responses.push( res );
			} catch ( error ) {
				const errMsg = `Handler error "${event}": ${error}`;
				logger.error( 'Event handler error', error instanceof Error ? error : undefined, {
					module: 'core',
					method: 'liwe_event_emit',
					event,
				} );
				responses.push( responseError( errMsg ) );
			}
		} ),
	);

	// We return a LiWEResponse with data, even if one or more callbacks fail
	return responseSuccess( responses );
};

/**
 * Unregisters an event handler for a specific event.
 *
 * @param event - The name of the event to unregister the handler from.
 * @param handler - The event handler function to unregister.
 *
 * @see liwe_event_register
 */
export const liwe_event_unregister = ( event : string, handler : LiWEEventHandler ) => {
	event = event.toLowerCase().trim();
	const handlers = event_handlers[event];
	if ( !handlers ) return;

	const idx = handlers.indexOf( handler );
	if ( idx >= 0 ) handlers.splice( idx, 1 );
};

/**
 * Retrieves the list of LIWE events.
 * @returns {string[]} The list of LIWE events.
 */
export const liwe_event_list = () => Object.keys( event_handlers );

/**
 * This function calls a specific method on a module via event emission.
 * It can only call module events that have this format : "module.call.method".
 *
 * @template T - The expected return type of the method call.
 * @param {LiWECtx} ctx - The request context.
 * @param {string} moduleName - The name of the module.
 * @param {string} methodName - The name of the method to call.
 * @param {Record<string, any>} [parameters] - The parameters to pass to the method.
 * @returns {Promise<LiWEResponse<T>>} A promise that resolves to the response of the method call.
 */
export const liwe_event_call = async <T>( ctx : LiWECtx, moduleName : string, methodName : string, parameters? : Record<string, any> ) : Promise<LiWEResponse<T>> => {
	const callName = `${moduleName.toLowerCase()}.call.${methodName.toLowerCase()}`;
	const responses : LiWEResponse = await liwe_event_emit( ctx, callName, parameters );

	if ( !responses.data || !Array.isArray( responses.data ) || responses.data.length === 0 ) {
		return responseError( `No handlers responded for event "${callName}"`, 500, 'NO_HANDLERS_RESPONSE' );
	}

	const res : LiWEResponse<T> = responses.data[0] as LiWEResponse<T>;

	// since emit returns an array of responses, we need to extract the first one
	if ( res.ok === false ) return res;

	// Return the first response
	return responseSuccess( res.data );
};
