<script lang="ts">
import type { IndieGameCard } from '../types';
import { T } from '../texts';
import GameCard from './GameCard.svelte';

interface Props {
	games : IndieGameCard[];
}

let { games } : Props = $props();
</script>

{#if games.length === 0}
	<p class="empty">{T.noGames}</p>
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
	grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
	gap: 1rem;
}
.empty {
	opacity: 0.7;
}
</style>
