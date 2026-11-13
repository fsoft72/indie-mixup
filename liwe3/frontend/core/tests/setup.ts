import '@testing-library/jest-dom/vitest';

// jsdom does not implement the Web Animations API, but Svelte's `transition:`
// directives (fade, fly, etc.) call `Element.animate()` under the hood.
if ( !Element.prototype.animate ) {
	Element.prototype.animate = () =>
		( {
			finished: Promise.resolve(),
			cancel: () => {},
			play: () => {},
			pause: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
		} ) as unknown as Animation;
}
