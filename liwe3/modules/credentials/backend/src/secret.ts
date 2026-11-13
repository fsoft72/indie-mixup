import { and, eq } from 'drizzle-orm';
import { type LiWECtx, decryptData } from '@backend/liwe3';
import { credentials_items } from './schema';

/** A tenant credential's public metadata plus its decrypted secret data. */
export interface DomainSecret {
	metadata : Record<string, any>;
	data : Record<string, any>;
}

/**
 * Reads the current user's tenant credential of the given `type` and
 * decrypts its `data_enc` payload. Returns null when no such credential
 * exists, when it has no encrypted data attached, or when the caller is
 * unauthenticated.
 *
 * Internal helper for other backend modules (e.g. a generation provider
 * reading its own API key) - not exposed over HTTP.
 *
 * @param ctx - The request context (ctx.user() for the current tenant)
 * @param type - Credential type to look up (e.g. 'byteplus')
 * @returns The credential's metadata plus decrypted data, or null if not configured
 */
export const get_domain_secret = async ( ctx : LiWECtx, type : string ) : Promise<DomainSecret | null> => {
	const user = await ctx.user();
	if ( !user ) return null;

	const row = await ctx.app.db
		.select()
		.from( credentials_items )
		.where( and(
			eq( credentials_items.domain, user.domain ?? '_' ),
			eq( credentials_items.type, type ),
		) )
		.get();

	if ( !row || !row.data_enc ) return null;

	const secret = ctx.app.cfg.site.secret;
	if ( !secret ) return null;

	const data = await decryptData( row.data_enc, secret );

	return { metadata: row.metadata, data };
};
