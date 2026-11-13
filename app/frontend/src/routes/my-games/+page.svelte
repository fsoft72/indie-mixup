<script lang="ts">
import { Icon, type IndieGameCard, type IndieGameDetail, RemixInbox, T, indiegame_del, indiegame_get, indiegame_mine } from '@frontend-modules/indiegame';
import { storeUser } from '@frontend-modules/user';
import { toastAdd } from '@liwe3/webcomponents-svelte';
import GameForm from '../../lib/GameForm.svelte';

let games : IndieGameCard[] = $state( [] );
let editing = $state<IndieGameDetail | null>( null );

const load = async () => {
	const res = await indiegame_mine();
	games = res.data ?? [];
};

const edit = async ( id : string ) => {
	const res = await indiegame_get( { id } );
	editing = res.data ?? null;
};

const remove = async ( game : IndieGameCard ) => {
	if ( !window.confirm( `Delete "${game.name}"? Its remixes will keep the link and show it as removed.` ) ) return;

	const res = await indiegame_del( { id: game.id } );
	if ( !res.ok ) {
		toastAdd( { title: T.error, type: 'error', text: res.error?.message ?? T.error } );
		return;
	}

	await load();
};

const saved = async () => {
	editing = null;
	await load();
};

$effect( () => {
	if ( storeUser.isLoggedIn ) void load();
} );
</script>

<svelte:head><title>My games - Indie Mixup</title></svelte:head>

{#if !storeUser.isLoggedIn}
	<section class="im-panel gate">
		<p>Login with GitHub to see your games.</p>
		<a class="liwe3-btn liwe3-btn--primary" href="/login"><Icon name="github" size={18} /> Login with GitHub</a>
	</section>
{:else if editing}
	<p class="im-eyebrow">// edit</p>
	<h1>{editing.name}</h1>
	<GameForm game={editing} onsaved={saved} />
	<p><button class="liwe3-btn" onclick={() => ( editing = null )}>Cancel</button></p>
{:else}
	<p class="im-eyebrow">// your library</p>
	<h1>My <span class="im-neon">games</span></h1>

	{#if games.length === 0}
		<div class="im-empty">
			<p>{T.noGames}</p>
			<a class="liwe3-btn liwe3-btn--primary" href="/submit"><Icon name="plus" size={16} /> Submit your first game</a>
		</div>
	{/if}

	<ul class="list">
		{#each games as game (game.id)}
			<li class="im-panel">
				<a class="name" href={`/games/${game.id}`}>{game.name}</a>
				{#if game.is_remix}<span class="im-chip im-chip--remix"><Icon name="remix" size={12} /> {T.remix}</span>{/if}
				{#if game.status === 'hidden'}<span class="im-chip">hidden by a moderator</span>{/if}
				<span class="grow"></span>
				<button class="liwe3-btn" onclick={() => edit( game.id )}>Edit</button>
				<button class="liwe3-btn liwe3-btn--danger" onclick={() => remove( game )}>Delete</button>
			</li>
		{/each}
	</ul>

	<div class="im-section-title"></div>
	<RemixInbox />
{/if}

<style>
.gate {
	max-width: 30rem;
	display: grid;
	gap: var(--liwe3-space-4);
	justify-items: start;
}
.gate p {
	margin: 0;
}
.list {
	list-style: none;
	margin: var(--liwe3-space-5) 0 0;
	padding: 0;
	display: grid;
	gap: var(--liwe3-space-3);
}
.list li {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--liwe3-space-3);
	padding: var(--liwe3-space-3) var(--liwe3-space-4);
}
.name {
	font-weight: var(--liwe3-weight-semibold);
	font-size: var(--liwe3-text-lg);
}
.grow {
	flex: 1;
}
</style>
