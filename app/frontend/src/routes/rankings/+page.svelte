<script lang="ts">
import { type RankingRow, RankingTable, T, indiegame_ranking_developers, indiegame_ranking_games } from '@frontend-modules/indiegame';

type Tab = 'games_views' | 'games_downloads' | 'dev_originals' | 'dev_remixes';
type Window = 'all' | '30d' | '7d' | '1d';

const TABS : Tab[] = [ 'games_views', 'games_downloads', 'dev_originals', 'dev_remixes' ];
const WINDOWS : Window[] = [ 'all', '30d', '7d', '1d' ];
const COUNT_LABEL : Record<Tab, string> = {
	games_views: T.rankings.countViews,
	games_downloads: T.rankings.countDownloads,
	dev_originals: T.rankings.countGames,
	dev_remixes: T.rankings.countGames,
};

let tab : Tab = $state( 'games_views' );
let win : Window = $state( 'all' );
let rows : RankingRow[] = $state( [] );

const load = async ( current : Tab, window : Window ) => {
	if ( current === 'games_views' || current === 'games_downloads' ) {
		const res = await indiegame_ranking_games( { kind: current === 'games_views' ? 'views' : 'downloads', window, limit: 20 } );
		rows = ( res.data ?? [] ).map( ( r ) => ( { key: r.id, label: r.name, href: `/games/${r.id}`, count: r.count } ) );
		return;
	}

	const res = await indiegame_ranking_developers( { kind: current === 'dev_originals' ? 'originals' : 'remixes', window, limit: 20 } );
	rows = ( res.data ?? [] ).map( ( r ) => ( { key: r.id_user, label: r.author_name ?? r.id_user, href: `/developers/${r.id_user}`, count: r.count } ) );
};

$effect( () => {
	void load( tab, win );
} );
</script>

<svelte:head><title>Rankings - Indie Mixup</title></svelte:head>

<h1>Rankings</h1>

<div class="row" role="tablist">
	{#each TABS as t (t)}
		<button class="liwe3-btn" class:liwe3-btn--primary={tab === t} role="tab" aria-selected={tab === t} onclick={() => ( tab = t )}>{T.rankings[t]}</button>
	{/each}
</div>

<div class="row">
	{#each WINDOWS as w (w)}
		<button class="liwe3-btn" class:liwe3-btn--primary={win === w} onclick={() => ( win = w )}>{T.rankings.windows[w]}</button>
	{/each}
</div>

<RankingTable {rows} countLabel={COUNT_LABEL[tab]} />

<style>
.row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin: 0.75rem 0;
}
</style>
