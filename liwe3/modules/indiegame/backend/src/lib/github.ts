/**
 * @fileoverview Ownership check of a public GitHub repo, using only the public GitHub API (no user token).
 */

import { parseRepoUrl } from './repo';

/** Result of the ownership check */
export type RepoCheck =
	| { ok : true; repo_id : string; url : string }
	| { ok : false; code : 'REPO_NOT_FOUND' | 'REPO_PRIVATE' | 'NOT_OWNER' | 'GITHUB_ERROR' };

/** Optional dependencies, mainly to test without the network */
export type RepoCheckDeps = { fetch? : typeof fetch; token? : string };

type GithubRepo = { id : number; private : boolean; html_url : string; owner : { id : number; type : string } };

const API_URL = 'https://api.github.com/repos';

/**
 * Checks that a repo exists, is public and is the personal repo of the given GitHub user (repos of organizations are not accepted).
 *
 * @param repoUrl - The repo url typed by the user
 * @param githubUserId - Numeric GitHub id of the person publishing the game
 * @param deps - Optional `fetch` override and optional service token that raises the GitHub rate limit
 * @returns `ok` with the numeric repo id and the canonical url, or an error code
 */
export const verifyRepoOwnership = async ( repoUrl : string, githubUserId : string, deps : RepoCheckDeps = {} ) : Promise<RepoCheck> => {
	const parsed = parseRepoUrl( repoUrl );
	if ( !parsed ) return { ok: false, code: 'REPO_NOT_FOUND' };

	const doFetch = deps.fetch ?? fetch;
	const headers : Record<string, string> = { 'User-Agent': 'indie-mixup', Accept: 'application/vnd.github+json' };
	if ( deps.token ) headers.Authorization = `Bearer ${deps.token}`;

	let res : Response;
	try {
		res = await doFetch( `${API_URL}/${parsed.owner}/${parsed.name}`, { headers } );
	} catch {
		return { ok: false, code: 'GITHUB_ERROR' };
	}

	if ( res.status === 404 ) return { ok: false, code: 'REPO_NOT_FOUND' };
	if ( !res.ok ) return { ok: false, code: 'GITHUB_ERROR' };

	const repo = await res.json() as GithubRepo;
	if ( repo.private ) return { ok: false, code: 'REPO_PRIVATE' };
	if ( repo.owner.type !== 'User' || String( repo.owner.id ) !== githubUserId ) return { ok: false, code: 'NOT_OWNER' };

	return { ok: true, repo_id: String( repo.id ), url: repo.html_url };
};
