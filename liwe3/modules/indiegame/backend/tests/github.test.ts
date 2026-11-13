import { describe, expect, it, vi } from 'vitest';
import { verifyRepoOwnership } from '../src/lib/github';

const repoBody = ( overrides : Record<string, unknown> = {} ) => ( {
	id: 987654,
	private: false,
	html_url: 'https://github.com/Alice/Cool-Game',
	owner: { id: 42, type: 'User', login: 'Alice' },
	...overrides,
} );

const jsonResponse = ( body : unknown, status = 200 ) => new Response( JSON.stringify( body ), { status, headers: { 'Content-Type': 'application/json' } } );

describe('verifyRepoOwnership', () => {
	it('owner personal repo is accepted', async () => {
		const fetchMock = vi.fn( async () => jsonResponse( repoBody() ) );

		const res = await verifyRepoOwnership( 'https://github.com/alice/cool-game', '42', { fetch: fetchMock as any } );

		expect( res ).toEqual( { ok: true, repo_id: '987654', url: 'https://github.com/Alice/Cool-Game' } );
		expect( fetchMock.mock.calls[0][0] ).toBe( 'https://api.github.com/repos/alice/cool-game' );
	});

	it('org repo is rejected even for a member', async () => {
		const fetchMock = vi.fn( async () => jsonResponse( repoBody( { owner: { id: 42, type: 'Organization', login: 'Acme' } } ) ) );

		const res = await verifyRepoOwnership( 'https://github.com/acme/cool-game', '42', { fetch: fetchMock as any } );

		expect( res ).toEqual( { ok: false, code: 'NOT_OWNER' } );
	});

	it('someone else personal repo is rejected', async () => {
		const fetchMock = vi.fn( async () => jsonResponse( repoBody() ) );

		const res = await verifyRepoOwnership( 'https://github.com/alice/cool-game', '777', { fetch: fetchMock as any } );

		expect( res ).toEqual( { ok: false, code: 'NOT_OWNER' } );
	});

	it('private repo is rejected', async () => {
		const fetchMock = vi.fn( async () => jsonResponse( repoBody( { private: true } ) ) );

		const res = await verifyRepoOwnership( 'https://github.com/alice/cool-game', '42', { fetch: fetchMock as any } );

		expect( res ).toEqual( { ok: false, code: 'REPO_PRIVATE' } );
	});

	it('missing repo is REPO_NOT_FOUND', async () => {
		const fetchMock = vi.fn( async () => jsonResponse( { message: 'Not Found' }, 404 ) );

		const res = await verifyRepoOwnership( 'https://github.com/alice/nope', '42', { fetch: fetchMock as any } );

		expect( res ).toEqual( { ok: false, code: 'REPO_NOT_FOUND' } );
	});

	it('a url that is not a repo never calls github', async () => {
		const fetchMock = vi.fn();

		const res = await verifyRepoOwnership( 'https://gitlab.com/a/b', '42', { fetch: fetchMock as any } );

		expect( res ).toEqual( { ok: false, code: 'REPO_NOT_FOUND' } );
		expect( fetchMock ).not.toHaveBeenCalled();
	});

	it('github 500 is GITHUB_ERROR', async () => {
		const fetchMock = vi.fn( async () => jsonResponse( { message: 'boom' }, 500 ) );

		const res = await verifyRepoOwnership( 'https://github.com/alice/cool-game', '42', { fetch: fetchMock as any } );

		expect( res ).toEqual( { ok: false, code: 'GITHUB_ERROR' } );
	});

	it('a network failure is GITHUB_ERROR', async () => {
		const fetchMock = vi.fn( async () => {
			throw new Error( 'network down' );
		} );

		const res = await verifyRepoOwnership( 'https://github.com/alice/cool-game', '42', { fetch: fetchMock as any } );

		expect( res ).toEqual( { ok: false, code: 'GITHUB_ERROR' } );
	});

	it('sends the Authorization header only when a token is given', async () => {
		const fetchMock = vi.fn( async () => jsonResponse( repoBody() ) );

		await verifyRepoOwnership( 'https://github.com/alice/cool-game', '42', { fetch: fetchMock as any } );
		await verifyRepoOwnership( 'https://github.com/alice/cool-game', '42', { fetch: fetchMock as any, token: 'tok' } );

		const noToken = ( fetchMock.mock.calls[0] as any )[1].headers;
		const withToken = ( fetchMock.mock.calls[1] as any )[1].headers;
		expect( noToken.Authorization ).toBeUndefined();
		expect( withToken.Authorization ).toBe( 'Bearer tok' );
		expect( noToken['User-Agent'] ).toBe( 'indie-mixup' );
	});
});
