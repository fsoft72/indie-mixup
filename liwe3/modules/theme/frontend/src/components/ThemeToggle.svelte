<!-- liwe3/modules/theme/frontend/src/components/ThemeToggle.svelte -->
<script lang="ts">
import { themeStore } from '../runtime/store.svelte';
import type { Variant } from '../runtime/persist';

interface Props {
	class? : string;
}

let { class: className } : Props = $props();

const variants : Variant[] = [ 'light', 'dark', 'system' ];

function cycle() {
	const current = variants.indexOf( themeStore.variant );
	const next = variants[( current + 1 ) % variants.length];
	themeStore.setVariant( next );
}

const labels : Record<Variant, string> = {
	light: 'Light mode',
	dark: 'Dark mode',
	system: 'System preference',
	'high-contrast': 'High contrast',
};
</script>

<button
	class="liwe3-btn liwe3-btn--ghost {className || ''}"
	onclick={cycle}
	aria-label={labels[themeStore.variant]}
	title={labels[themeStore.variant]}
>
	{#if themeStore.variant === 'light'}
		<span aria-hidden="true">&#9788;</span>
	{:else if themeStore.variant === 'dark'}
		<span aria-hidden="true">&#9790;</span>
	{:else}
		<span aria-hidden="true">&#9729;</span>
	{/if}
</button>
