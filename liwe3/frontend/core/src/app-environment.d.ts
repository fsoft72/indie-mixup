/**
 * Ambient declaration of the SvelteKit `$app/environment` module.
 *
 * This package is a library, not a SvelteKit app: it has no `svelte.config.js`
 * and `svelte-kit sync` generates no mapping for `$app/*`, so type checking it
 * standalone cannot resolve the module. The consuming app provides the real
 * implementation; this only mirrors the part of its public surface we use.
 */

declare module '$app/environment' {
	/** `true` if the app is running in the browser. */
	export const browser : boolean;

	/** Whether the dev server is running. */
	export const dev : boolean;

	/** `true` while SvelteKit analyses the app during the build step. */
	export const building : boolean;

	/** The value of `config.kit.version.name`. */
	export const version : string;
}
