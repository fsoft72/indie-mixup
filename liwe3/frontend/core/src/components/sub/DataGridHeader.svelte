<script lang="ts">
/**
 * DataGrid header row: column labels, sort indicator and column resizers.
 * Sorting itself stays in the grid, this component only reports the clicked column.
 */

import type { DataGridField } from './datagrid_types';

interface Props {
	fields : DataGridField[];
	sortField? : string | null;
	sortDirection? : 'asc' | 'desc';
	/** true when the grid has an actions column */
	hasActions? : boolean;

	onsort : ( field : string ) => void;
}

let {
	fields,
	sortField = null,
	sortDirection = 'asc',
	hasActions = false,
	onsort,
} : Props = $props();

/**
 * Drag handler of a column resizer: follows the mouse until it is released.
 *
 * @param e - the mousedown event on the resizer
 */
function startResize( e : MouseEvent ) : void {
	e.preventDefault();
	const startX = e.clientX;
	const th = ( e.target as HTMLElement ).closest( 'th' ) as HTMLTableCellElement;
	const startWidth = th.offsetWidth;

	function onMouseMove( e : MouseEvent ) : void {
		const width = startWidth + e.clientX - startX;
		th.style.width = `${width}px`;
	}

	function onMouseUp() : void {
		document.removeEventListener( 'mousemove', onMouseMove );
		document.removeEventListener( 'mouseup', onMouseUp );
	}

	document.addEventListener( 'mousemove', onMouseMove );
	document.addEventListener( 'mouseup', onMouseUp );
}
</script>

<tr>
	{#each fields as field}
		{#if !field.hidden}
			<th onclick={() => onsort( field.name )}>
				{field.label || field.name}
				{#if field.sortable && sortField === field.name}
					{sortDirection === 'asc' ? '▲' : '▼'}
				{/if}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="resizer" onmousedown={startResize}></div>
			</th>
		{/if}
	{/each}
	{#if hasActions}
		<th class="actions-header">Actions</th>
	{/if}
</tr>

<style>
tr:hover {
	background-color: var(--liwe3-surface-sunken) !important;
}

th {
	text-align: left;
	padding: var(--liwe3-space-2) var(--liwe3-space-3);
	font-weight: var(--liwe3-weight-medium);
	color: var(--liwe3-text);
	background-color: var(--liwe3-surface-sunken);
	border-bottom: 1px solid var(--liwe3-border-subtle);
	cursor: pointer;
	position: relative;
	user-select: none;
}

.resizer {
	position: absolute;
	right: 0;
	top: 0;
	height: 100%;
	width: 5px;
	background: var(--liwe3-border);
	cursor: col-resize;
	opacity: 0;
	transition: opacity var(--liwe3-duration-fast) var(--liwe3-ease-out);
}

th:hover .resizer {
	opacity: 1;
}

.actions-header {
	width: 1%;
	white-space: nowrap;
}
</style>
