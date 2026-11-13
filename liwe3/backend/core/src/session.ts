import type { Context, Next } from 'hono';
import { jwtVerify } from './crypto';
import { mkid } from './mkid';
import { KVNamespace } from '@cloudflare/workers-types';
import { ctxCreate } from './ctx';
import type { HonoEnv } from './ctx';
import type { LiWEApp } from './app';

/**
 * Session data stored in KV
 */
export interface SessionData {
	userId : string;
	sessionId : string;
	createdAt : number;
	expiresAt : number;
	tokenVersion? : number;
	metadata? : Record<string, any>;
}

/**
 * Session configuration options
 */
export interface SessionOptions {
	expiresIn? : number;
	metadata? : Record<string, any>;
}

/**
 * Prefix for the per-user session index. Each active session gets its own KV key
 * (`user_session_idx:{userId}:{sessionId}`) instead of a shared JSON list, so that
 * concurrent logins for the same user never race on a read-modify-write of a list.
 */
const USER_SESSION_INDEX_PREFIX = 'user_session_idx:';

const userSessionIndexKey = ( userId : string, sessionId : string ) : string => `${USER_SESSION_INDEX_PREFIX}${userId}:${sessionId}`;

/**
 * Creates a new session and stores it in KV
 *
 * @param kv - Cloudflare KV namespace
 * @param domain - Application domain (e.g., 'playground')
 * @param userId - User ID to associate with the session
 * @param options - Session configuration options
 * @param tokenVersion - Optional token version for validation
 * @returns Promise<string> - The session ID
 */
export const sessionCreate = async (
	kv : KVNamespace,
	domain : string,
	userId : string,
	options : SessionOptions = {},
	tokenVersion? : number,
) : Promise<string> => {
	if ( !userId ) throw new Error( 'User ID is required' );
	if ( !domain ) throw new Error( 'Domain is required' );
	if ( !options.expiresIn ) throw new Error( 'expiresIn is required' );

	const sessionId = mkid( 'sess' );
	const expiresInSeconds = Math.floor( options.expiresIn );
	const now = Math.floor( Date.now() / 1000 );

	const sessionData : SessionData = {
		userId,
		sessionId,
		createdAt: now,
		expiresAt: now + expiresInSeconds,
		tokenVersion,
		metadata: options.metadata || {},
	};

	const kvKey = `session:${sessionId}`;

	await kv.put( kvKey, JSON.stringify( sessionData ), {
		expirationTtl: expiresInSeconds,
	} );

	// Index this session under its owning user, for enumeration/bulk revocation
	// (e.g. "logout everywhere"). This key is independent per session id, so two
	// concurrent sessionCreate calls for the same user can never overwrite each
	// other's entry the way a shared JSON list would.
	await kv.put( userSessionIndexKey( userId, sessionId ), '1', {
		expirationTtl: expiresInSeconds,
	} );

	return sessionId;
};

/**
 * Lists all active session IDs for a user by scanning the per-user session index.
 * Used for enumerating and bulk-revoking a user's sessions (e.g. "logout everywhere").
 *
 * @param kv - Cloudflare KV namespace
 * @param userId - User ID to list sessions for
 * @returns Promise<string[]> - Array of active session IDs (may include recently-expired
 *   ids whose index entry has not yet been evicted; callers should tolerate sessionGet
 *   returning null for such ids)
 */
export const sessionListIds = async ( kv : KVNamespace, userId : string ) : Promise<string[]> => {
	const prefix = `${USER_SESSION_INDEX_PREFIX}${userId}:`;
	const sessionIds : string[] = [];
	let cursor : string | undefined;

	do {
		const listResult : any = await kv.list( { prefix, cursor } );
		for ( const key of listResult.keys ) {
			sessionIds.push( key.name.slice( prefix.length ) );
		}
		cursor = listResult.list_complete ? undefined : listResult.cursor;
	} while ( cursor );

	return sessionIds;
};

/**
 * Retrieves session data from KV
 *
 * @param kv - Cloudflare KV namespace
 * @param domain - Application domain (e.g., 'playground')
 * @param sessionId - Session ID to retrieve
 * @returns Promise<SessionData | null> - Session data or null if not found/expired
 */
export const sessionGet = async (
	kv : KVNamespace,
	domain : string,
	sessionId : string,
) : Promise<SessionData | null> => {
	if ( !sessionId ) {
		return null;
	}
	if ( !domain ) {
		return null;
	}

	const kvKey = `session:${sessionId}`;

	try {
		const sessionJson = await kv.get( kvKey );
		if ( !sessionJson ) {
			return null;
		}

		const sessionData : SessionData = JSON.parse( sessionJson );

		// Double-check expiration (KV TTL should handle this, but being safe)
		const now = Math.floor( Date.now() / 1000 );
		if ( sessionData.expiresAt && now >= sessionData.expiresAt ) {
			// Session expired, delete it
			await sessionDestroy( kv, domain, sessionId, sessionData.userId );
			return null;
		}

		return sessionData;
	} catch ( error ) {
		// Invalid JSON or other error
		return null;
	}
};

/**
 * Destroys a session by removing it from KV
 *
 * @param kv - Cloudflare KV namespace
 * @param domain - Application domain (e.g., 'playground')
 * @param sessionId - Session ID to destroy
 * @param userId - Optional user ID; when provided, also removes this session's entry
 *   from the user's session index (skip only if the index entry's own TTL is an
 *   acceptable cleanup path)
 * @returns Promise<void>
 */
export const sessionDestroy = async (
	kv : KVNamespace,
	domain : string,
	sessionId : string,
	userId? : string,
) : Promise<void> => {
	if ( !sessionId || !domain ) {
		return;
	}

	const kvKey = `session:${sessionId}`;
	await kv.delete( kvKey );

	if ( userId ) {
		await kv.delete( userSessionIndexKey( userId, sessionId ) );
	}
};

/**
 * Refreshes a session by extending its expiration time
 *
 * @param kv - Cloudflare KV namespace
 * @param domain - Application domain (e.g., 'playground')
 * @param sessionId - Session ID to refresh
 * @param expiresIn - New expiration time in seconds
 * @returns Promise<boolean> - True if session was refreshed, false if session not found
 */
export const sessionRefresh = async (
	kv : KVNamespace,
	domain : string,
	sessionId : string,
	expiresIn : number,
) : Promise<boolean> => {
	const sessionData = await sessionGet( kv, domain, sessionId );
	if ( !sessionData ) {
		return false;
	}

	const expiresInSeconds = Math.floor( expiresIn );
	const now = Math.floor( Date.now() / 1000 );
	sessionData.expiresAt = now + expiresInSeconds;

	// Read-modify-write on a single `session:{id}` value. KV has no CAS, so two
	// concurrent writers (another sessionRefresh, or a sessionUpdateMetadata)
	// race and the last put wins. This is deliberate for session state: a lost
	// metadata merge or a slightly shorter expiry both self-heal on the next
	// refresh/update, and nothing here is security-critical. Data that genuinely
	// cannot tolerate a lost write (the per-user session index) uses one KV key
	// per item instead - see USER_SESSION_INDEX_PREFIX.
	const kvKey = `session:${sessionId}`;
	await kv.put( kvKey, JSON.stringify( sessionData ), {
		expirationTtl: expiresInSeconds,
	} );

	// Keep the per-user index entry's TTL in step with the session it points to.
	// Without this the index key keeps its original (shorter) TTL and expires
	// while the session is still live, so sessionListIds - and "logout
	// everywhere" built on it - would silently miss this session.
	await kv.put( userSessionIndexKey( sessionData.userId, sessionId ), '1', {
		expirationTtl: expiresInSeconds,
	} );

	return true;
};

/**
 * Updates session metadata
 *
 * @param kv - Cloudflare KV namespace
 * @param domain - Application domain (e.g., 'playground')
 * @param sessionId - Session ID to update
 * @param metadata - New metadata to merge with existing metadata
 * @returns Promise<boolean> - True if session was updated, false if session not found
 */
export const sessionUpdateMetadata = async (
	kv : KVNamespace,
	domain : string,
	sessionId : string,
	metadata : Record<string, any>,
) : Promise<boolean> => {
	const sessionData = await sessionGet( kv, domain, sessionId );
	if ( !sessionData ) {
		return false;
	}

	sessionData.metadata = { ...sessionData.metadata, ...metadata };

	// Same non-atomic read-modify-write as sessionRefresh: concurrent writers on
	// `session:{id}` race and last-write-wins. Accepted here because session
	// metadata is advisory - a merge lost to a concurrent write is re-applied by
	// the next update. Do not move anything that needs stronger guarantees into
	// this blob; give it its own KV key (see USER_SESSION_INDEX_PREFIX).
	const kvKey = `session:${sessionId}`;
	const ttl = sessionData.expiresAt - Math.floor( Date.now() / 1000 );

	if ( ttl > 0 ) {
		await kv.put( kvKey, JSON.stringify( sessionData ), {
			expirationTtl: ttl,
		} );
		return true;
	}

	return false;
};

/**
 * Resolves the session of a single request from its Authorization header.
 *
 * Nothing is written on the app instance: the returned values belong to the
 * caller's request only and are meant to build a LiWECtx.
 *
 * @param c - The Hono context of the current request
 * @param app - The LiWEApp instance (used for kv and jwt config only)
 * @param domain - Application domain (e.g., 'playground')
 * @returns The session id (null when unauthenticated) and its session resolver
 */
export const sessionResolve = async (
	c : Context<HonoEnv>,
	app : LiWEApp,
	domain : string,
) : Promise<{ sessionId : string | null; getSession : () => Promise<SessionData | null> }> => {
	const authHeader = c.req.header( 'Authorization' );
	let sessionId : string | null = null;
	let tokenVersion : number | undefined = undefined;

	if ( authHeader && authHeader.startsWith( 'Bearer ' ) ) {
		const jwtSession = authHeader.substring( 7 ); // Remove 'Bearer ' prefix
		const jwtData = await jwtVerify( jwtSession, app.cfg.jwt.secret );

		if ( jwtData && typeof jwtData === 'object' && 'session' in jwtData ) {
			sessionId = jwtData?.session || null;
			tokenVersion = jwtData?.tokenVersion;
		}
	}

	if ( !sessionId ) return { sessionId: null, getSession: async () => null };

	const id = sessionId;
	const getSession = async () : Promise<SessionData | null> => {
		const sessionData = await sessionGet( app.kv, domain, id );
		if ( !sessionData ) return null;

		// Validate token version if present in both JWT and sessionData
		if ( tokenVersion !== undefined && sessionData.tokenVersion !== undefined ) {
			// Token version mismatch, invalidate session
			if ( sessionData.tokenVersion !== tokenVersion ) return null;
		}

		return sessionData;
	};

	return { sessionId, getSession };
};

/**
 * Middleware building the per-request LiWECtx and storing it in the Hono context.
 *
 * Every method downstream reads the ctx from `c.get( 'ctx' )`, so no request state
 * ever touches the shared LiWEApp instance.
 *
 * @param app - The LiWEApp instance
 * @param domain - Application domain (e.g., 'playground')
 * @returns Hono middleware function
 */
export const ctxMiddleware = ( app : LiWEApp, domain : string ) => {
	return async ( c : Context<HonoEnv>, next : Next ) => {
		const { sessionId, getSession } = await sessionResolve( c, app, domain );

		c.set( 'ctx', ctxCreate( app, c, sessionId, getSession ) );

		await next();
	};
};
