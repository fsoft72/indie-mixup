/**
 * @fileoverview In-memory registry of the permission gate declared for each
 * route, populated by `routeGet` / `routeBody` at registration time.
 *
 * It is a projection of the declaration, used for audit and introspection
 * (`GET /api/system/admin/routes/list`, the route-audit tests). It is NOT the
 * enforcement point - that is `_gateCheck` inside the route wrappers.
 */

import type { RouteGate } from './routes';

/** What is recorded for one route. */
export interface RouteMapEntry {
	/** Name of the wrapped method function, for diagnostics. */
	name : string;
	/** The declared gate, or undefined when the route was registered without one. */
	perms? : RouteGate;
	/** Optional human description. */
	description? : string;
}

/**
 * Keyed by the handler closure that `routeGet` / `routeBody` returns, which is
 * the exact value later found on `app.hono.routes[n].handler`.
 */
const ROUTE_MAP = new Map<Function, RouteMapEntry>();

/**
 * Records the gate declared for a route handler.
 *
 * @param handler - the wrapper returned by routeGet / routeBody
 * @param entry - the recorded declaration
 */
export const routeMapAdd = ( handler : Function, entry : RouteMapEntry ) : void => {
	ROUTE_MAP.set( handler, entry );
};

/**
 * @param handler - a route handler
 * @returns the recorded declaration, or undefined when none was registered
 */
export const routeMapGet = ( handler : Function ) : RouteMapEntry | undefined => ROUTE_MAP.get( handler );

/**
 * @returns every recorded [handler, entry] pair
 */
export const routeMapAll = () : Array<[ Function, RouteMapEntry ]> => [ ...ROUTE_MAP.entries() ];

/** One row of the introspectable route list. */
export interface RouteListRow {
	method : string;
	path : string;
	perms? : RouteGate;
	description? : string;
}

/** The subset of Hono's route entries this module needs. */
type HonoRouteLike = { method : string; path : string; handler : Function };

/**
 * Correlates the framework's registered routes with the declared gate map by
 * handler identity.
 *
 * @param honoRoutes - `app.hono.routes`
 * @returns one row per `/api/*` route that declared a gate, sorted by path then method
 */
export const collectRouteList = ( honoRoutes : HonoRouteLike[] ) : RouteListRow[] => {
	const rows : RouteListRow[] = [];
	for ( const r of honoRoutes ) {
		if ( !r.path.startsWith( '/api/' ) ) continue;
		const entry = ROUTE_MAP.get( r.handler );
		if ( !entry ) continue;
		rows.push( { method: r.method, path: r.path, perms: entry.perms, description: entry.description } );
	}
	rows.sort( ( a, b ) => ( a.path === b.path ? a.method.localeCompare( b.method ) : a.path.localeCompare( b.path ) ) );
	return rows;
};

/**
 * @param honoRoutes - `app.hono.routes`
 * @returns the sorted `"METHOD /path"` list of routes whose gate is PUBLIC
 */
export const publicRoutes = ( honoRoutes : HonoRouteLike[] ) : string[] =>
	collectRouteList( honoRoutes )
		.filter( ( r ) => r.perms === 'public' )
		.map( ( r ) => `${r.method} ${r.path}` );

/**
 * Clears the registry. Test-only.
 */
export const routeMapReset = () : void => ROUTE_MAP.clear();
