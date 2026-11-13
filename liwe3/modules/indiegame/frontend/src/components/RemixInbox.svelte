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
	margin: 0 0 var(--liwe3-space-6);
	padding: 0;
	display: grid;
	gap: var(--liwe3-space-2);
}
li {
	display: flex;
	flex-wrap: wrap;
	gap: var(--liwe3-space-3);
	align-items: center;
	padding: var(--liwe3-space-3) var(--liwe3-space-4);
	background: var(--im-panel-bg, var(--liwe3-surface-raised));
	border: 1px solid var(--im-panel-border, var(--liwe3-border-subtle));
	border-radius: var(--liwe3-radius-md);
}
.status {
	font-family: var(--im-font-mono, monospace);
	font-size: var(--liwe3-text-xs);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--liwe3-text-muted);
}
.reason {
	flex: 1;
	min-width: 12rem;
	color: var(--liwe3-text-muted);
}
.empty {
	color: var(--liwe3-text-muted);
}
</style>
