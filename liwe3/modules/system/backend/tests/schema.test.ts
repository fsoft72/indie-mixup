import { describe, expect, it } from 'vitest';
import { type SystemDomainDB, type SystemThemeDB, system_domains, system_themes } from '../src/schema';

describe('system_domains table schema', () => {
	it('exposes exactly the expected columns', () => {
		const cols = Object.keys( system_domains ).filter( ( k ) => !k.startsWith( '_' ) && !k.startsWith( '$' ) );
		expect( cols.sort() ).toEqual(
			[ 'code', 'name', 'visible', 'total_max_tiers', 'tiers_allocated' ].sort(),
		);
	});

	it('has a required text `code` column, length 30', () => {
		const col = system_domains.code as any;
		expect( col.name ).toBe( 'code' );
		expect( col.notNull ).toBe( true );
		expect( col.length ).toBe( 30 );
	});

	it('has a required text `name` column, length 50', () => {
		const col = system_domains.name as any;
		expect( col.name ).toBe( 'name' );
		expect( col.notNull ).toBe( true );
		expect( col.length ).toBe( 50 );
	});

	it('has a boolean `visible` column defaulting to false', () => {
		const col = system_domains.visible as any;
		expect( col.name ).toBe( 'visible' );
		expect( col.columnType ).toBe( 'SQLiteBoolean' );
		expect( col.notNull ).toBe( true );
		expect( col.hasDefault ).toBe( true );
		expect( col.default ).toBe( false );
	});

	it('has required integer tier-accounting columns', () => {
		for ( const name of [ 'total_max_tiers', 'tiers_allocated' ] as const ) {
			const col = ( system_domains as any )[name];
			expect( col.name ).toBe( name );
			expect( col.columnType ).toBe( 'SQLiteInteger' );
			expect( col.notNull ).toBe( true );
		}
	});

	it('infers a select row type covering every column', () => {
		const row : SystemDomainDB = {
			code: 'acme',
			name: 'Acme',
			visible: true,
			total_max_tiers: 10,
			tiers_allocated: 3,
		};
		expect( row.code ).toBe( 'acme' );
		expect( typeof row.visible ).toBe( 'boolean' );
	});
});

describe('system_themes table schema', () => {
	it('exposes exactly the expected columns', () => {
		const cols = Object.keys( system_themes ).filter( ( k ) => !k.startsWith( '_' ) && !k.startsWith( '$' ) );
		expect( cols.sort() ).toEqual( [ 'code', 'data' ].sort() );
	});

	it('has a required text `code` column, length 30', () => {
		const col = system_themes.code as any;
		expect( col.name ).toBe( 'code' );
		expect( col.notNull ).toBe( true );
		expect( col.length ).toBe( 30 );
	});

	it('stores `data` as a required JSON text column', () => {
		const col = system_themes.data as any;
		expect( col.name ).toBe( 'data' );
		expect( col.columnType ).toBe( 'SQLiteTextJson' );
		expect( col.notNull ).toBe( true );
	});

	it('infers a select row type with a structured `data` payload', () => {
		const row : SystemThemeDB = {
			code: 'dark',
			data: { primary: '#000', secondary: '#fff' },
		};
		expect( row.data ).toEqual( { primary: '#000', secondary: '#fff' } );
	});
});
