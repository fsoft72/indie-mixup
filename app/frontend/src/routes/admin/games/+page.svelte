<script lang="ts">
import { has_perm } from '@frontend/liwe3';
import { indiegame_admin_hide, indiegame_admin_reports, indiegame_list } from '@frontend-modules/indiegame';
import type { IndieGameCard } from '@frontend-modules/indiegame';
import { storeUser } from '@frontend-modules/user';
import { toastAdd } from '@liwe3/webcomponents-svelte';
import { onMount } from 'svelte';

const PAGE_SIZE = 50;

let visible : IndieGameCard[] = $state( [] );
let hidden : IndieGameCard[] = $state( [] );
let query = $state( '' );
let page = $state( 1 );
let loaded = $state( false );

const canModerate = $derived( has_perm( storeUser.user, 'indiegame.moderate' ) || has_perm( storeUser.user, 'system.admin' ) );

/** Loads the visible games (paginated, filtered by `query`) and the hidden ones. */
const load = async () => {
	const [ list, reports ] = await Promise.all( [
		indiegame_list( { q: query || undefined, page, limit: PAGE_SIZE } ),
		indiegame_admin_reports(),
	] );

	visible = list.data ?? [];
	hidden = reports.data?.hidden_games ?? [];
	loaded = true;
};

/** Hides or restores a game, then reloads the lists. */
const setHidden = async ( game : IndieGameCard, value : boolean ) => {
	const res = await indiegame_admin_hide( { id: game.id, hidden: value } );

	if ( !res.ok ) {
		toastAdd( { title: 'Error', type: 'error', text: res.error?.message ?? 'Operation failed' } );
		return;
	}

	toastAdd( { title: 'Done', type: 'success', text: '' } );
	await load();
};

const search = ( ev : Event ) => {
	ev.preventDefault();
	page = 1;
	load();
};

const goPage = ( delta : number ) => {
	page = Math.max( 1, page + delta );
	load();
};

onMount( () => {
	if ( storeUser.isLoggedIn && canModerate ) load();
} );
</script>

<svelte:head><title>Games - Indie Mixup</title></svelte:head>

<p class="im-eyebrow">// control room</p>
<h1>Games</h1>

{#if !storeUser.isLoggedIn}
	<p>Login required. <a href="/login">Login</a></p>
{:else if !canModerate}
	<div class="liwe3-alert--error">You do not have the permission to manage the games.</div>
{:else}
	<form onsubmit={search}>
		<input type="search" placeholder="Search by name" bind:value={query} />
		<button class="liwe3-btn" type="submit">Search</button>
	</form>

	<h2>Visible</h2>
	{#if loaded && visible.length === 0}<p class="im-muted">No games.</p>{/if}
	<ul>
		{#each visible as game (game.id)}
			<li>
				<a href={`/games/${game.id}`}>{game.name}</a>
				<span class="im-muted">{game.author_name ?? game.id_user}</span>
				<button class="liwe3-btn liwe3-btn--danger" onclick={() => setHidden( game, true )}>Hide</button>
			</li>
		{/each}
	</ul>
	<button class="liwe3-btn" disabled={page <= 1} onclick={() => goPage( -1 )}>Previous</button>
	<span>Page {page}</span>
	<button class="liwe3-btn" disabled={visible.length < PAGE_SIZE} onclick={() => goPage( 1 )}>Next</button>

	<h2>Hidden</h2>
	{#if loaded && hidden.length === 0}<p class="im-muted">No hidden games.</p>{/if}
	<ul>
		{#each hidden as game (game.id)}
			<li>
				<a href={`/games/${game.id}`}>{game.name}</a>
				<span class="im-muted">{game.author_name ?? game.id_user}</span>
				<button class="liwe3-btn liwe3-btn--primary" onclick={() => setHidden( game, false )}>Restore</button>
			</li>
		{/each}
	</ul>
{/if}
