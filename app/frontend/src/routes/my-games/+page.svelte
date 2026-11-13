<script lang="ts">
import { type IndieGameCard, type IndieGameDetail, RemixInbox, T, indiegame_del, indiegame_get, indiegame_mine } from '@frontend-modules/indiegame';
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
	<p>Login with GitHub to see your games. <a href="/login">Login</a></p>
{:else if editing}
	<h1>Edit {editing.name}</h1>
	<GameForm game={editing} onsaved={saved} />
	<p><button class="liwe3-btn" onclick={() => ( editing = null )}>Cancel</button></p>
{:else}
	<h1>My games</h1>
	{#if games.length === 0}<p>{T.noGames} <a href="/submit">Submit your first game</a></p>{/if}
	<ul class="list">
		{#each games as game (game.id)}
			<li>
				<a href={`/games/${game.id}`}>{game.name}</a>
				{#if game.status === 'hidden'}<span class="hidden">hidden by a moderator</span>{/if}
				<button class="liwe3-btn" onclick={() => edit( game.id )}>Edit</button>
				<button class="liwe3-btn liwe3-btn--danger" onclick={() => remove( game )}>Delete</button>
			</li>
		{/each}
	</ul>
	<RemixInbox />
{/if}

<style>
.list {
	list-style: none;
	padding: 0;
}
.list li {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	align-items: center;
	padding: 0.4rem 0;
	border-bottom: 1px solid #8884;
}
.hidden {
	opacity: 0.7;
	font-style: italic;
}
</style>
