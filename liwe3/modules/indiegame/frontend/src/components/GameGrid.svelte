<script lang="ts">
import type { IndieGameCard } from '../types';
import { T } from '../texts';
import GameCard from './GameCard.svelte';
import Icon from './Icon.svelte';

interface Props {
	games : IndieGameCard[];
}

let { games } : Props = $props();
</script>

{#if games.length === 0}
	<div class="empty">
		<Icon name="gamepad" size={36} />
		<p>{T.noGames}</p>
	</div>
{:else}
	<div class="grid">
		{#each games as game (game.id)}
			<GameCard {game} />
		{/each}
	</div>
{/if}

<style>
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
	gap: var(--liwe3-space-5);
}
.empty {
	display: grid;
	justify-items: center;
	gap: var(--liwe3-space-2);
	padding: var(--liwe3-space-10, 3rem) var(--liwe3-space-4);
	color: var(--liwe3-text-muted);
	border: 1px dashed var(--liwe3-border);
	border-radius: var(--liwe3-radius-md);
}
.empty p {
	margin: 0;
}
</style>
