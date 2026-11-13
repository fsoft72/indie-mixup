<script module lang="ts">
export type RankingRow = { key : string; label : string; href : string; count : number };
</script>

<script lang="ts">
import { T } from '../texts';
import Icon from './Icon.svelte';

interface Props {
	rows : RankingRow[];
	countLabel : string;
}

let { rows, countLabel } : Props = $props();

const top = $derived( Math.max( 1, ...rows.map( ( r ) => r.count ) ) );
</script>

{#if rows.length === 0}
	<div class="empty">
		<Icon name="trophy" size={36} />
		<p>{T.rankings.empty}</p>
	</div>
{:else}
	<ol class="board" aria-label={countLabel}>
		{#each rows as row, i (row.key)}
			<li class="row" class:podium={i < 3} data-place={i + 1}>
				<span class="place">{String( i + 1 ).padStart( 2, '0' )}</span>
				<a class="name" href={row.href}>{row.label}</a>
				<span class="meter" aria-hidden="true"><span style={`width: ${Math.max( 4, ( row.count / top ) * 100 )}%`}></span></span>
				<span class="count" title={countLabel}>{row.count}</span>
			</li>
		{/each}
	</ol>
{/if}

<style>
.board {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	gap: var(--liwe3-space-2);
}
.row {
	display: grid;
	grid-template-columns: 3rem minmax(0, 1.4fr) minmax(4rem, 1fr) 4rem;
	align-items: center;
	gap: var(--liwe3-space-4);
	padding: var(--liwe3-space-3) var(--liwe3-space-4);
	background: var(--im-panel-bg, var(--liwe3-surface-raised));
	border: 1px solid var(--im-panel-border, var(--liwe3-border-subtle));
	border-radius: var(--liwe3-radius-md);
}
.place {
	font-family: var(--im-font-display, inherit);
	font-weight: 900;
	font-size: 1.35rem;
	color: var(--liwe3-text-subtle);
}
.name {
	color: var(--liwe3-text);
	text-decoration: none;
	font-weight: var(--liwe3-weight-semibold);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.name:hover {
	color: var(--liwe3-primary);
}
.meter {
	height: 6px;
	border-radius: var(--liwe3-radius-full);
	background: var(--liwe3-surface-sunken);
	overflow: hidden;
}
.meter span {
	display: block;
	height: 100%;
	border-radius: inherit;
	background: var(--im-neon-gradient, var(--liwe3-primary));
}
.count {
	text-align: right;
	font-family: var(--im-font-mono, monospace);
	font-variant-numeric: tabular-nums;
	color: var(--liwe3-text);
}

.podium[data-place="1"] {
	border-color: var(--liwe3-warning);
	box-shadow: 0 0 22px color-mix(in oklch, var(--liwe3-warning) 28%, transparent);
}
.podium[data-place="1"] .place {
	color: var(--liwe3-warning);
}
.podium[data-place="2"] {
	border-color: var(--liwe3-info);
}
.podium[data-place="2"] .place {
	color: var(--liwe3-info);
}
.podium[data-place="3"] {
	border-color: var(--liwe3-secondary);
}
.podium[data-place="3"] .place {
	color: var(--liwe3-secondary);
}

.empty {
	display: grid;
	justify-items: center;
	gap: var(--liwe3-space-2);
	padding: 3rem var(--liwe3-space-4);
	color: var(--liwe3-text-muted);
	border: 1px dashed var(--liwe3-border);
	border-radius: var(--liwe3-radius-md);
}
.empty p {
	margin: 0;
}

@media (max-width: 40rem) {
	.row {
		grid-template-columns: 2.5rem minmax(0, 1fr) 3.5rem;
	}
	.meter {
		display: none;
	}
}
</style>
