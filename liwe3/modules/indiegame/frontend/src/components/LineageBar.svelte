<script lang="ts">
import type { IndieLineageItem } from '../types';
import { T } from '../texts';

interface Props {
	lineage : IndieLineageItem[];
	/** Name of the game the trail leads to */
	current : string;
}

let { lineage, current } : Props = $props();
</script>

{#if lineage.length > 0}
	<nav class="trail" aria-label={T.remixTrail}>
		{#each lineage as item (item.id)}
			{#if item.state === 'ok'}
				<a href={`/games/${item.id}`}>{item.name}</a>
			{:else if item.state === 'removed'}
				<span class="gone">{T.removed}</span>
			{:else}
				<span class="gone">{T.unavailable}</span>
			{/if}
			<span class="arrow" aria-hidden="true">→</span>
		{/each}
		<strong>{current}</strong>
	</nav>
{/if}

<style>
.trail {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.4rem;
	margin: 0.75rem 0;
}
.gone {
	opacity: 0.6;
	font-style: italic;
}
.arrow {
	opacity: 0.5;
}
</style>
