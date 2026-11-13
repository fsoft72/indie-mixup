<!-- liwe3/modules/theme/frontend/src/components/ThemeScope.svelte -->
<script lang="ts">
import type { ThemeName } from '../tokens/themes';
import type { Density } from '../runtime/persist';

interface Props {
	/** Theme variant for this subtree */
	variant? : ThemeName;
	/** Brand name for this subtree */
	brand? : string;
	/** Density for this subtree */
	density? : Density;
	/** CSS class on the wrapper div */
	class? : string;
	children? : import('svelte').Snippet;
}

let { variant, brand, density, class: className, children } : Props = $props();
</script>

<div
	data-theme={variant}
	data-brand={brand}
	data-density={density}
	class={className}
>
	{@render children?.()}
</div>
