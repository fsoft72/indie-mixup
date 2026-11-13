import { OAuthProfile, OAuthProvider, OAuthTokens } from './types';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/**
 * Google OAuth2/OIDC adapter.
 */
export const googleProvider : OAuthProvider = {
	id: 'google',

	getAuthorizeUrl: ( clientId, redirectUri, state ) => {
		const url = new URL( AUTHORIZE_URL );
		url.searchParams.set( 'client_id', clientId );
		url.searchParams.set( 'redirect_uri', redirectUri );
		url.searchParams.set( 'response_type', 'code' );
		url.searchParams.set( 'scope', 'openid email profile' );
		url.searchParams.set( 'state', state );

		return url.toString();
	},

	exchangeCode: async ( clientId, clientSecret, code, redirectUri ) : Promise<OAuthTokens> => {
		const res = await fetch( TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams( {
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code',
			} ),
		} );

		if ( !res.ok ) throw new Error( `Google token exchange failed: ${res.status}` );

		const data = await res.json() as { access_token? : string };
		if ( !data.access_token ) throw new Error( 'Google token exchange returned no access_token' );

		return { accessToken: data.access_token };
	},

	fetchProfile: async ( accessToken ) : Promise<OAuthProfile> => {
		const res = await fetch( USERINFO_URL, {
			headers: { Authorization: `Bearer ${accessToken}` },
		} );

		if ( !res.ok ) throw new Error( `Google profile fetch failed: ${res.status}` );

		const data = await res.json() as { sub : string; email? : string; email_verified? : boolean; name? : string };

		return {
			providerUserId: data.sub,
			email: data.email ?? null,
			emailVerified: !!data.email_verified,
			name: data.name,
		};
	},
};
