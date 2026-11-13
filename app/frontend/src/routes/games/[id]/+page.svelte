<script lang="ts">
import { page } from '$app/state';
import {
	GameGrid,
	Icon,
	type IndieGameDetail,
	LineageBar,
	RemixReportBox,
	ReportBox,
	T,
	asUrls,
	formatDate,
	imageUrl,
	indiegame_get,
	indiegame_track,
	youtubeEmbed,
} from '@frontend-modules/indiegame';
import { storeUser } from '@frontend-modules/user';

type Panel = 'none' | 'report' | 'remix';

let game = $state<IndieGameDetail | null>( null );
let error = $state( '' );
let panel : Panel = $state( 'none' );
let active = $state( 0 );

const load = async ( id : string ) => {
	panel = 'none';
	active = 0;

	const res = await indiegame_get( { id } );
	if ( !res.ok || !res.data ) {
		game = null;
		error = res.error?.message ?? T.error;
		return;
	}

	game = res.data;
	error = '';
	void indiegame_track( { id_game: id, kind: 'view' } );
};

$effect( () => {
	void load( page.params.id ?? '' );
} );

// The window is opened right away (a popup blocker would stop it after an await), the download is counted in the background
const download = () => {
	if ( !game ) return;

	window.open( game.repo_url, '_blank', 'noopener' );
	void indiegame_track( { id_game: game.id, kind: 'download' } );
};

const toggle = ( target : Panel ) => {
	panel = panel === target ? 'none' : target;
};

const images = $derived( [ ...asUrls( game?.screenshots ), ...asUrls( game?.gallery ) ] );
const videos = $derived( asUrls( game?.video_urls ) );
const isAuthor = $derived( !!game && storeUser.user.id === game.id_user );
</script>

<svelte:head><title>{game?.name ?? 'Game'} - Indie Mixup</title></svelte:head>

{#if error}
	<div class="liwe3-alert--error">{error}</div>
	<p><a href="/">Back to the catalog</a></p>
{:else if game}
	<p class="im-eyebrow">// {game.is_remix ? 'remix' : 'original game'}</p>
	<h1>{game.name}</h1>

	<LineageBar lineage={game.lineage ?? []} current={game.name} />

	<div class="layout">
		<div class="main">
			{#if images.length}
				<figure class="stage im-panel">
					<img src={imageUrl( images[active] ?? images[0] )} alt={`${game.name}, image ${active + 1} of ${images.length}`} />
				</figure>
				{#if images.length > 1}
					<ul class="thumbs" aria-label="Images">
						{#each images as url, i (url)}
							<li>
								<button class="thumb" aria-pressed={i === active} aria-label={`Show image ${i + 1}`} onclick={() => ( active = i )}>
									<img src={imageUrl( url )} alt="" loading="lazy" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}

			<section class="im-panel about">
				<h2>About</h2>
				<p class="description">{game.description}</p>
			</section>

			{#if videos.length}
				<section class="videos">
					<h2>Gameplay</h2>
					{#each videos as url (url)}
						{#if youtubeEmbed( url )}
							<iframe title={`Gameplay of ${game.name}`} src={youtubeEmbed( url )} allowfullscreen loading="lazy"></iframe>
						{:else}
							<a href={url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={14} /> {url}</a>
						{/if}
					{/each}
				</section>
			{/if}
		</div>

		<aside class="side im-panel" aria-label="Game details">
			<dl class="facts">
				<div>
					<dt>Developer</dt>
					<dd><a href={`/developers/${game.id_user}`}>{game.author_name ?? '?'}</a></dd>
				</div>
				<div>
					<dt>Published</dt>
					<dd>{formatDate( game.created )}</dd>
				</div>
				<div>
					<dt>{T.views}</dt>
					<dd><Icon name="eye" size={15} /> {game.views ?? 0}</dd>
				</div>
				<div>
					<dt>{T.downloads}</dt>
					<dd><Icon name="download" size={15} /> {game.downloads ?? 0}</dd>
				</div>
			</dl>

			<button class="liwe3-btn liwe3-btn--primary cta" onclick={download}><Icon name="download" size={18} /> {T.download}</button>
			<p class="hint"><Icon name="github" size={14} /> {T.downloadHint}</p>

			{#if isAuthor}<a class="liwe3-btn liwe3-btn--ghost" href="/my-games">Edit this game</a>{/if}

			<div class="more">
				{#if storeUser.isLoggedIn}
					{#if !isAuthor && !game.is_remix}
						<button class="liwe3-btn" aria-expanded={panel === 'remix'} onclick={() => toggle( 'remix' )}><Icon name="remix" size={16} /> {T.isRemixOfMine}</button>
					{/if}
					<button class="liwe3-btn liwe3-btn--ghost" aria-expanded={panel === 'report'} onclick={() => toggle( 'report' )}><Icon name="flag" size={16} /> {T.report}</button>
					{#if panel === 'remix'}
						<RemixReportBox idGame={game.id} createdAt={game.created} onsent={() => ( panel = 'none' )} />
					{:else if panel === 'report'}
						<ReportBox idGame={game.id} onsent={() => ( panel = 'none' )} />
					{/if}
				{:else}
					<p class="hint">{T.loginToReport} <a href="/login">Login</a></p>
				{/if}
			</div>
		</aside>
	</div>

	{#if game.remixes?.length}
		<div class="im-section-title"><h2>{T.remixesOfThis}</h2></div>
		<GameGrid games={game.remixes} />
	{/if}
{/if}

<style>
.layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 21rem;
	gap: var(--liwe3-space-6);
	align-items: start;
	margin-top: var(--liwe3-space-5);
}
.main {
	display: grid;
	gap: var(--liwe3-space-5);
	min-width: 0;
}

.stage {
	margin: 0;
	padding: var(--liwe3-space-1);
}
.stage img {
	display: block;
	width: 100%;
	aspect-ratio: 16 / 9;
	object-fit: cover;
	border-radius: var(--liwe3-radius-sm);
	background: var(--liwe3-surface-sunken);
}

.thumbs {
	list-style: none;
	margin: calc(var(--liwe3-space-3) * -1) 0 0;
	padding: 0;
	display: flex;
	gap: var(--liwe3-space-2);
	overflow-x: auto;
}
.thumb {
	padding: 0;
	border: 2px solid var(--liwe3-border-subtle);
	border-radius: var(--liwe3-radius-sm);
	background: none;
	cursor: pointer;
	opacity: 0.7;
	transition: opacity var(--liwe3-duration-fast), border-color var(--liwe3-duration-fast);
}
.thumb img {
	display: block;
	width: 7rem;
	aspect-ratio: 16 / 9;
	object-fit: cover;
}
.thumb:hover {
	opacity: 1;
}
.thumb[aria-pressed="true"] {
	opacity: 1;
	border-color: var(--liwe3-primary);
	box-shadow: var(--im-glow-primary);
}

.description {
	white-space: pre-wrap;
	margin: 0;
	color: var(--liwe3-text-muted);
	font-size: var(--liwe3-text-lg);
	line-height: var(--liwe3-leading-relaxed);
}
.about h2 {
	margin-bottom: var(--liwe3-space-3);
}

.videos {
	display: grid;
	gap: var(--liwe3-space-3);
}
iframe {
	width: 100%;
	aspect-ratio: 16 / 9;
	border: 1px solid var(--im-panel-border);
	border-radius: var(--liwe3-radius-md);
	background: var(--liwe3-surface-sunken);
}

.side {
	position: sticky;
	top: 5.5rem;
	display: grid;
	gap: var(--liwe3-space-4);
}
.facts {
	margin: 0;
	display: grid;
	gap: var(--liwe3-space-3);
}
.facts div {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: var(--liwe3-space-3);
	padding-bottom: var(--liwe3-space-3);
	border-bottom: 1px solid var(--liwe3-border-subtle);
}
.facts dt {
	font-family: var(--im-font-mono);
	font-size: var(--liwe3-text-xs);
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: var(--liwe3-text-muted);
}
.facts dd {
	margin: 0;
	display: inline-flex;
	align-items: center;
	gap: var(--liwe3-space-1);
	font-weight: var(--liwe3-weight-semibold);
	font-variant-numeric: tabular-nums;
}

.cta {
	width: 100%;
	min-height: 3.25rem;
	font-size: var(--liwe3-text-base);
	box-shadow: var(--im-glow-primary);
}
.hint {
	margin: 0;
	display: flex;
	align-items: center;
	gap: var(--liwe3-space-2);
	font-size: var(--liwe3-text-sm);
	color: var(--liwe3-text-muted);
}
.more {
	display: grid;
	gap: var(--liwe3-space-3);
}

@media (max-width: 62rem) {
	.layout {
		grid-template-columns: minmax(0, 1fr);
	}
	.side {
		position: static;
		order: -1;
	}
}
</style>
