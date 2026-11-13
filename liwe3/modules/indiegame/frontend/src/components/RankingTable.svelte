<script lang="ts">
import { T } from '../texts';

export type RankingRow = { key : string; label : string; href : string; count : number };

interface Props {
	rows : RankingRow[];
	countLabel : string;
}

let { rows, countLabel } : Props = $props();
</script>

{#if rows.length === 0}
	<p class="empty">{T.rankings.empty}</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>#</th>
				<th></th>
				<th>{countLabel}</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i (row.key)}
				<tr>
					<td>{i + 1}</td>
					<td><a href={row.href}>{row.label}</a></td>
					<td class="count">{row.count}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
table {
	width: 100%;
	border-collapse: collapse;
}
th, td {
	padding: 0.4rem 0.6rem;
	text-align: left;
	border-bottom: 1px solid var(--liwe3-border, #ddd);
}
.count {
	text-align: right;
	font-variant-numeric: tabular-nums;
}
.empty {
	opacity: 0.7;
}
</style>
