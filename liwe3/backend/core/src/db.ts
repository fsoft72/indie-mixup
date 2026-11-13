import {
	BaseSQLiteDatabase,
	SQLiteColumn,
	SQLiteTableWithColumns,
	customType,
} from 'drizzle-orm/sqlite-core';
import { SQL, inArray } from 'drizzle-orm';
import { SQLiteDialect } from 'drizzle-orm/sqlite-core/dialect';
import { deobfuscate, obfuscate } from './crypto';

// Type constraint for the table structure
type AnySQLiteTable = SQLiteTableWithColumns<any>;

/**
 * Render a Drizzle query (builder or SQL) to a debug-friendly SQLite SQL string.
 *
 * Accepts:
 * - Drizzle query builders that expose `getSQL()` (typical: db.select()/insert()/update()/delete())
 * - Drizzle `SQL` objects (raw SQL fragments)
 *
 * This uses the SQLite dialect to compile to `{ sql, params }` and then inlines params for readability.
 * Do not use the output for execution.
 */
export function sqlDump( query : { getSQL : () => SQL } | SQL ) : string {
	// Note: in Drizzle's sqlite package, `SQLiteDialect` is abstract, so we construct
	// a minimal concrete subclass solely for calling `sqlToQuery()`.
	const sqliteDialect = new ( class extends SQLiteDialect {} )();

	const sqlAst = typeof ( query as { getSQL? : () => SQL } )?.getSQL === 'function'
		? ( query as { getSQL : () => SQL } ).getSQL()
		: ( query as SQL );

	const generatedQuery = sqliteDialect.sqlToQuery( sqlAst as any );
	return inlineSqlParams( generatedQuery.sql, generatedQuery.params );

	function inlineSqlParams( sql : string, params : unknown[] ) : string {
		let i = 0;
		return sql.replace( /\?/g, () => formatSqlValue( params[i++] ) );
	}

	function formatSqlValue( value : unknown ) : string {
		if ( value === null || value === undefined ) return 'NULL';
		if ( typeof value === 'number' ) return Number.isFinite( value ) ? String( value ) : 'NULL';
		if ( typeof value === 'boolean' ) return value ? '1' : '0';
		if ( typeof value === 'bigint' ) return value.toString();
		if ( value instanceof Date ) return `'${value.toISOString().replace( /'/g, "''" )}'`;
		if ( typeof value === 'string' ) return `'${value.replace( /'/g, "''" )}'`;

		if ( value instanceof Uint8Array ) {
			const hex = Array.from( value ).map( ( b ) => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
			return `X'${hex}'`;
		}

		if ( typeof value === 'object' ) return `'${JSON.stringify( value ).replace( /'/g, "''" )}'`;

		return `'${String( value ).replace( /'/g, "''" )}'`;
	}
}

/**
 * Finds all related IDs (descendants) in a self-referencing table
 * by iteratively traversing the follow-up relationship.
 *
 * @param db The Drizzle ORM database instance.
 * @param table The Drizzle table object (e.g., comment_comments).
 * @param idColumn The Drizzle column object for the primary/unique ID (e.g., comment_comments.id).
 * @param followUpColumn The Drizzle column object for the self-referencing ID (e.g., comment_comments.id_follow_up).
 * @param initialIds An array of string IDs to start the search from.
 * @returns A promise that resolves to an array of all unique related IDs (including the initial IDs).
 */
export async function drizzleGetRecursiveRelatedIds<
	TTable extends AnySQLiteTable,
	TIdColumn extends SQLiteColumn<any>,
	TFollowUpColumn extends SQLiteColumn<any>,
>(
	db : BaseSQLiteDatabase<any, any>,
	table : TTable,
	idColumn : TIdColumn,
	followUpColumn : TFollowUpColumn,
	initialIds : string[],
) : Promise<string[]> {
	if ( !initialIds || initialIds.length === 0 ) {
		return [];
	}

	const visitedIds = new Set<string>( initialIds );
	let frontier : string[] = [ ...initialIds ];

	while ( frontier.length > 0 ) {
		const rows = await db
			.select( { id: idColumn } )
			.from( table )
			.where( inArray( followUpColumn, frontier ) );

		frontier = [];

		for ( const row of rows ) {
			const rawId = row.id;
			if ( rawId === null || rawId === undefined ) continue;

			const idValue = String( rawId );
			if ( visitedIds.has( idValue ) ) continue;

			visitedIds.add( idValue );
			frontier.push( idValue );
		}
	}

	return Array.from( visitedIds );
}

let _dbSecret : string = '';

/**
 * Sets the secret key used by `secret` and `secretjson` column types
 * to obfuscate/deobfuscate data at rest.
 * Must be called before any database read/write that uses these types.
 *
 * @param secret - The secret key from app config (app.cfg.db.secret)
 */
export const setDBSecret = ( secret : string ) => {
	if ( !secret ) throw new Error( 'DB secret must not be empty' );
	_dbSecret = secret;
};

export const secret = customType<{ data : string; driverData : string }>( {
	dataType () {
		return 'text';
	},
	toDriver ( value : string ) : string {
		if ( !_dbSecret ) throw new Error( 'DB secret not configured - call setDBSecret() first' );
		return obfuscate( value, _dbSecret );
	},
	fromDriver ( value : string ) : string {
		if ( !_dbSecret ) throw new Error( 'DB secret not configured - call setDBSecret() first' );
		return deobfuscate( value, _dbSecret );
	},
} );

/**
 * Encrypted JSON Type
 * Takes an object, stringifies it, then obfuscates it.
 */
export const secretjson = <TData>( name : string ) =>
	customType<{ data : TData; driverData : string }>( {
		dataType () {
			return 'text';
		},
		toDriver ( value : TData ) : string {
			if ( !_dbSecret ) throw new Error( 'DB secret not configured - call setDBSecret() first' );
			const jsonStr = JSON.stringify( value );
			return obfuscate( jsonStr, _dbSecret );
		},
		fromDriver ( value : string ) : TData {
			if ( !_dbSecret ) throw new Error( 'DB secret not configured - call setDBSecret() first' );
			const jsonStr = deobfuscate( value, _dbSecret );
			return JSON.parse( jsonStr );
		},
	} )( name );

export const timestampDate = customType<{ data : Date | number; driverData : number }>( {
	dataType () {
		return 'integer';
	},
	// Handles both Date objects and raw numbers being passed to the DB
	toDriver ( value : Date | number ) : number {
		if ( value instanceof Date ) {
			return Math.floor( value.getTime() / 1000 );
		}
		// If it's already a number, we assume it's a timestamp
		// We check if it looks like milliseconds (13 digits) vs seconds (10 digits)
		return value > 9999999999 ? Math.floor( value / 1000 ) : value;
	},
	// Always returns a JS Date when reading from the DB
	fromDriver ( value : number ) : Date {
		return new Date( value * 1000 );
	},
} );

/*
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey(),

  // Drizzle will execute this JS function
  // every time you perform an insert without providing this value.
  createdAt: timestampDate('created_at')
    .$defaultFn(() => new Date()),
});
*/
