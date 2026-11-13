import { beforeEach, describe, expect, it, vi } from 'vitest';
import { system_admin_config_fields, system_admin_config_reset, system_admin_config_set } from '../src/methods';
import { systemConfigOverridesRefresh } from '../src/config-overrides';

vi.mock( '../src/config-overrides', () => ( {
	systemConfigOverridesRefresh: vi.fn( async () => true ),
} ) );

/** Fake ctx whose db records the queries the methods build. */
const makeCtx = () => {
	const upsert = vi.fn( () => 'upsert-query' );
	const db : any = {
		insert: vi.fn( () => ( { values: vi.fn( () => ( { onConflictDoUpdate: upsert } ) ) } ) ),
		delete: vi.fn( () => ( { where: vi.fn( () => 'delete-query' ) } ) ),
		batch: vi.fn( async () => [] ),
	};
	const ctx : any = {
		app: { db, cfg: { site: { name: 'Fatto' } } },
	};

	return { ctx, db, upsert };
};

describe('system_admin_config_fields', () => {
	it('returns the groups with the current values as defaults', async () => {
		const { ctx } = makeCtx();

		const res : any = await system_admin_config_fields( ctx );

		expect( res.ok ).toBe( true );
		expect( res.data.map( ( g : any ) => g.label ) ).toEqual( [ 'Sessions', 'Site', 'Users', 'Email' ] );
		expect( res.data[1].fields[0] ).toMatchObject( { name: 'site.name', default: 'Fatto' } );
	});
});

describe('system_admin_config_set', () => {
	beforeEach( () => {
		vi.clearAllMocks();
	} );

	it('rejects an unlisted key, writes nothing and does not refresh', async () => {
		const { ctx, db } = makeCtx();

		const res : any = await system_admin_config_set( ctx, { values: { 'site.name': 'X', 'jwt.secret': 'x' } } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 400 );
		expect( db.batch ).not.toHaveBeenCalled();
		expect( systemConfigOverridesRefresh ).not.toHaveBeenCalled();
	});

	it('rejects a value of the wrong type', async () => {
		const { ctx, db } = makeCtx();

		const res : any = await system_admin_config_set( ctx, { values: { 'user.passwordMaxAgeDays': 'abc' } } );

		expect( res.ok ).toBe( false );
		expect( db.batch ).not.toHaveBeenCalled();
	});

	it('upserts every key in one batch, then forces a refresh and returns the groups', async () => {
		const { ctx, db, upsert } = makeCtx();

		const res : any = await system_admin_config_set( ctx, { values: { 'site.name': 'New', 'user.passwordMaxAgeDays': '30' } } );

		expect( res.ok ).toBe( true );
		expect( db.batch ).toHaveBeenCalledTimes( 1 );
		expect( db.batch.mock.calls[0][0] ).toHaveLength( 2 );
		expect( upsert ).toHaveBeenCalledWith( expect.objectContaining( { set: { value: 30 } } ) );
		expect( systemConfigOverridesRefresh ).toHaveBeenCalledWith( ctx.app, { force: true } );
		expect( res.data ).toHaveLength( 4 );
	});

	it('says the value was saved but not applied when the refresh after the write fails', async () => {
		const { ctx } = makeCtx();
		vi.mocked( systemConfigOverridesRefresh ).mockResolvedValueOnce( false );

		const res : any = await system_admin_config_set( ctx, { values: { 'site.name': 'New' } } );

		expect( res.ok ).toBe( false );
		expect( res.message ).toMatch( /saved/i );
	});

	it('returns an error response, and does not refresh, when the database fails', async () => {
		const { ctx, db } = makeCtx();
		db.batch.mockRejectedValueOnce( new Error( 'D1 down' ) );

		const res : any = await system_admin_config_set( ctx, { values: { 'site.name': 'New' } } );

		expect( res.ok ).toBe( false );
		expect( res.status ).toBe( 500 );
		expect( systemConfigOverridesRefresh ).not.toHaveBeenCalled();
	});
});

describe('system_admin_config_reset', () => {
	beforeEach( () => {
		vi.clearAllMocks();
	} );

	it('deletes the given keys, forces a refresh and returns the groups', async () => {
		const { ctx, db } = makeCtx();

		const res : any = await system_admin_config_reset( ctx, { keys: [ 'site.name', 'ses.region' ] } );

		expect( res.ok ).toBe( true );
		expect( db.delete ).toHaveBeenCalledTimes( 1 );
		expect( systemConfigOverridesRefresh ).toHaveBeenCalledWith( ctx.app, { force: true } );
	});

	it('says the reset was done but not applied when the refresh after the delete fails', async () => {
		const { ctx } = makeCtx();
		vi.mocked( systemConfigOverridesRefresh ).mockResolvedValueOnce( false );

		const res : any = await system_admin_config_reset( ctx, { keys: [ 'site.name' ] } );

		expect( res.ok ).toBe( false );
		expect( res.message ).toMatch( /reset/i );
	});

	it('succeeds without touching the database when no key is given', async () => {
		const { ctx, db } = makeCtx();

		const res : any = await system_admin_config_reset( ctx, { keys: [] } );

		expect( res.ok ).toBe( true );
		expect( db.delete ).not.toHaveBeenCalled();
	});
});
