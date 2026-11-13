<script lang="ts">
import type { IndieGameCard } from '../types';
import { T } from '../texts';
import { asUrls, imageUrl } from '../utils';

interface Props {
	game : IndieGameCard;
}

let { game } : Props = $props();

const cover = $derived( asUrls( game.screenshots )[0] );
</script>

<a class="card" href={`/games/${game.id}`}>
	{#if cover}
		<img src={imageUrl( cover )} alt={game.name} loading="lazy" />
	{:else}
		<div class="placeholder"></div>
	{/if}
	<div class="body">
		<h3>{game.name}</h3>
		<p class="meta">
			{#if game.is_remix}<span class="badge">{T.remix}</span>{/if}
			{T.by} {game.author_name ?? '?'}
		</p>
		<p class="meta">{game.views ?? 0} {T.views} · {game.downloads ?? 0} {T.downloads}</p>
	</div>
</a>

<style>
.card {
	display: flex;
	flex-direction: column;
	border: 1px solid var(--liwe3-border, #ddd);
	border-radius: 0.5rem;
	overflow: hidden;
	color: inherit;
	text-decoration: none;
	background: var(--liwe3-surface, transparent);
}
.card:hover {
	box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
}
img, .placeholder {
	width: 100%;
	aspect-ratio: 16 / 9;
	object-fit: cover;
	background: #8884;
}
.body {
	padding: 0.75rem;
}
h3 {
	margin: 0 0 0.25rem;
	font-size: 1.05rem;
}
.meta {
	margin: 0;
	font-size: 0.85rem;
	opacity: 0.75;
}
.badge {
	border: 1px solid currentcolor;
	border-radius: 0.75rem;
	padding: 0 0.4rem;
	margin-right: 0.3rem;
	font-size: 0.75rem;
}
</style>
