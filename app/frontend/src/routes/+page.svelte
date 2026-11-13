<script lang="ts">
import { FormCreator, type FormField } from '@frontend/liwe3';
import { GameGrid, Icon, type IndieGameCard, indiegame_list } from '@frontend-modules/indiegame';
import { onMount } from 'svelte';
import { env } from '$env/dynamic/public';

/** Hero video, stored in R2 under the `site` folder of the system domain */
const HERO_VIDEO_URL = `${env.PUBLIC_LIWE_SERVER ?? ''}/api/upload/get?key=${encodeURIComponent( 'site|indiemixup.mp4' )}`;

const PAGE_SIZE = 24;
const SEARCH_DELAY_MS = 300;

let games : IndieGameCard[] = $state( [] );
let search = $state( '' );
let page = $state( 1 );
let hasMore = $state( false );
let loading = $state( false );
let timer : ReturnType<typeof setTimeout> | undefined;

const fields : FormField[] = [
	{ name: 'q', label: 'Search by name', type: 'text', placeholder: 'Type a game name...', col: 12 },
];

const load = async ( reset : boolean ) => {
	loading = true;
	if ( reset ) page = 1;

	const res = await indiegame_list( { q: search || undefined, page, limit: PAGE_SIZE } );
	const rows = res.data ?? [];

	games = reset ? rows : [ ...games, ...rows ];
	hasMore = rows.length === PAGE_SIZE;
	loading = false;
};

const onSearch = ( name : string, value : unknown ) => {
	if ( name !== 'q' ) return;

	search = String( value ?? '' );
	clearTimeout( timer );
	timer = setTimeout( () => load( true ), SEARCH_DELAY_MS );
};

const more = () => {
	page += 1;
	return load( false );
};

onMount( () => load( true ) );
</script>

<svelte:head><title>Indie Mixup - free indie games and remixes</title></svelte:head>

<section class="hero">
	<div class="copy">
		<p class="im-eyebrow">// open source indie games</p>
		<h1>Play. <span class="im-neon">Remix.</span><br />Mix it up.</h1>
		<p class="lead">Download free indie games straight from their GitHub repos, fork the idea and publish your own remix. Every remix keeps the trail back to the original.</p>
		<div class="cta">
			<a class="liwe3-btn liwe3-btn--primary im-cta" href="/submit"><Icon name="plus" size={16} /> Submit a game</a>
			<a class="liwe3-btn" href="/rankings"><Icon name="trophy" size={16} /> See the rankings</a>
		</div>
	</div>
	<div class="art">
		<video src={HERO_VIDEO_URL} autoplay muted loop playsinline preload="auto" disablepictureinpicture tabindex="-1" aria-label="Indie Mixup video"></video>
	</div>
</section>

<section aria-labelledby="fresh">
	<div class="im-section-title">
		<h2 id="fresh">Fresh drops</h2>
	</div>
	<div class="search"><FormCreator {fields} onchange={onSearch} showButtons={false} padding="0" /></div>
	<GameGrid {games} />
	{#if hasMore}
		<p class="more"><button class="liwe3-btn" disabled={loading} onclick={more}>Load more</button></p>
	{/if}
</section>

<style>
.hero {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 32rem);
	align-items: center;
	gap: var(--liwe3-space-8);
	padding: var(--liwe3-space-8) 0 var(--liwe3-space-6);
}
.copy {
	max-width: 42rem;
}
.art {
	position: relative;
	aspect-ratio: 16 / 9;
	overflow: hidden;
	border-radius: var(--liwe3-radius-lg);
	border: 1px solid var(--im-panel-border);
	background: var(--liwe3-surface-sunken);
	box-shadow: 0 0 40px color-mix(in oklch, var(--liwe3-secondary) 30%, transparent);
}
.art video {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	border: 0;
	object-fit: cover;
	pointer-events: none;
}
@media (max-width: 52rem) {
	.hero {
		grid-template-columns: minmax(0, 1fr);
	}
}
.hero h1 {
	font-size: clamp(2.2rem, 6vw, 4rem);
	margin-bottom: var(--liwe3-space-4);
	text-shadow: 0 0 40px color-mix(in oklch, var(--liwe3-primary) 25%, transparent);
}
.lead {
	font-size: var(--liwe3-text-lg);
	color: var(--liwe3-text-muted);
	max-width: 40rem;
	margin: 0 0 var(--liwe3-space-6);
}
.cta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--liwe3-space-3);
}
.search {
	max-width: 28rem;
	margin-bottom: var(--liwe3-space-5);
}
.more {
	text-align: center;
	margin-top: var(--liwe3-space-6);
}
</style>
