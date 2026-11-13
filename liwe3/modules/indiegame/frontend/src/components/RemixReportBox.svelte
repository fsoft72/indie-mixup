<script lang="ts">
import { toastAdd } from '@liwe3/webcomponents-svelte';
import { onMount } from 'svelte';
import { indiegame_mine, indiegame_remix_report } from '../actions';
import { T } from '../texts';
import type { IndieGameCard } from '../types';

interface Props {
	/** The game that may be a remix */
	idGame : string;
	/** Publication date of that game: only older games of the caller can be the original */
	createdAt : Date | string;
	onsent? : () => void;
}

let { idGame, createdAt, onsent } : Props = $props();

let candidates : IndieGameCard[] = $state( [] );
let loaded = $state( false );

onMount( async () => {
	const res = await indiegame_mine();
	const limit = new Date( createdAt ).getTime();

	candidates = ( res.data ?? [] ).filter( ( g ) => g.status === 'visible' && g.id !== idGame && new Date( g.created ).getTime() < limit );
	loaded = true;
} );

const claim = async ( idOriginal : string ) => {
	const res = await indiegame_remix_report( { id_game: idGame, id_original: idOriginal } );

	if ( !res.ok ) {
		toastAdd( { title: T.error, type: 'error', text: res.error?.message ?? T.error } );
		return;
	}

	toastAdd( { title: T.remixReportSent, type: 'success', text: '' } );
	onsent?.();
};
</script>

<div class="box">
	<p>{T.pickOriginal}</p>
	{#if loaded && candidates.length === 0}
		<p class="empty">{T.noOwnGames}</p>
	{/if}
	<ul>
		{#each candidates as game (game.id)}
			<li><button class="liwe3-btn" onclick={() => claim( game.id )}>{game.name}</button></li>
		{/each}
	</ul>
</div>

<style>
ul {
	list-style: none;
	padding: 0;
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}
.empty {
	opacity: 0.7;
}
</style>
