<script lang="ts">
import type { IndieGameCard } from '../types';
import { T } from '../texts';
import { asUrls, imageUrl } from '../utils';
import Icon from './Icon.svelte';

interface Props {
	game : IndieGameCard;
}

let { game } : Props = $props();

const cover = $derived( asUrls( game.screenshots )[0] );
</script>

<a class="card" href={`/games/${game.id}`}>
	<div class="cover">
		{#if cover}
			<img src={imageUrl( cover )} alt="" loading="lazy" />
		{:else}
			<div class="placeholder"><Icon name="gamepad" size={44} /></div>
		{/if}
		{#if game.is_remix}
			<span class="tag"><Icon name="remix" size={12} /> {T.remix}</span>
		{/if}
	</div>
	<div class="body">
		<h3>{game.name}</h3>
		<p class="by">{T.by} <span class="author">{game.author_name ?? '?'}</span></p>
		<p class="stats">
			<span title={T.views}><Icon name="eye" size={15} /> {game.views ?? 0}</span>
			<span title={T.downloads}><Icon name="download" size={15} /> {game.downloads ?? 0}</span>
		</p>
	</div>
</a>

<style>
.card {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	color: var(--liwe3-text);
	text-decoration: none;
	background: var(--im-panel-bg, var(--liwe3-surface-raised));
	border: 1px solid var(--im-panel-border, var(--liwe3-border-subtle));
	border-radius: var(--liwe3-radius-md);
	transition:
		transform var(--liwe3-duration-base) var(--liwe3-ease-out),
		box-shadow var(--liwe3-duration-base) var(--liwe3-ease-out),
		border-color var(--liwe3-duration-base) var(--liwe3-ease-out);
}

.card:hover, .card:focus-visible {
	transform: translateY(-4px);
	border-color: var(--liwe3-primary);
	box-shadow: var(--im-glow-primary, var(--liwe3-shadow-lg));
	color: var(--liwe3-text);
}

.cover {
	position: relative;
	aspect-ratio: 16 / 9;
	overflow: hidden;
	background: var(--liwe3-surface-sunken);
}
.cover::after {
	content: "";
	position: absolute;
	inset: 0;
	background: linear-gradient(to top, var(--liwe3-surface-raised), transparent 55%);
	opacity: 0.85;
}
img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	transition: transform var(--liwe3-duration-slow) var(--liwe3-ease-out);
}
.card:hover img {
	transform: scale(1.06);
}
.placeholder {
	display: grid;
	place-items: center;
	height: 100%;
	color: var(--liwe3-text-subtle);
	background: linear-gradient(135deg, var(--liwe3-primary-subtle), var(--liwe3-secondary-subtle));
}

.tag {
	position: absolute;
	top: var(--liwe3-space-2);
	left: var(--liwe3-space-2);
	z-index: 1;
	display: inline-flex;
	align-items: center;
	gap: var(--liwe3-space-1);
	padding: 2px var(--liwe3-space-2);
	border: 1px solid var(--liwe3-secondary);
	border-radius: var(--liwe3-radius-full);
	background: var(--liwe3-surface);
	color: var(--liwe3-secondary);
	font-size: var(--liwe3-text-xs);
	font-weight: var(--liwe3-weight-semibold);
	letter-spacing: 0.1em;
	text-transform: uppercase;
}

.body {
	padding: var(--liwe3-space-3) var(--liwe3-space-4) var(--liwe3-space-4);
}
h3 {
	margin: 0 0 var(--liwe3-space-1);
	font-size: 0.95rem;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
.by {
	margin: 0 0 var(--liwe3-space-3);
	font-size: var(--liwe3-text-sm);
	color: var(--liwe3-text-muted);
}
.author {
	color: var(--liwe3-text);
}
.stats {
	margin: 0;
	display: flex;
	gap: var(--liwe3-space-4);
	font-size: var(--liwe3-text-sm);
	color: var(--liwe3-text-muted);
	font-variant-numeric: tabular-nums;
}
.stats span {
	display: inline-flex;
	align-items: center;
	gap: var(--liwe3-space-1);
}
</style>
