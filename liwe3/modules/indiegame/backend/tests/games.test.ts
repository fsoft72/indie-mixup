import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { indiegame_add } from '../src/methods/indiegame-add';
import { indiegame_del } from '../src/methods/indiegame-del';
import { indiegame_get } from '../src/methods/indiegame-get';
import { indiegame_list } from '../src/methods/indiegame-list';
import { indiegame_mine } from '../src/methods/indiegame-mine';
import { createDb, insertGame, mkCtx, mkUser, registerStubs, stubGithubRepo, stubs } from './helpers';

const UPLOAD = '/api/upload/get?key=acme%7Cindiegame%7Cs1.png';
const alice = mkUser( 'alice' );
const bob = mkUser( 'bob' );
const mod = mkUser( 'mod', [ 'indiegame.moderate' ] );

const valid = ( over : Record<string, unknown> = {} ) => ( {
	name: 'Cool Game',
	description: 'A cool game',
	repo_url: 'https://github.com/alice/cool-game',
	screenshots: [ UPLOAD ],
	...over,
} );

let env : ReturnType<typeof createDb>;

beforeAll( () => registerStubs() );

beforeEach( () => {
	env = createDb();
	stubs.githubIds = { alice: '42', bob: '77' };
	stubGithubRepo( {
		'alice/cool-game': { id: 1001, ownerId: 42 },
		'alice/other': { id: 1002, ownerId: 42 },
		'bob/bobs-game': { id: 1003, ownerId: 77 },
		'acme/org-game': { id: 1004, ownerId: 42, ownerType: 'Organization' },
	} );
} );

afterEach( () => vi.unstubAllGlobals() );

const create = ( user : ReturnType<typeof mkUser>, params : Record<string, unknown> ) => indiegame_add( mkCtx( env.db, user ), params as any );

describe('indiegame_add (create)', () => {
	it('create requires name description repo and a screenshot', async () => {
		for ( const missing of [ 'name', 'description', 'repo_url', 'screenshots' ] ) {
			const params : Record<string, unknown> = valid();
			delete params[missing];

			const res = await create( alice, params );

			expect( res.ok, missing ).toBe( false );
			expect( res.status, missing ).toBe( 400 );
		}

		expect( ( await create( alice, valid( { screenshots: [] } ) ) ).status ).toBe( 400 );
	});

	it('create stores a visible game owned by the caller', async () => {
		const res = await create( alice, valid() );

		expect( res.ok ).toBe( true );
		expect( res.data!.id_user ).toBe( 'alice' );
		expect( res.data!.status ).toBe( 'visible' );
		expect( res.data!.is_remix ).toBe( false );
		expect( res.data!.repo_url ).toBe( 'https://github.com/alice/cool-game' );
	});

	it('create needs a github login', async () => {
		stubs.githubIds = {};

		const res = await create( alice, valid() );

		expect( res.status ).toBe( 403 );
		expect( res.error?.code ).toBe( 'GITHUB_LOGIN_REQUIRED' );
	});

	it('create rejects a repo that is not owned', async () => {
		const res = await create( alice, valid( { repo_url: 'https://github.com/bob/bobs-game' } ) );

		expect( res.status ).toBe( 403 );
		expect( res.error?.code ).toBe( 'NOT_OWNER' );
	});

	it('create rejects an organization repo and a missing repo', async () => {
		expect( ( await create( alice, valid( { repo_url: 'https://github.com/acme/org-game' } ) ) ).error?.code ).toBe( 'NOT_OWNER' );
		expect( ( await create( alice, valid( { repo_url: 'https://github.com/alice/nope' } ) ) ).error?.code ).toBe( 'REPO_NOT_FOUND' );
	});

	it('same repo twice is a conflict even with different case', async () => {
		expect( ( await create( alice, valid() ) ).ok ).toBe( true );

		const again = await create( alice, valid( { repo_url: 'https://github.com/Alice/Cool-Game.git' } ) );

		expect( again.status ).toBe( 409 );
	});

	it('create with a remix of a visible game links it', async () => {
		insertGame( env.sqlite, { id: 'orig', id_user: 'bob', repo_id: '1003' } );

		const res = await create( alice, valid( { id_remix_of: 'orig' } ) );

		expect( res.ok ).toBe( true );
		expect( res.data!.id_remix_of ).toBe( 'orig' );
		expect( res.data!.is_remix ).toBe( true );
	});

	it('remix of a hidden, deleted or unknown game is rejected', async () => {
		insertGame( env.sqlite, { id: 'h', status: 'hidden' } );
		insertGame( env.sqlite, { id: 'd', status: 'deleted' } );

		for ( const parent of [ 'h', 'd', 'ghost' ] ) {
			const res = await create( alice, valid( { id_remix_of: parent } ) );

			expect( res.status, parent ).toBe( 400 );
		}
	});
});

describe('indiegame_add (edit)', () => {
	const mine = async () => ( await create( alice, valid() ) ).data!.id;

	it('owner can edit but repo_url is frozen', async () => {
		const id = await mine();

		const ok = await indiegame_add( mkCtx( env.db, alice ), { id, name: 'Renamed' } as any );
		expect( ok.ok ).toBe( true );
		expect( ok.data!.name ).toBe( 'Renamed' );

		const same = await indiegame_add( mkCtx( env.db, alice ), { id, repo_url: 'https://github.com/Alice/Cool-Game/' } as any );
		expect( same.ok ).toBe( true );

		const other = await indiegame_add( mkCtx( env.db, alice ), { id, repo_url: 'https://github.com/alice/other' } as any );
		expect( other.status ).toBe( 400 );
		expect( other.error?.code ).toBe( 'REPO_URL_FROZEN' );
	});

	it('stranger cannot edit but a moderator can', async () => {
		const id = await mine();

		expect( ( await indiegame_add( mkCtx( env.db, bob ), { id, name: 'Hacked' } as any ) ).status ).toBe( 403 );
		expect( ( await indiegame_add( mkCtx( env.db, mod ), { id, name: 'Fixed' } as any ) ).ok ).toBe( true );
	});

	it('editing an unknown or deleted game is a 404', async () => {
		const id = await mine();
		await indiegame_del( mkCtx( env.db, alice ), { id } as any );

		expect( ( await indiegame_add( mkCtx( env.db, alice ), { id, name: 'x' } as any ) ).status ).toBe( 404 );
		expect( ( await indiegame_add( mkCtx( env.db, alice ), { id: 'ghost', name: 'x' } as any ) ).status ).toBe( 404 );
	});

	it('remix of itself is rejected', async () => {
		const id = await mine();

		expect( ( await indiegame_add( mkCtx( env.db, alice ), { id, id_remix_of: id } as any ) ).status ).toBe( 400 );
	});

	it('remix cycle is rejected', async () => {
		const a = await mine();
		insertGame( env.sqlite, { id: 'b', id_user: 'alice', id_remix_of: a } );

		const res = await indiegame_add( mkCtx( env.db, alice ), { id: a, id_remix_of: 'b' } as any );

		expect( res.status ).toBe( 400 );
	});

	it('remix_of cannot change once remix_locked, except by a moderator', async () => {
		insertGame( env.sqlite, { id: 'o1', id_user: 'bob' } );
		insertGame( env.sqlite, { id: 'o2', id_user: 'bob' } );
		insertGame( env.sqlite, { id: 'mine', id_user: 'alice', id_remix_of: 'o1', remix_locked: 1 } );

		const own = await indiegame_add( mkCtx( env.db, alice ), { id: 'mine', id_remix_of: 'o2' } as any );
		expect( own.status ).toBe( 403 );
		expect( own.error?.code ).toBe( 'REMIX_LOCKED' );

		expect( ( await indiegame_add( mkCtx( env.db, alice ), { id: 'mine', id_remix_of: '' } as any ) ).status ).toBe( 403 );
		expect( ( await indiegame_add( mkCtx( env.db, mod ), { id: 'mine', id_remix_of: 'o2' } as any ) ).ok ).toBe( true );
	});

	it('an author can declare a remix later and clear it while not locked', async () => {
		insertGame( env.sqlite, { id: 'o1', id_user: 'bob' } );
		const id = await mine();

		const set = await indiegame_add( mkCtx( env.db, alice ), { id, id_remix_of: 'o1' } as any );
		expect( set.data!.id_remix_of ).toBe( 'o1' );

		const cleared = await indiegame_add( mkCtx( env.db, alice ), { id, id_remix_of: '' } as any );
		expect( cleared.data!.is_remix ).toBe( false );
	});
});

describe('indiegame_del, mine, get and list', () => {
	it('delete is soft and the game disappears from list and get', async () => {
		const id = ( await create( alice, valid() ) ).data!.id;

		expect( ( await indiegame_del( mkCtx( env.db, bob ), { id } as any ) ).status ).toBe( 403 );
		expect( ( await indiegame_del( mkCtx( env.db, alice ), { id } as any ) ).data ).toBe( true );

		const listed = await indiegame_list( mkCtx( env.db, null ), {} as any );
		expect( listed.data ?? [] ).toEqual( [] );
		expect( ( await indiegame_get( mkCtx( env.db, null ), { id } as any ) ).status ).toBe( 404 );
		expect( env.sqlite.prepare( 'SELECT status FROM indiegame_games WHERE id = ?' ).get( id ) ).toEqual( { status: 'deleted' } );
	});

	it('mine lists my games including hidden ones but not deleted ones', async () => {
		insertGame( env.sqlite, { id: 'v', id_user: 'alice' } );
		insertGame( env.sqlite, { id: 'h', id_user: 'alice', status: 'hidden' } );
		insertGame( env.sqlite, { id: 'd', id_user: 'alice', status: 'deleted' } );
		insertGame( env.sqlite, { id: 'x', id_user: 'bob' } );

		const res = await indiegame_mine( mkCtx( env.db, alice ), {} as any );

		expect( res.data!.map( ( g ) => g.id ).sort() ).toEqual( [ 'h', 'v' ] );
	});

	it('get returns lineage root first and direct remixes', async () => {
		insertGame( env.sqlite, { id: 'a', name: 'Alpha' } );
		insertGame( env.sqlite, { id: 'b', name: 'Beta', id_remix_of: 'a' } );
		insertGame( env.sqlite, { id: 'c', name: 'Gamma', id_remix_of: 'b' } );
		insertGame( env.sqlite, { id: 'd', name: 'Delta', id_remix_of: 'b' } );
		insertGame( env.sqlite, { id: 'e', name: 'Hidden remix', id_remix_of: 'b', status: 'hidden' } );

		const res = await indiegame_get( mkCtx( env.db, null ), { id: 'c' } as any );

		expect( res.data!.lineage.map( ( l ) => l.id ) ).toEqual( [ 'a', 'b' ] );
		expect( res.data!.author_name ).toBeTruthy();

		const b = await indiegame_get( mkCtx( env.db, null ), { id: 'b' } as any );
		expect( b.data!.remixes.map( ( r ) => r.id ).sort() ).toEqual( [ 'c', 'd' ] );
		expect( b.data!.lineage.map( ( l ) => l.id ) ).toEqual( [ 'a' ] );
	});

	it('get hides a hidden game from strangers but not from the author or a moderator', async () => {
		insertGame( env.sqlite, { id: 'h', id_user: 'alice', status: 'hidden' } );

		expect( ( await indiegame_get( mkCtx( env.db, null ), { id: 'h' } as any ) ).status ).toBe( 404 );
		expect( ( await indiegame_get( mkCtx( env.db, bob ), { id: 'h' } as any ) ).status ).toBe( 404 );
		expect( ( await indiegame_get( mkCtx( env.db, alice ), { id: 'h' } as any ) ).ok ).toBe( true );
		expect( ( await indiegame_get( mkCtx( env.db, mod ), { id: 'h' } as any ) ).ok ).toBe( true );
	});

	it('list filters by name and paginates, newest first', async () => {
		for ( let i = 1; i <= 5; i++ ) insertGame( env.sqlite, { id: `g${i}`, name: i === 3 ? 'Space Quest' : `Game ${i}`, created: `2026-01-0${i} 10:00:00` } );
		insertGame( env.sqlite, { id: 'hid', name: 'Space Hidden', status: 'hidden' } );

		const all = await indiegame_list( mkCtx( env.db, null ), { page: 1, limit: 2 } as any );
		expect( all.data!.map( ( g ) => g.id ) ).toEqual( [ 'g5', 'g4' ] );

		const page3 = await indiegame_list( mkCtx( env.db, null ), { page: 3, limit: 2 } as any );
		expect( page3.data!.map( ( g ) => g.id ) ).toEqual( [ 'g1' ] );

		const search = await indiegame_list( mkCtx( env.db, null ), { q: 'space', page: 1, limit: 20 } as any );
		expect( search.data!.map( ( g ) => g.id ) ).toEqual( [ 'g3' ] );
	});

	it('list rejects page and limit out of range and treats % in q literally', async () => {
		insertGame( env.sqlite, { id: 'p', name: '100% Fun' } );
		insertGame( env.sqlite, { id: 'q', name: 'Other' } );

		expect( ( await indiegame_list( mkCtx( env.db, null ), { page: 0, limit: 20 } as any ) ).status ).toBe( 400 );
		expect( ( await indiegame_list( mkCtx( env.db, null ), { page: 1, limit: 0 } as any ) ).status ).toBe( 400 );
		expect( ( await indiegame_list( mkCtx( env.db, null ), { page: 1, limit: 1000 } as any ) ).status ).toBe( 400 );

		const literal = await indiegame_list( mkCtx( env.db, null ), { q: '%', page: 1, limit: 20 } as any );
		expect( literal.data!.map( ( g ) => g.id ) ).toEqual( [ 'p' ] );
	});
});

describe('review fixes', () => {
	it('images must be files of the upload module, not external urls (create and edit)', async () => {
		for ( const bad of [ 'https://evil.example/p.png', '//evil.example/p.png', '/other/path.png', 'javascript:alert(1)' ] ) {
			expect( ( await create( alice, valid( { screenshots: [ bad ] } ) ) ).status, bad ).toBe( 400 );
			expect( ( await create( alice, valid( { gallery: [ bad ] } ) ) ).status, bad ).toBe( 400 );
		}

		const id = ( await create( alice, valid() ) ).data!.id;
		expect( ( await indiegame_add( mkCtx( env.db, alice ), { id, screenshots: [ 'https://evil.example/p.png' ] } as any ) ).status ).toBe( 400 );
		expect( ( await indiegame_add( mkCtx( env.db, alice ), { id, gallery: [ UPLOAD ] } as any ) ).ok ).toBe( true );
	});

	it('a repo can be published again after its game was deleted', async () => {
		const id = ( await create( alice, valid() ) ).data!.id;
		await indiegame_del( mkCtx( env.db, alice ), { id } as any );

		const again = await create( alice, valid() );

		expect( again.ok ).toBe( true );
		expect( again.data!.id ).not.toBe( id );
	});

	it('the author name never falls back to an email', async () => {
		stubs.userOverrides = { alice: { name: '', lastname: '', username: 'alice@example.com' }, bob: { name: '', lastname: '', username: 'bobby' } };
		insertGame( env.sqlite, { id: 'ga', id_user: 'alice' } );
		insertGame( env.sqlite, { id: 'gb', id_user: 'bob' } );

		const names = ( await indiegame_list( mkCtx( env.db, null ), { page: 1, limit: 20 } as any ) ).data!.map( ( g ) => g.author_name );
		stubs.userOverrides = {};

		expect( names.some( ( n ) => n?.includes( '@' ) ) ).toBe( false );
		expect( names.sort() ).toEqual( [ 'Developer', 'bobby' ] );
	});

	it('a page of 100 games stays under the 100 bound parameters of D1', async () => {
		for ( let i = 0; i < 100; i++ ) insertGame( env.sqlite, { id: `m${i}`, id_user: 'alice', created: `2026-02-01 10:00:${String( i % 60 ).padStart( 2, '0' )}` } );
		env.stats.maxParams = 0;

		const res = await indiegame_list( mkCtx( env.db, null ), { page: 1, limit: 100 } as any );

		expect( res.data ).toHaveLength( 100 );
		expect( env.stats.maxParams ).toBeLessThanOrEqual( 100 );
	});
});
