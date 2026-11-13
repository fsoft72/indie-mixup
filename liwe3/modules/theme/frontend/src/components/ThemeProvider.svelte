<!-- liwe3/modules/theme/frontend/src/components/ThemeProvider.svelte -->
<script lang="ts">
import { onMount } from 'svelte';
import { themeStore } from '../runtime/store.svelte';
import type { Density, Variant } from '../runtime/persist';

interface Props {
	/** CSS parts to load via <link> tags */
	parts? : string[];
	/**
	 * Extra CSS files to load after `parts`, outside the `theme` folder.
	 * Each entry is either a path relative to `/static` (e.g. `custom/app.css`)
	 * or an absolute/external URL (e.g. `/custom/app.css`, `https://.../app.css`).
	 */
	extras? : string[];
	/** Initial variant (overridden by stored preference) */
	variant? : Variant;
	/** Initial density */
	density? : Density;
	/** Initial brand */
	brand? : string;
	children? : import('svelte').Snippet;
}

let {
	parts = [ 'tokens', 'base', 'typography', 'components', 'utilities' ],
	extras = [],
	variant,
	density,
	brand,
	children,
} : Props = $props();

/** Resolves an extra CSS entry to a usable href: absolute/external paths are kept as-is, others are treated as relative to `/static`. */
const resolveExtraHref = ( path : string ) : string => {
	if ( /^([a-z]+:)?\/\//i.test( path ) || path.startsWith( '/' ) ) return path;
	return `/${path}`;
};

onMount( () => {
	// Initialize the store effects in component context
	themeStore.init();

	// Apply props if provided
	if ( variant ) themeStore.setVariant( variant );
	if ( density ) themeStore.setDensity( density );
	if ( brand ) themeStore.setBrand( brand );
} );
</script>

<svelte:head>
	{#each parts as part}
		<link rel="stylesheet" href={`/theme/${part}.css`} />
	{/each}
	{#each extras as extra}
		<link rel="stylesheet" href={resolveExtraHref( extra )} />
	{/each}
</svelte:head>

{@render children?.()}
