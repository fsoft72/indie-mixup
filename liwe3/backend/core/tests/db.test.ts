import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import {
	drizzleGetRecursiveRelatedIds,
	secret,
	secretjson,
	setDBSecret,
	sqlDump,
	timestampDate,
} from '../src/db';

describe('sqlDump', () => {
	it('inlines a numeric parameter', () => {
		expect( sqlDump( sql`select * from users where id = ${42}` ) )
			.toBe( 'select * from users where id = 42' );
	});

	it('quotes and escapes string parameters', () => {
		expect( sqlDump( sql`name = ${"O'Brien"}` ) ).toBe( "name = 'O''Brien'" );
	});

	it('renders a null parameter as NULL', () => {
		expect( sqlDump( sql`a = ${null}` ) ).toBe( 'a = NULL' );
	});

	it('renders booleans as 1/0', () => {
		expect( sqlDump( sql`enabled = ${true} or hidden = ${false}` ) ).toBe( 'enabled = 1 or hidden = 0' );
	});

	it('accepts a query builder exposing getSQL()', () => {
		const builder = { getSQL: () => sql`select ${1}` };
		expect( sqlDump( builder ) ).toBe( 'select 1' );
	});
});

describe('setDBSecret', () => {
	it('rejects an empty secret', () => {
		expect( () => setDBSecret( '' ) ).toThrow( 'DB secret must not be empty' );
	});

	it('accepts a non-empty secret', () => {
		expect( () => setDBSecret( 'a-test-secret' ) ).not.toThrow();
	});
});

describe('custom column types', () => {
	it('exposes secret / secretjson / timestampDate as usable column factories', () => {
		expect( typeof secret ).toBe( 'function' );
		expect( typeof secretjson( 'payload' ) ).toBe( 'object' );
		expect( typeof timestampDate ).toBe( 'function' );
	});
});

describe('drizzleGetRecursiveRelatedIds', () => {
	// Minimal stand-in for a Drizzle query builder: select().from().where() -> rows
	const fakeDb = ( rowsPerCall : Array<Array<{ id : string }>> ) => {
		let call = 0;
		return {
			select: () => ( {
				from: () => ( {
					where: async () => rowsPerCall[call++] ?? [],
				} ),
			} ),
		} as any;
	};

	it('returns an empty array for empty input without touching the db', async () => {
		const result = await drizzleGetRecursiveRelatedIds( null as any, {} as any, {} as any, {} as any, [] );
		expect( result ).toEqual( [] );
	});

	it('returns the initial ids when nothing references them', async () => {
		const result = await drizzleGetRecursiveRelatedIds(
			fakeDb( [ [] ] ),
			{} as any,
			{} as any,
			{} as any,
			[ 'a', 'b' ],
		);
		expect( result.sort() ).toEqual( [ 'a', 'b' ] );
	});

	it('walks the follow-up chain and collects descendants', async () => {
		const result = await drizzleGetRecursiveRelatedIds(
			fakeDb( [ [ { id: 'b' } ], [ { id: 'c' } ], [] ] ),
			{} as any,
			{} as any,
			{} as any,
			[ 'a' ],
		);
		expect( result.sort() ).toEqual( [ 'a', 'b', 'c' ] );
	});

	it('does not revisit ids already seen (cycle safe)', async () => {
		const result = await drizzleGetRecursiveRelatedIds(
			fakeDb( [ [ { id: 'a' }, { id: 'b' } ], [] ] ),
			{} as any,
			{} as any,
			{} as any,
			[ 'a' ],
		);
		expect( result.sort() ).toEqual( [ 'a', 'b' ] );
	});
});
