<script lang="ts">
import { FormCreator, type FormField } from '@frontend/liwe3';
import { GameGrid, type IndieGameCard, indiegame_list } from '@frontend-modules/indiegame';
import { onMount } from 'svelte';

const PAGE_SIZE = 24;
const SEARCH_DELAY_MS = 300;

let games : IndieGameCard[] = $state( [] );
let search = $state( '' );
let page = $state( 1 );
let hasMore = $state( false );
let loading = $state( false );
let timer : ReturnType<typeof setTimeout> | undefined;

const fields : FormField[] = [
	{ name: 'q', label: 'Search by name', type: 'text', col: 12 },
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

<svelte:head><title>Indie Mixup</title></svelte:head>

<h1>Indie games</h1>
<FormCreator {fields} onchange={onSearch} showButtons={false} padding="0" />
<GameGrid {games} />
{#if hasMore}
	<p><button class="liwe3-btn" disabled={loading} onclick={more}>Load more</button></p>
{/if}
