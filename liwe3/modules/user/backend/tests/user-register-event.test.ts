import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listeners_init } from '../src/listeners';
import { users } from '../src/schema';
import { USER_CALL_USER_ADD, USER_CALL_USER_REGISTER, USER_EVENT_REGISTERED } from '../src/events';
import { LiWEApp, type LiWECtx, liwe_event_emit, liwe_event_register, liwe_event_unregister, responseSuccess } from '@backend/liwe3';

vi.mock( '@backend/liwe3', async () => {
	const actual = await vi.importActual( '@backend/liwe3' );
	return {
		...actual,
		mkid: vi.fn(),
	};
} );

import { mkid } from '@backend/liwe3';

// Mock database operations
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockRun = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();

const resetDbMocks = () => {
	mockInsert.mockReturnValue( { values: mockValues } );
	mockValues.mockReturnValue( { run: mockRun } );
	mockSelect.mockReturnValue( { from: mockFrom } );
	mockFrom.mockReturnValue( { where: mockWhere } );
	mockWhere.mockReturnValue( { get: mockGet } );
};

const createMockApp = () : LiWEApp => {
	const mockApp = new LiWEApp( 'test' );
	Object.defineProperty( mockApp, 'db', {
		get: () => ( { insert: mockInsert, select: mockSelect } ),
	} );
	Object.defineProperty( mockApp, 'cfg', { get: () => ( { system: {} } ) } );
	return mockApp;
};

const createMockCtx = ( app : LiWEApp = createMockApp() ) : LiWECtx => ( {
	app,
	c: null,
	sessionId: null,
	session: async () => null,
	user: async () => null,
} );

describe('user.call.user.register listener', () => {
	// Handlers register into a module-level singleton, so this must run once,
	// not per test, or repeated calls emit to N accumulated duplicate handlers.
	beforeAll( () => {
		listeners_init( createMockApp() );
	} );

	beforeEach( () => {
		vi.clearAllMocks();
		resetDbMocks();
		vi.mocked( mkid ).mockReturnValue( 'user_generated_id' );
	} );

	it('rejects when the requested domain already exists', async () => {
		mockGet.mockResolvedValueOnce( { id: 'existing_user' } ); // domain-exists check

		const ctx = createMockCtx();
		const result = await liwe_event_emit( ctx, USER_CALL_USER_REGISTER, {
			username: 'newowner',
			email: 'owner@example.com',
			password: 'secret',
			domain: 'acme',
		} );

		expect( result.ok ).toBe( true ); // the emit envelope always succeeds
		const [ registerResult ] = result.data;
		expect( registerResult.ok ).toBe( false );
		expect( registerResult.error?.code ).toBe( 'ERROR_DOMAIN_ALREADY_EXISTS' );
		expect( mockInsert ).not.toHaveBeenCalled();
	});

	it('rejects when no domain is provided', async () => {
		const ctx = createMockCtx();
		const result = await liwe_event_emit( ctx, USER_CALL_USER_REGISTER, {
			username: 'newowner',
			email: 'owner@example.com',
			password: 'secret',
		} );

		const [ registerResult ] = result.data;
		expect( registerResult.ok ).toBe( false );
		expect( registerResult.error?.code ).toBe( 'ERROR_NO_DOMAIN' );
		expect( mockInsert ).not.toHaveBeenCalled();
	});

	it('creates the user as owner of a brand-new domain with every user.* permission', async () => {
		mockGet
			.mockResolvedValueOnce( undefined ) // domain-exists check: domain is free
			.mockResolvedValueOnce( undefined ) // user_add duplicate username/email check
			.mockResolvedValueOnce( { // user_add re-fetch after insert
				id: 'user_generated_id',
				username: 'newowner',
				email: 'owner@example.com',
				domain: 'acme',
				password: 'irrelevant-hash',
				perms: [ 'user.create', 'user.delete' ],
				email_verified: false,
			} );
		mockRun.mockResolvedValue( undefined );

		const ctx = createMockCtx();
		const result = await liwe_event_emit( ctx, USER_CALL_USER_REGISTER, {
			username: 'newowner',
			email: 'owner@example.com',
			password: 'secret',
			domain: 'acme',
			name: 'New',
			lastname: 'Owner',
		} );

		const [ registerResult ] = result.data;
		expect( registerResult.ok ).toBe( true );
		expect( registerResult.data.username ).toBe( 'newowner' );
		// user_add strips domain/password before returning
		expect( registerResult.data.domain ).toBeNull();
		expect( registerResult.data.password ).toBeNull();

		// the user is inserted with every user.* permission and forced into the new domain
		expect( mockValues ).toHaveBeenCalledWith( expect.objectContaining( {
			domain: 'acme',
			perms: expect.arrayContaining( [
				'user.create',
				'user.delete',
				'user.password',
				'user.list',
				'user.perms',
				'user.change_identity',
				'user.role.manage',
				'user.2fa.manage',
				'user.oauth.manage',
				'user.enable',
				'user.verify',
			] ),
		} ) );
	});

	/** Primes the db mocks for a successful registration of a free domain */
	const primeRegistration = () => {
		mockGet
			.mockResolvedValueOnce( undefined ) // domain-exists check: domain is free
			.mockResolvedValueOnce( undefined ) // user_add duplicate username/email check
			.mockResolvedValueOnce( { // user_add re-fetch after insert
				id: 'user_generated_id',
				username: 'newowner',
				email: 'owner@example.com',
				domain: 'acme',
				password: 'irrelevant-hash',
				perms: [],
				email_verified: false,
			} );
		mockRun.mockResolvedValue( undefined );
	};

	it('register emits user.registered with id_user and domain', async () => {
		primeRegistration();
		const received : any[] = [];
		const on_registered = async ( _ctx : LiWECtx, data : any ) => {
			received.push( data );
			return responseSuccess( true );
		};
		liwe_event_register( USER_EVENT_REGISTERED, on_registered );

		try {
			await liwe_event_emit( createMockCtx(), USER_CALL_USER_REGISTER, { username: 'newowner', email: 'owner@example.com', password: 'secret', domain: 'acme' } );
		} finally {
			liwe_event_unregister( USER_EVENT_REGISTERED, on_registered );
		}

		expect( received ).toEqual( [ { id_user: 'user_generated_id', domain: 'acme' } ] );
	});

	it('register does not emit user.registered when the domain already exists', async () => {
		mockGet.mockResolvedValueOnce( { id: 'existing_user' } );
		const received : any[] = [];
		const on_registered = async ( _ctx : LiWECtx, data : any ) => {
			received.push( data );
			return responseSuccess( true );
		};
		liwe_event_register( USER_EVENT_REGISTERED, on_registered );

		try {
			await liwe_event_emit( createMockCtx(), USER_CALL_USER_REGISTER, { username: 'newowner', email: 'owner@example.com', password: 'secret', domain: 'acme' } );
		} finally {
			liwe_event_unregister( USER_EVENT_REGISTERED, on_registered );
		}

		expect( received ).toEqual( [] );
	});

	it('register and add never print the password', async () => {
		const spies = [ vi.spyOn( console, 'log' ), vi.spyOn( console, 'info' ), vi.spyOn( console, 'warn' ) ].map( ( spy ) => spy.mockImplementation( () => {} ) );

		primeRegistration();
		await liwe_event_emit( createMockCtx(), USER_CALL_USER_REGISTER, { username: 'newowner', email: 'owner@example.com', password: 'S3cr3t!', domain: 'acme' } );

		primeRegistration();
		mockGet.mockReset();
		mockGet.mockResolvedValue( undefined );
		await liwe_event_emit( createMockCtx(), USER_CALL_USER_ADD, { user: { username: 'u2', email: 'u2@example.com', password: 'S3cr3t!', domain: 'acme' } } );

		const printed = spies.flatMap( ( spy ) => spy.mock.calls ).map( ( args ) => JSON.stringify( args ) ).join( '\n' );
		expect( printed ).not.toContain( 'S3cr3t!' );
		spies.forEach( ( spy ) => spy.mockRestore() );
	});
});
