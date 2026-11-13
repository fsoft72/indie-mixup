import { afterEach, describe, expect, it } from 'vitest';
import { type LiWECtx, liwe_event_register, liwe_event_unregister, responseSuccess } from '@backend/liwe3';
import { system_admin_domain_create_root } from '../src/methods';
import { SYSTEM_EVENT_DOMAIN_CREATE } from '../src/events';

/** Drizzle-shaped mock: the domain does not exist yet and the insert returns the new row */
const makeCtx = () : LiWECtx => {
	const q : any = {
		select: () => q,
		from: () => q,
		where: () => q,
		insert: () => q,
		values: () => q,
		limit: () => Promise.resolve( [] ),
		returning: () => Promise.resolve( [ { code: 'newdom', name: 'New domain' } ] ),
	};

	return { app: { db: q, cfg: {} } as any, c: null, sessionId: null, session: async () => null, user: async () => null };
};

describe('system_admin_domain_create_root events', () => {
	const handlers : Array<[ string, ( c : LiWECtx, d : any ) => Promise<any> ]> = [];

	/** Registers a handler that records the payload (and the event name in `order`, when given) */
	const on = ( event : string, calls : any[], order? : string[] ) => {
		const handler = async ( _c : LiWECtx, data : any ) => {
			calls.push( data );
			order?.push( event );
			return responseSuccess( true );
		};
		liwe_event_register( event, handler );
		handlers.push( [ event, handler ] );
	};

	afterEach( () => {
		for ( const [ event, handler ] of handlers.splice( 0 ) ) liwe_event_unregister( event, handler );
	} );

	it('emits system.domain_create with the new domain code after the admin user is requested', async () => {
		const order : string[] = [];
		const created : any[] = [];
		on( 'user.call.user.add', [], order );
		on( SYSTEM_EVENT_DOMAIN_CREATE, created, order );

		const res = await system_admin_domain_create_root( makeCtx(), { name: 'New domain', total_max_tiers: 0, code: 'newdom' }, { skip_permissions_check: true } );

		expect( res.ok ).toBe( true );
		expect( created ).toEqual( [ { code: 'newdom' } ] );
		expect( order ).toEqual( [ 'user.call.user.add', SYSTEM_EVENT_DOMAIN_CREATE ] );
	});

	it('does not emit system.domain_create when the domain code already exists', async () => {
		const created : any[] = [];
		on( SYSTEM_EVENT_DOMAIN_CREATE, created );
		const ctx = makeCtx();
		( ctx.app.db as any ).limit = () => Promise.resolve( [ { code: 'newdom' } ] );

		const res = await system_admin_domain_create_root( ctx, { name: 'New domain', total_max_tiers: 0, code: 'newdom' }, { skip_permissions_check: true } );

		expect( res.ok ).toBe( false );
		expect( created ).toEqual( [] );
	});
});
