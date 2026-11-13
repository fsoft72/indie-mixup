<script lang="ts">
import { page } from '$app/state';
import {
	GameGrid,
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

const load = async ( id : string ) => {
	panel = 'none';

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

const videos = $derived( asUrls( game?.video_urls ) );
const isAuthor = $derived( !!game && storeUser.user.id === game.id_user );
</script>

<svelte:head><title>{game?.name ?? 'Game'} - Indie Mixup</title></svelte:head>

{#if error}
	<p class="liwe3-alert--error">{error}</p>
{:else if game}
	<h1>{game.name}</h1>
	<p class="meta">
		{T.by} <a href={`/developers/${game.id_user}`}>{game.author_name ?? '?'}</a>
		· {formatDate( game.created )} · {game.views ?? 0} {T.views} · {game.downloads ?? 0} {T.downloads}
	</p>

	<LineageBar lineage={game.lineage ?? []} current={game.name} />

	<p>
		<button class="liwe3-btn liwe3-btn--primary" onclick={download} title={T.downloadHint}>{T.download}</button>
		{#if isAuthor}<a href="/my-games">Edit</a>{/if}
	</p>

	<p class="description">{game.description}</p>

	<section class="media">
		{#each asUrls( game.screenshots ) as url (url)}
			<img src={imageUrl( url )} alt={`Screenshot of ${game.name}`} />
		{/each}
		{#each asUrls( game.gallery ) as url (url)}
			<img src={imageUrl( url )} alt={`Gallery image of ${game.name}`} />
		{/each}
	</section>

	{#if videos.length}
		<section class="videos">
			{#each videos as url (url)}
				{#if youtubeEmbed( url )}
					<iframe title={`Gameplay of ${game.name}`} src={youtubeEmbed( url )} allowfullscreen></iframe>
				{:else}
					<a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
				{/if}
			{/each}
		</section>
	{/if}

	{#if game.remixes?.length}
		<h2>{T.remixesOfThis}</h2>
		<GameGrid games={game.remixes} />
	{/if}

	<section class="actions">
		{#if storeUser.isLoggedIn}
			{#if !isAuthor && !game.is_remix}
				<button class="liwe3-btn" onclick={() => toggle( 'remix' )}>{T.isRemixOfMine}</button>
			{/if}
			<button class="liwe3-btn" onclick={() => toggle( 'report' )}>{T.report}</button>
			{#if panel === 'remix'}
				<RemixReportBox idGame={game.id} createdAt={game.created} onsent={() => ( panel = 'none' )} />
			{:else if panel === 'report'}
				<ReportBox idGame={game.id} onsent={() => ( panel = 'none' )} />
			{/if}
		{:else}
			<p class="hint">{T.loginToReport} <a href="/login">Login</a></p>
		{/if}
	</section>
{/if}

<style>
.meta, .hint {
	opacity: 0.75;
}
.description {
	white-space: pre-wrap;
}
.media {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
	gap: 0.75rem;
	margin: 1rem 0;
}
.media img {
	width: 100%;
	border-radius: 0.5rem;
}
.videos {
	display: grid;
	gap: 0.75rem;
	margin: 1rem 0;
}
iframe {
	width: 100%;
	max-width: 48rem;
	aspect-ratio: 16 / 9;
	border: 0;
}
.actions {
	margin: 1.5rem 0;
}
</style>
