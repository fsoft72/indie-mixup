/**
 * @fileoverview Parsing of public GitHub repo urls.
 */

const GITHUB_HOSTS = [ 'github.com', 'www.github.com' ];
const OWNER_RE = /^[a-z0-9](?:[a-z0-9-]{0,38})$/;
const NAME_RE = /^[a-z0-9._-]{1,100}$/;

/** A normalized GitHub repo reference */
export type ParsedRepo = { owner : string; name : string; url : string };

/**
 * Parses a GitHub repo url in any common form (trailing slash, `.git`, `www.`, `http`, extra path such as `/tree/main`).
 *
 * @param input - The url typed by the user
 * @returns The lowercase owner and name plus the canonical `https://github.com/<owner>/<name>` url, or null when it is not a repo url
 */
export const parseRepoUrl = ( input : string ) : ParsedRepo | null => {
	let url : URL;
	try {
		url = new URL( input.trim() );
	} catch {
		return null;
	}

	if ( url.protocol !== 'https:' && url.protocol !== 'http:' ) return null;
	if ( !GITHUB_HOSTS.includes( url.hostname.toLowerCase() ) ) return null;

	const [ rawOwner, rawName ] = url.pathname.split( '/' ).filter( Boolean );
	if ( !rawOwner || !rawName ) return null;

	const owner = rawOwner.toLowerCase();
	const name = rawName.replace( /\.git$/i, '' ).toLowerCase();
	if ( !OWNER_RE.test( owner ) || !NAME_RE.test( name ) || name === '.' || name === '..' ) return null;

	return { owner, name, url: `https://github.com/${owner}/${name}` };
};
