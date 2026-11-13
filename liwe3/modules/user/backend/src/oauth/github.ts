import { OAuthProfile, OAuthProvider, OAuthTokens } from './types';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const USER_EMAILS_URL = 'https://api.github.com/user/emails';

// GitHub requires a User-Agent header on API requests
const USER_AGENT = 'liwe3-user-module';

interface GithubEmail {
	email : string;
	primary : boolean;
	verified : boolean;
}

/**
 * GitHub OAuth2 adapter (GitHub doesn't speak OIDC: profile and verified
 * email come from two separate REST calls instead of a userinfo endpoint).
 */
export const githubProvider : OAuthProvider = {
	id: 'github',

	getAuthorizeUrl: ( clientId, redirectUri, state ) => {
		const url = new URL( AUTHORIZE_URL );
		url.searchParams.set( 'client_id', clientId );
		url.searchParams.set( 'redirect_uri', redirectUri );
		url.searchParams.set( 'scope', 'read:user user:email' );
		url.searchParams.set( 'state', state );

		return url.toString();
	},

	exchangeCode: async ( clientId, clientSecret, code, redirectUri ) : Promise<OAuthTokens> => {
		const res = await fetch( TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			body: new URLSearchParams( {
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: redirectUri,
			} ),
		} );

		if ( !res.ok ) throw new Error( `GitHub token exchange failed: ${res.status}` );

		const data = await res.json() as { access_token? : string; error? : string };
		if ( !data.access_token ) throw new Error( `GitHub token exchange returned no access_token: ${data.error ?? 'unknown error'}` );

		return { accessToken: data.access_token };
	},

	fetchProfile: async ( accessToken ) : Promise<OAuthProfile> => {
		const headers = {
			Authorization: `Bearer ${accessToken}`,
			'User-Agent': USER_AGENT,
			Accept: 'application/vnd.github+json',
		};

		const userRes = await fetch( USER_URL, { headers } );
		if ( !userRes.ok ) throw new Error( `GitHub profile fetch failed: ${userRes.status}` );

		const user = await userRes.json() as { id : number; name? : string; email? : string | null };

		let email : string | null = null;
		let emailVerified = false;

		const emailsRes = await fetch( USER_EMAILS_URL, { headers } );
		if ( emailsRes.ok ) {
			const emails = await emailsRes.json() as GithubEmail[];
			const primary = emails.find( ( e ) => e.primary ) ?? emails.find( ( e ) => e.verified );
			if ( primary ) {
				email = primary.email;
				emailVerified = primary.verified;
			}
		}

		return {
			providerUserId: String( user.id ),
			email,
			emailVerified,
			name: user.name,
		};
	},
};
