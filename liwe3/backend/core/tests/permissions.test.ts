import { describe, expect, it } from 'vitest';
import { can_act_on, capabilities, has_perms, has_perms_sync } from '../src/permissions';

const ctxOf = ( user : any ) => ( { user: async () => user } as any );
const USER = ( perms : string[], id = 'u1' ) => ( { id, perms } );

describe('has_perms_sync', () => {
	it('rejects an empty or missing perms list', () => {
		expect( has_perms_sync( USER( [ 'x' ] ), [] ) ).toBe( false );
		expect( has_perms_sync( USER( [ 'x' ] ), undefined as any ) ).toBe( false );
	});

	it('"public" / "anyone" pass with no user', () => {
		expect( has_perms_sync( null, [ 'public' ] ) ).toBe( true );
		expect( has_perms_sync( null, [ 'anyone' ] ) ).toBe( true );
	});

	it('null user fails a real permission', () => {
		expect( has_perms_sync( null, [ 'user.list' ] ) ).toBe( false );
	});

	it('system.admin is the wildcard', () => {
		expect( has_perms_sync( USER( [ 'system.admin' ] ), [ 'anything.at.all' ] ) ).toBe( true );
	});

	it('"logged" passes for any user holding at least one perm', () => {
		expect( has_perms_sync( USER( [ 'some.perm' ] ), [ 'logged' ] ) ).toBe( true );
		expect( has_perms_sync( USER( [] ), [ 'logged' ] ) ).toBe( false );
	});

	it('matches when the user holds one of the listed perms', () => {
		expect( has_perms_sync( USER( [ 'a', 'b' ] ), [ 'b', 'c' ] ) ).toBe( true );
		expect( has_perms_sync( USER( [ 'a' ] ), [ 'b', 'c' ] ) ).toBe( false );
	});
});

describe('has_perms', () => {
	it('delegates to has_perms_sync with the resolved user', async () => {
		expect( await has_perms( ctxOf( USER( [ 'user.list' ] ) ), [ 'user.list' ] ) ).toBe( true );
		expect( await has_perms( ctxOf( null ), [ 'user.list' ] ) ).toBe( false );
	});
});

describe('capabilities', () => {
	it('resolves every capability in the spec against one user', async () => {
		const cap = await capabilities( ctxOf( USER( [ 'wallet.read' ] ) ), {
			read: [ 'wallet.read' ],
			admin: [ 'system.admin' ],
			transfer: [ 'wallet.transfer' ],
		} );
		expect( cap ).toEqual( { read: true, admin: false, transfer: false } );
	});
});

describe('can_act_on', () => {
	it('null user is always denied', async () => {
		expect( await can_act_on( ctxOf( null ), [ 'comment.del' ], 'u1' ) ).toBe( false );
	});

	it('the owner is allowed without the permission', async () => {
		expect( await can_act_on( ctxOf( USER( [], 'owner' ) ), [ 'comment.del' ], 'owner' ) ).toBe( true );
	});

	it('a non-owner needs the permission', async () => {
		expect( await can_act_on( ctxOf( USER( [], 'other' ) ), [ 'comment.del' ], 'owner' ) ).toBe( false );
		expect( await can_act_on( ctxOf( USER( [ 'comment.del' ], 'other' ) ), [ 'comment.del' ], 'owner' ) ).toBe( true );
	});

	it('with no ownerId it is a plain permission check', async () => {
		expect( await can_act_on( ctxOf( USER( [ 'comment.del' ] ) ), [ 'comment.del' ] ) ).toBe( true );
		expect( await can_act_on( ctxOf( USER( [] ) ), [ 'comment.del' ] ) ).toBe( false );
	});
});
