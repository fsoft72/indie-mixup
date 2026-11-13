import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';

/**
 * Creates a real in-memory SQLite database wired to Drizzle (sqlite-proxy),
 * so listener queries are exercised against actual SQL instead of mocks.
 *
 * @param ddl - SQL statements creating the tables needed by the test
 * @returns A Drizzle database instance
 */
export const createSqliteDb = ( ddl : string ) => {
	const sqlite = new DatabaseSync( ':memory:' );
	sqlite.exec( ddl );

	return drizzle( async ( query, params, method ) => {
		const stmt = sqlite.prepare( query );

		if ( method === 'run' ) {
			stmt.run( ...( params as any[] ) );
			return { rows: [] };
		}

		stmt.setReturnArrays( true );
		const rows = stmt.all( ...( params as any[] ) ) as unknown[][];

		return { rows: method === 'get' ? ( rows[0] ?? [] ) : rows };
	} );
};
