import { browser } from '$app/environment';
import { flushSync, mount } from 'svelte';

/**
 * Renders a Svelte component to an HTML string on the client.
 * @param {import('svelte').ComponentType} Component The Svelte component constructor.
 * @param {Object} props The props to pass to the component.
 * @returns {string} The rendered HTML string.
 */
export const renderToStringClient = ( Component : any, props = {} ) => {
	if ( !browser ) return '';

	// 1. Create a temporary, detached DOM container
	const container = document.createElement( 'div' );

	// 2. Mount the component to the temporary container
	// Note: mount returns the component instance, which we can ignore here
	mount( Component, {
		target: container,
		props: props,
	} );

	// 3. Force all pending Svelte updates to run synchronously.
	// This is crucial to ensure the component is fully rendered before extracting HTML.
	flushSync();

	// 4. Extract the inner HTML
	const htmlString = container.innerHTML;

	// Optional: Clean up the component instance to prevent memory leaks
	// The 'mount' utility returns an instance which can be destroyed,
	// but for simple components, simply returning the container and letting
	// it get garbage collected is often sufficient. For safety/cleanliness:
	// const app = mount(...)
	// ...
	// app.$destroy(); // if using Svelte 4 legacy API, for Svelte 5, the instance from `mount`
	// doesn't expose a public destroy method in the same way, but the temporary
	// element getting collected usually handles cleanup.

	return htmlString;
};
