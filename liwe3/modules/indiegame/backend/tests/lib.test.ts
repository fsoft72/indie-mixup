import { describe, expect, it } from 'vitest';
import { parseRepoUrl } from '../src/lib/repo';
import { dayOf, isRankWindow, windowStartDay } from '../src/lib/time';
import { eventId, remixReportId, visitorHash } from '../src/lib/visitor';
import { type LineageNode, createsCycle, walkAncestors } from '../src/lib/lineage';

describe('parseRepoUrl', () => {
	it('normalizes variants', () => {
		const expected = { owner: 'owner', name: 'repo', url: 'https://github.com/owner/repo' };

		expect( parseRepoUrl( 'https://github.com/Owner/Repo/' ) ).toEqual( expected );
		expect( parseRepoUrl( 'https://github.com/owner/repo.git' ) ).toEqual( expected );
		expect( parseRepoUrl( 'http://www.github.com/OWNER/repo' ) ).toEqual( expected );
	});

	it('rejects non-repos', () => {
		expect( parseRepoUrl( 'https://github.com/owner' ) ).toBeNull();
		expect( parseRepoUrl( 'https://gitlab.com/o/r' ) ).toBeNull();
		expect( parseRepoUrl( 'not a url' ) ).toBeNull();
		expect( parseRepoUrl( '' ) ).toBeNull();
	});

	it('ignores a path after the repo name', () => {
		expect( parseRepoUrl( 'https://github.com/owner/repo/tree/main' ) ).toEqual( { owner: 'owner', name: 'repo', url: 'https://github.com/owner/repo' } );
	});
});

describe('time windows', () => {
	it('windowStartDay at the UTC day boundary', () => {
		const late = new Date( '2026-11-13T23:59:59Z' );

		expect( windowStartDay( '1d', late ) ).toBe( '2026-11-13' );
		expect( windowStartDay( '7d', late ) ).toBe( '2026-11-07' );
		expect( windowStartDay( '30d', late ) ).toBe( '2026-10-15' );
		expect( windowStartDay( 'all', late ) ).toBeNull();
		expect( windowStartDay( '1d', new Date( '2026-11-14T00:00:00Z' ) ) ).toBe( '2026-11-14' );
	});

	it('dayOf uses UTC', () => {
		expect( dayOf( new Date( '2026-11-13T23:59:59Z' ) ) ).toBe( '2026-11-13' );
		expect( dayOf( new Date( '2026-11-14T00:00:00Z' ) ) ).toBe( '2026-11-14' );
	});

	it('isRankWindow accepts only the four windows', () => {
		for ( const w of [ 'all', '30d', '7d', '1d' ] ) expect( isRankWindow( w ) ).toBe( true );
		for ( const w of [ '', '1w', 'ALL', '90d' ] ) expect( isRankWindow( w ) ).toBe( false );
	});
});

describe('visitor hashes', () => {
	it('visitorHash prefers cookie then ip then a fixed fallback', async () => {
		const withCookieA = await visitorHash( 'cookie-1', '1.1.1.1', 'salt' );
		const withCookieB = await visitorHash( 'cookie-1', '2.2.2.2', 'salt' );
		const ipOnly = await visitorHash( null, '1.1.1.1', 'salt' );
		const nothing = await visitorHash( null, null, 'salt' );

		expect( withCookieA ).toBe( withCookieB );
		expect( ipOnly ).not.toBe( withCookieA );
		expect( nothing ).toBeTruthy();
		expect( await visitorHash( null, null, 'salt' ) ).toBe( nothing );
		expect( [ withCookieA, ipOnly, nothing ].some( ( h ) => h.includes( '1.1.1.1' ) ) ).toBe( false );
	});

	it('eventId is stable per game, kind, visitor and day and differs on any change', async () => {
		const base = await eventId( 'g1', 'view', 'v1', '2026-11-13' );

		expect( await eventId( 'g1', 'view', 'v1', '2026-11-13' ) ).toBe( base );
		expect( await eventId( 'g1', 'view', 'v1', '2026-11-14' ) ).not.toBe( base );
		expect( await eventId( 'g1', 'download', 'v1', '2026-11-13' ) ).not.toBe( base );
		expect( base.length ).toBeLessThanOrEqual( 64 );
		expect( base.startsWith( 'ige.' ) ).toBe( true );
	});

	it('remixReportId is stable per pair and ordered', async () => {
		const a = await remixReportId( 'g1', 'g2' );

		expect( await remixReportId( 'g1', 'g2' ) ).toBe( a );
		expect( await remixReportId( 'g2', 'g1' ) ).not.toBe( a );
		expect( a.startsWith( 'irr.' ) ).toBe( true );
		expect( a.length ).toBeLessThanOrEqual( 64 );
	});
});

const node = ( id : string, parent : string | null, status : LineageNode['status'] = 'visible' ) : LineageNode => ( { id, name: `Game ${id}`, id_remix_of: parent, status } );
const loaderOf = ( nodes : LineageNode[] ) => async ( id : string ) => nodes.find( ( n ) => n.id === id ) ?? null;

describe('lineage', () => {
	it('walkAncestors orders root first and marks missing links', async () => {
		const chain = [ node( 'A', null ), node( 'B', 'A' ), node( 'C', 'B' ) ];

		expect( await walkAncestors( 'C', loaderOf( chain ) ) ).toEqual( [
			{ id: 'A', name: 'Game A', state: 'ok' },
			{ id: 'B', name: 'Game B', state: 'ok' },
		] );

		const deleted = [ node( 'A', null ), node( 'B', 'A', 'deleted' ), node( 'C', 'B' ) ];
		expect( await walkAncestors( 'C', loaderOf( deleted ) ) ).toEqual( [
			{ id: 'A', name: 'Game A', state: 'ok' },
			{ id: 'B', name: 'Game B', state: 'removed' },
		] );

		const hidden = [ node( 'A', null ), node( 'B', 'A', 'hidden' ), node( 'C', 'B' ) ];
		const res = await walkAncestors( 'C', loaderOf( hidden ) );
		expect( res.map( ( i ) => i.state ) ).toEqual( [ 'ok', 'unavailable' ] );
	});

	it('walkAncestors marks a missing row as removed', async () => {
		const res = await walkAncestors( 'C', loaderOf( [ node( 'C', 'B' ) ] ) );

		expect( res ).toEqual( [ { id: 'B', name: '', state: 'removed' } ] );
	});

	it('walkAncestors terminates on a cycle in the data', async () => {
		const cyclic = [ node( 'A', 'B' ), node( 'B', 'A' ) ];
		const res = await walkAncestors( 'A', loaderOf( cyclic ), 10 );

		expect( res.length ).toBeLessThanOrEqual( 10 );
	});

	it('createsCycle', async () => {
		const chain = [ node( 'A', null ), node( 'B', 'A' ), node( 'C', null ) ];
		const load = loaderOf( chain );

		expect( await createsCycle( 'A', 'A', load ) ).toBe( true );
		expect( await createsCycle( 'A', 'B', load ) ).toBe( true );
		expect( await createsCycle( 'C', 'A', load ) ).toBe( false );
	});
});
