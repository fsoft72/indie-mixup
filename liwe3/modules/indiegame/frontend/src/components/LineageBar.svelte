<script lang="ts">
import type { IndieLineageItem } from '../types';
import { T } from '../texts';
import Icon from './Icon.svelte';

interface Props {
	lineage : IndieLineageItem[];
	/** Name of the game the trail leads to */
	current : string;
}

let { lineage, current } : Props = $props();
</script>

{#if lineage.length > 0}
	<nav aria-label={T.remixTrail}>
		<p class="label"><Icon name="remix" size={14} /> {T.remixTrail}</p>
		<ol class="trail">
			{#each lineage as item (item.id)}
				<li>
					{#if item.state === 'ok'}
						<a class="step" href={`/games/${item.id}`}>{item.name}</a>
					{:else}
						<span class="step gone">{item.state === 'removed' ? T.removed : T.unavailable}</span>
					{/if}
					<span class="link" aria-hidden="true"><Icon name="arrow-right" size={14} /></span>
				</li>
			{/each}
			<li><span class="step current" aria-current="page">{current}</span></li>
		</ol>
	</nav>
{/if}

<style>
.label {
	margin: 0 0 var(--liwe3-space-2);
	display: flex;
	align-items: center;
	gap: var(--liwe3-space-2);
	font-family: var(--im-font-mono, monospace);
	font-size: var(--liwe3-text-xs);
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--liwe3-secondary);
}
.trail {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--liwe3-space-2);
}
li {
	display: inline-flex;
	align-items: center;
	gap: var(--liwe3-space-2);
}
.step {
	padding: var(--liwe3-space-1) var(--liwe3-space-3);
	border: 1px solid var(--liwe3-border);
	border-radius: var(--liwe3-radius-sm);
	background: var(--liwe3-surface-raised);
	color: var(--liwe3-text);
	text-decoration: none;
	font-size: var(--liwe3-text-sm);
}
a.step:hover {
	border-color: var(--liwe3-primary);
	color: var(--liwe3-primary);
	box-shadow: var(--im-glow-primary, none);
}
.step.gone {
	color: var(--liwe3-text-subtle);
	font-style: italic;
	border-style: dashed;
}
.step.current {
	border-color: var(--liwe3-secondary);
	background: var(--liwe3-secondary-subtle);
	box-shadow: var(--im-glow-secondary, none);
	font-weight: var(--liwe3-weight-semibold);
}
.link {
	color: var(--liwe3-text-subtle);
	display: inline-flex;
}
</style>
