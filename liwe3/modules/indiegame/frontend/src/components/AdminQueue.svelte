<script lang="ts">
import { toastAdd } from '@liwe3/webcomponents-svelte';
import { onMount } from 'svelte';
import { indiegame_admin_hide, indiegame_admin_remix_decide, indiegame_admin_report_close, indiegame_admin_reports } from '../actions';
import { T } from '../texts';
import type { IndieAdminReports } from '../types';

let queue : IndieAdminReports = $state( { reports: [], remix_reports: [] } );
let loaded = $state( false );

const load = async () => {
	const res = await indiegame_admin_reports();
	if ( res.data ) queue = res.data;
	loaded = true;
};

const run = async ( action : () => Promise<{ ok : boolean; error? : { message? : string } }> ) => {
	const res = await action();

	if ( !res.ok ) {
		toastAdd( { title: T.error, type: 'error', text: res.error?.message ?? T.error } );
		return;
	}

	toastAdd( { title: T.admin.done, type: 'success', text: '' } );
	await load();
};

onMount( load );
</script>

<section>
	<h2>{T.admin.reports}</h2>
	{#if loaded && queue.reports.length === 0}
		<p class="empty">{T.admin.empty}</p>
	{/if}
	<ul>
		{#each queue.reports as report (report.id)}
			<li>
				<a href={`/games/${report.id_game}`}>{report.id_game}</a>
				<span class="reason">{report.reason}</span>
				<button class="liwe3-btn liwe3-btn--danger" onclick={() => run( () => indiegame_admin_hide( { id: report.id_game, hidden: true } ) )}>{T.admin.hide}</button>
				<button class="liwe3-btn" onclick={() => run( () => indiegame_admin_report_close( { id_report: report.id } ) )}>{T.admin.close}</button>
			</li>
		{/each}
	</ul>

	<h2>{T.admin.remixReports}</h2>
	{#if loaded && queue.remix_reports.length === 0}
		<p class="empty">{T.admin.empty}</p>
	{/if}
	<ul>
		{#each queue.remix_reports as report (report.id)}
			<li>
				<a href={`/games/${report.id_game}`}>{report.id_game}</a>
				{T.inbox.isRemixOf}
				<a href={`/games/${report.id_original}`}>{report.id_original}</a>
				<button class="liwe3-btn liwe3-btn--primary" onclick={() => run( () => indiegame_admin_remix_decide( { id_report: report.id, confirm: true } ) )}>{T.admin.confirm}</button>
				<button class="liwe3-btn" onclick={() => run( () => indiegame_admin_remix_decide( { id_report: report.id, confirm: false } ) )}>{T.admin.reject}</button>
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
.reason {
	flex: 1;
	min-width: 12rem;
}
.empty {
	opacity: 0.7;
}
</style>
