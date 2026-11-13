<script lang="ts">
import { toastAdd } from '@liwe3/webcomponents-svelte';
import { onMount } from 'svelte';
import { indiegame_get, indiegame_remix_answer, indiegame_remix_inbox } from '../actions';
import { T } from '../texts';
import type { IndieRemixReport } from '../types';

let reports : IndieRemixReport[] = $state( [] );
let names : Record<string, string> = $state( {} );
let loaded = $state( false );

const nameOf = ( id : string ) => names[id] ?? id;

const load = async () => {
	const res = await indiegame_remix_inbox();
	reports = res.data ?? [];

	for ( const id of new Set( reports.flatMap( ( r ) => [ r.id_game, r.id_original ] ) ) ) {
		if ( names[id] ) continue;

		const game = await indiegame_get( { id } );
		if ( game.ok && game.data ) names[id] = game.data.name;
	}

	loaded = true;
};

const answer = async ( id_report : string, accept : boolean ) => {
	const res = await indiegame_remix_answer( { id_report, accept } );

	if ( !res.ok ) {
		toastAdd( { title: T.error, type: 'error', text: res.error?.message ?? T.error } );
		return;
	}

	toastAdd( { title: T.inbox.answered, type: 'success', text: '' } );
	await load();
};

onMount( load );
</script>

<section>
	<h2>{T.inbox.title}</h2>
	{#if loaded && reports.length === 0}
		<p class="empty">{T.inbox.empty}</p>
	{/if}
	<ul>
		{#each reports as report (report.id)}
			<li>
				<a href={`/games/${report.id_game}`}>{nameOf( report.id_game )}</a>
				{T.inbox.isRemixOf}
				<a href={`/games/${report.id_original}`}>{nameOf( report.id_original )}</a>
				<span class="status">[{report.status}]</span>
				{#if report.status === 'pending'}
					<button class="liwe3-btn liwe3-btn--primary" onclick={() => answer( report.id, true )}>{T.inbox.accept}</button>
					<button class="liwe3-btn" onclick={() => answer( report.id, false )}>{T.inbox.contest}</button>
				{/if}
			</li>
		{/each}
	</ul>
</section>

<style>
ul {
	list-style: none;
	padding: 0;
}
li {
	padding: 0.5rem 0;
	border-bottom: 1px solid var(--liwe3-border, #ddd);
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	align-items: center;
}
.status {
	opacity: 0.7;
}
.empty {
	opacity: 0.7;
}
</style>
