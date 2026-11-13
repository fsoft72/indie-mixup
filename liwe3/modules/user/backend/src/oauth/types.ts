/**
 * @fileoverview Common contract implemented by every OAuth provider adapter.
 */

/**
 * Identity fetched from the provider after a successful token exchange.
 */
export interface OAuthProfile {
	// Opaque, stable id of the user on the provider's side
	providerUserId : string;
	// Primary email address, or null if the provider didn't return one
	email : string | null;
	// Whether the provider considers the email verified
	emailVerified : boolean;
	// Display name, if available
	name? : string;
}

/**
 * Token(s) returned by the provider's code exchange endpoint.
 */
export interface OAuthTokens {
	accessToken : string;
}

/**
 * One implementation per external OAuth provider (google, github, ...).
 * Adding a new provider means adding a new adapter + a registry entry,
 * without touching the authorize/callback flow.
 */
export interface OAuthProvider {
	// Provider id, matches `user_oauth_providers.provider`
	id : string;

	// Builds the URL the browser is redirected to in order to start the OAuth flow
	getAuthorizeUrl : ( clientId : string, redirectUri : string, state : string ) => string;

	// Exchanges the authorization code for an access token
	exchangeCode : ( clientId : string, clientSecret : string, code : string, redirectUri : string ) => Promise<OAuthTokens>;

	// Fetches the user's identity using the access token
	fetchProfile : ( accessToken : string ) => Promise<OAuthProfile>;
}
