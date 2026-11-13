<script lang="ts">
import { Icon, type RankingRow, RankingTable, T, indiegame_ranking_developers, indiegame_ranking_games } from '@frontend-modules/indiegame';

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

<p class="im-eyebrow">// leaderboards</p>
<h1><Icon name="trophy" size={34} /> <span class="im-neon">Rankings</span></h1>

<div class="tabs" role="tablist" aria-label="Ranking">
	{#each TABS as t (t)}
		<button class="tab" role="tab" aria-selected={tab === t} onclick={() => ( tab = t )}>{T.rankings[t]}</button>
	{/each}
</div>

<div class="windows" role="group" aria-label="Time window">
	{#each WINDOWS as w (w)}
		<button class="pill" aria-pressed={win === w} onclick={() => ( win = w )}>{T.rankings.windows[w]}</button>
	{/each}
</div>

<RankingTable {rows} countLabel={COUNT_LABEL[tab]} />

<style>
h1 {
	display: flex;
	align-items: center;
	gap: var(--liwe3-space-3);
}

.tabs {
	display: flex;
	flex-wrap: wrap;
	gap: var(--liwe3-space-1);
	margin: var(--liwe3-space-4) 0;
	border-bottom: 1px solid var(--im-panel-border);
}
.tab {
	padding: var(--liwe3-space-3) var(--liwe3-space-4);
	border: 0;
	border-bottom: 2px solid transparent;
	margin-bottom: -1px;
	background: none;
	color: var(--liwe3-text-muted);
	font: inherit;
	font-size: var(--liwe3-text-sm);
	font-weight: var(--liwe3-weight-semibold);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	cursor: pointer;
}
.tab:hover {
	color: var(--liwe3-text);
}
.tab[aria-selected="true"] {
	color: var(--liwe3-primary);
	border-bottom-color: var(--liwe3-primary);
	text-shadow: 0 0 14px color-mix(in oklch, var(--liwe3-primary) 55%, transparent);
}

.windows {
	display: flex;
	flex-wrap: wrap;
	gap: var(--liwe3-space-2);
	margin-bottom: var(--liwe3-space-5);
}
.pill {
	padding: var(--liwe3-space-1) var(--liwe3-space-4);
	border: 1px solid var(--liwe3-border);
	border-radius: var(--liwe3-radius-full);
	background: var(--im-panel-bg);
	color: var(--liwe3-text-muted);
	font: inherit;
	font-size: var(--liwe3-text-sm);
	cursor: pointer;
}
.pill:hover {
	border-color: var(--liwe3-primary);
	color: var(--liwe3-text);
}
.pill[aria-pressed="true"] {
	border-color: var(--liwe3-secondary);
	background: var(--liwe3-secondary-subtle);
	color: var(--liwe3-secondary);
	box-shadow: var(--im-glow-secondary);
}
</style>
