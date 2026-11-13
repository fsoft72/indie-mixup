import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listeners_init } from '../src/listeners';
import { LiWEApp, type LiWECtx, liwe_event_call } from '@backend/liwe3';

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockRun = vi.fn();

const resetDbMocks = () => {
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { where: mockWhere } );
	mockWhere.mockReturnValue( { get: mockGet, run: mockRun } );
	mockUpdate.mockReturnValue( { set: mockSet } );
	mockSet.mockReturnValue( { where: mockWhere } );
};

const createMockApp = () : LiWEApp => {
	const mockApp = new LiWEApp( 'test' );
	Object.defineProperty( mockApp, 'db', { get: () => ( { select: mockSelect, update: mockUpdate } ) } );
	return mockApp;
};

const ctx : LiWECtx = { app: createMockApp(), c: null, sessionId: null, session: async () => null, user: async () => null };

/** A stored user of the domain `acme`. */
const stored = ( over : Record<string, unknown> = {} ) => ( {
	id: 'user_1',
	domain: 'acme',
	email: 'a@acme.it',
	name: 'A',
	lastname: 'B',
	enabled: true,
	password: 'HASH',
	...over,
} );

describe('user.call.user.* account events', () => {
	// Handlers register into a module-level singleton: register them once
	beforeAll( () => {
		listeners_init( createMockApp() );
	} );

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
	} );

	describe('set_enabled', () => {
		it('disables a user of the given domain', async () => {
			mockGet.mockResolvedValue( stored() );

			const res : any = await liwe_event_call( ctx, 'user', 'user.set_enabled', { id: 'user_1', domain: 'acme', enabled: false } );

			expect( res.ok ).toBe( true );
			expect( mockSet ).toHaveBeenCalledWith( { enabled: false } );
		});

		it('refuses a user of another domain and writes nothing', async () => {
			mockGet.mockResolvedValue( stored( { domain: 'beta' } ) );

			const res : any = await liwe_event_call( ctx, 'user', 'user.set_enabled', { id: 'user_1', domain: 'acme', enabled: false } );

			expect( res.ok ).toBe( false );
			expect( res.status ).toBe( 403 );
			expect( mockSet ).not.toHaveBeenCalled();
		});

		it('requires the domain', async () => {
			const res : any = await liwe_event_call( ctx, 'user', 'user.set_enabled', { id: 'user_1', enabled: false } );

			expect( res.status ).toBe( 400 );
			expect( mockSet ).not.toHaveBeenCalled();
		});
	});

	describe('set_password', () => {
		it('hashes and stores the password of a user of the given domain', async () => {
			mockGet.mockResolvedValue( stored() );

			const res : any = await liwe_event_call( ctx, 'user', 'user.set_password', { id: 'user_1', domain: 'acme', password: 'Tmp-Passw0rd-1234' } );

			expect( res.ok ).toBe( true );
			const written = mockSet.mock.calls[0][0].password as string;
			expect( written ).toBeTruthy();
			expect( written ).not.toBe( 'Tmp-Passw0rd-1234' );
		});

		it('refuses a user of another domain', async () => {
			mockGet.mockResolvedValue( stored( { domain: 'beta' } ) );

			const res : any = await liwe_event_call( ctx, 'user', 'user.set_password', { id: 'user_1', domain: 'acme', password: 'Tmp-Passw0rd-1234' } );

			expect( res.status ).toBe( 403 );
			expect( mockSet ).not.toHaveBeenCalled();
		});

		it('refuses a short password', async () => {
			mockGet.mockResolvedValue( stored() );

			const res : any = await liwe_event_call( ctx, 'user', 'user.set_password', { id: 'user_1', domain: 'acme', password: 'short' } );

			expect( res.ok ).toBe( false );
			expect( mockSet ).not.toHaveBeenCalled();
		});
	});

	describe('update', () => {
		it('changes name, lastname and email, and never returns the password hash', async () => {
			mockGet
				.mockResolvedValueOnce( stored() ) // the user
				.mockResolvedValueOnce( undefined ) // no other user with that email
				.mockResolvedValueOnce( stored( { email: 'new@acme.it', name: 'N' } ) );

			const res : any = await liwe_event_call( ctx, 'user', 'user.update', { id: 'user_1', domain: 'acme', name: 'N', email: 'new@acme.it' } );

			expect( res.ok ).toBe( true );
			expect( mockSet ).toHaveBeenCalledWith( { name: 'N', email: 'new@acme.it' } );
			expect( res.data.password ).toBeNull();
		});

		it('rejects an email already used by another user of the domain', async () => {
			mockGet.mockResolvedValueOnce( stored() ).mockResolvedValueOnce( { id: 'user_2' } );

			const res : any = await liwe_event_call( ctx, 'user', 'user.update', { id: 'user_1', domain: 'acme', email: 'taken@acme.it' } );

			expect( res.status ).toBe( 409 );
			expect( mockSet ).not.toHaveBeenCalled();
		});

		it('moves the username with the email when the username was the email', async () => {
			mockGet
				.mockResolvedValueOnce( stored( { username: 'a@acme.it' } ) ) // the user
				.mockResolvedValueOnce( undefined ) // no other user with that email
				.mockResolvedValueOnce( undefined ) // no other user with that username
				.mockResolvedValueOnce( stored( { username: 'new@acme.it', email: 'new@acme.it' } ) );

			const res : any = await liwe_event_call( ctx, 'user', 'user.update', { id: 'user_1', domain: 'acme', email: 'new@acme.it' } );

			expect( res.ok ).toBe( true );
			expect( mockSet ).toHaveBeenCalledWith( { email: 'new@acme.it', username: 'new@acme.it' } );
		});

		it('keeps a username that was chosen apart from the email', async () => {
			mockGet
				.mockResolvedValueOnce( stored( { username: 'custom.name' } ) )
				.mockResolvedValueOnce( undefined )
				.mockResolvedValueOnce( stored( { username: 'custom.name', email: 'new@acme.it' } ) );

			await liwe_event_call( ctx, 'user', 'user.update', { id: 'user_1', domain: 'acme', email: 'new@acme.it' } );

			expect( mockSet ).toHaveBeenCalledWith( { email: 'new@acme.it' } );
		});

		it('rejects a new email whose username is taken by another user of the domain', async () => {
			mockGet
				.mockResolvedValueOnce( stored( { username: 'a@acme.it' } ) )
				.mockResolvedValueOnce( undefined ) // email free
				.mockResolvedValueOnce( { id: 'user_2' } ); // username taken

			const res : any = await liwe_event_call( ctx, 'user', 'user.update', { id: 'user_1', domain: 'acme', email: 'taken@acme.it' } );

			expect( res.status ).toBe( 409 );
			expect( mockSet ).not.toHaveBeenCalled();
		});

		it('refuses a user of another domain', async () => {
			mockGet.mockResolvedValueOnce( stored( { domain: 'beta' } ) );

			const res : any = await liwe_event_call( ctx, 'user', 'user.update', { id: 'user_1', domain: 'acme', name: 'X' } );

			expect( res.status ).toBe( 403 );
			expect( mockSet ).not.toHaveBeenCalled();
		});

		it('only touches the fields it was given', async () => {
			mockGet.mockResolvedValueOnce( stored() ).mockResolvedValueOnce( stored( { lastname: 'Z' } ) );

			await liwe_event_call( ctx, 'user', 'user.update', { id: 'user_1', domain: 'acme', lastname: 'Z' } );

			expect( mockSet ).toHaveBeenCalledWith( { lastname: 'Z' } );
		});
	});
});
