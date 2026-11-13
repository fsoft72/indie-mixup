import { OAuthProvider } from './types';
import { googleProvider } from './google';
import { githubProvider } from './github';

export type { OAuthProfile, OAuthProvider, OAuthTokens } from './types';

/**
 * Registry of supported OAuth provider adapters, keyed by `user_oauth_providers.provider`.
 * Adding a provider (Apple, Meta, ...) means adding an adapter file and a line here.
 */
const OAUTH_PROVIDERS : Record<string, OAuthProvider> = {
	[googleProvider.id]: googleProvider,
	[githubProvider.id]: githubProvider,
};

/**
 * Looks up the adapter for a given provider id.
 *
 * @param {string} provider - Provider id (e.g. "google", "github")
 * @returns {OAuthProvider | undefined} The matching adapter, or undefined if unsupported
 */
export const getOAuthProvider = ( provider : string ) : OAuthProvider | undefined => OAUTH_PROVIDERS[provider];
