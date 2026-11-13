<script module lang="ts">
export type {
	DataGridAction,
	DataGridButton,
	DataGridField,
	DataGridFieldExtra,
	DataGridRow,
} from './sub/datagrid_types';
</script>

<script lang="ts">
import { tick } from 'svelte';
import Button from './Button.svelte';
import Paginator from './Paginator.svelte';
import type { PaginatorButtons } from './Paginator.svelte';
import DataGridCell from './sub/DataGridCell.svelte';
import DataGridCellEditor from './sub/DataGridCellEditor.svelte';
import DataGridFieldsModal from './sub/DataGridFieldsModal.svelte';
import DataGridFilterRow from './sub/DataGridFilterRow.svelte';
import DataGridHeader from './sub/DataGridHeader.svelte';
import DataGridToolbar from './sub/DataGridToolbar.svelte';
import { sanitizeText } from './sub/datagrid_edit';
import { applyFilters } from './sub/datagrid_filter';
import type { DataGridFilters } from './sub/datagrid_filter';
import type {
	DataGridAction,
	DataGridButton,
	DataGridField,
	DataGridRow,
} from './sub/datagrid_types';
import type { Color, Size } from '../types/types';

interface Props {
	fields : DataGridField[];
	data : DataGridRow[];
	actions? : DataGridAction[];
	buttons? : DataGridButton[];

	filters? : Record<string, any>;

	title? : string; // DataGrid title
	mode? : Color;
	viewMode? : string;

	// paginator
	disablePaginator? : boolean;
	rowsPerPage? : number;
	page? : number;
	totalRows? : number;
	paginatorButtons? : PaginatorButtons;

	// events
	oncelledit? : (
		row : DataGridRow,
		field : string,
		oldValue : any,
		newValue : any,
	) => void;

	onfilterchange? : ( filters : Record<string, any> ) => void;
	onsortchange? : ( field : string, direction : 'asc' | 'desc' ) => void;

	// fired whenever the internally filtered row set changes, with the rows the
	// grid is currently showing (before pagination). Not fired when the caller
	// takes over filtering through `onfilterchange`.
	onrowsfiltered? : ( rows : DataGridRow[] ) => void;

	keyboardInputTimeout? : any;

	// paginator event
	onpagechange? : ( page : number, rows : number ) => void;
}

let {
	fields: _fields,
	data = $bindable( [] ),
	filters = $bindable( {} ),
	actions,
	buttons,
	title,
	mode = $bindable( 'accent' ),
	viewMode = $bindable( 'comfy' ),

	// paginator
	disablePaginator,
	page = $bindable( 1 ),
	totalRows,
	rowsPerPage = $bindable( 10 ),
	paginatorButtons,

	// events
	oncelledit,
	onfilterchange,
	onsortchange,
	onrowsfiltered,
	keyboardInputTimeout,

	// paginator event
	onpagechange,
} : Props = $props();

let sortField : string | null = $state( null );
let sortDirection : 'asc' | 'desc' = $state( 'asc' );
let tableElement : HTMLTableElement | null = $state( null );
let editingCell : { rowIndex : number; field : string } | null = $state( null );
// svelte-ignore state_referenced_locally (local mutable copy of the fields prop for column reorder/hide/resize)
let fields = $state( _fields );
let has_filters = $derived( fields.some( ( f ) => f.filterable ) );
let dataView : HTMLDivElement | null = $state( null );
let paginator : any = $state( null );
let buttonSize : Size = $state( 'md' );
let dontSendPaginationChange : boolean = $state( false );

let showFieldsModal = $state( false );

// scroll the rows back to the top when the user changes page. `prevPage` is a
// plain variable (not $state): the effect runs once on mount with the initial
// page, and back then that first run scrolled the view for no reason.
let prevPage : number | null = null;

$effect( () => {
	const current = page;

	if ( prevPage === current ) return;

	const wasMount = prevPage === null;
	prevPage = current;

	if ( !wasMount ) dataView?.scrollTo( 0, 0 );
} );

let internalFilteredData : DataGridRow[] = $derived.by( () => {
	// if user defined onfilterchange, we don't filter the data
	if ( onfilterchange ) return data;

	return applyFilters( data, filters, fields );
} );

// notify the caller whenever the filtered row set changes
$effect( () => {
	onrowsfiltered?.( internalFilteredData );
} );

let paginatedData : DataGridRow[] = $derived.by( () => {
	if ( disablePaginator ) return internalFilteredData;

	return internalFilteredData.slice(
		( page - 1 ) * rowsPerPage,
		page * rowsPerPage,
	);
} );

/** Rows indexed by id, to avoid a linear scan on every edit event. */
let rowsById : Map<string, DataGridRow> = $derived(
	new Map( data.map( ( row ) => [ row.id, row ] ) ),
);

let totRows = $derived.by( () => {
	if ( totalRows ) return totalRows;

	return internalFilteredData.length;
} );

function sortData( field : string ) : void {
	const fieldDef = fields.find( ( f ) => f.name === field );
	if ( !fieldDef || !fieldDef.sortable ) return; // Only sort if field is sortable

	if ( sortField === field ) {
		sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
	} else {
		sortField = field;
		sortDirection = 'asc';
	}

	onsortchange?.( field, sortDirection );

	// Sort a copy: `data` is a $bindable prop, mutating it in place with
	// Array.prototype.sort() would reorder the caller's own array by reference.
	if ( fieldDef.type === 'number' ) {
		data = [ ...data ].sort( ( a, b ) => {
			const va = parseFloat( a[field] );
			const vb = parseFloat( b[field] );

			if ( va < vb ) return sortDirection === 'asc' ? -1 : 1;
			if ( va > vb ) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		} );
	} else {
		data = [ ...data ].sort( ( a, b ) => {
			if ( a[field] < b[field] ) return sortDirection === 'asc' ? -1 : 1;
			if ( a[field] > b[field] ) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		} );
	}
}

async function startEditing(
	rowIndex : number,
	fieldName : string,
) : Promise<void> {
	const fieldDef = fields.find( ( f ) => f.name === fieldName );
	if ( fieldDef?.editable ) {
		editingCell = { rowIndex, field: fieldName };

		await tick();

		const element = tableElement?.querySelector(
			`[data-row="${rowIndex}"][data-field="${fieldName}"]`,
		) as HTMLInputElement | HTMLSelectElement | null;

		if ( element ) {
			element.focus();
			if ( element instanceof HTMLInputElement ) {
				element.select();
			}
		}
	}
}

function handleTabKey(
	id_row : string,
	event : KeyboardEvent,
	rowIndex : number,
	fieldIndex : number,
) : void {
	event.preventDefault();
	const currentField = fields[fieldIndex];
	finishEditing( id_row, currentField.name, event );

	const nextEditableField = findNextEditableField( rowIndex, fieldIndex );
	if ( nextEditableField ) {
		setTimeout( () => {
			startEditing(
				nextEditableField.rowIndex,
				fields[nextEditableField.fieldIndex].name,
			);
		}, 50 );
	}
}

function findNextEditableField(
	currentRowIndex : number,
	currentFieldIndex : number,
) : { rowIndex : number; fieldIndex : number } | null {
	for ( let rowIndex = currentRowIndex; rowIndex < data.length; rowIndex++ ) {
		for (
			let fieldIndex = rowIndex === currentRowIndex ? currentFieldIndex + 1 : 0;
			fieldIndex < fields.length;
			fieldIndex++
		) {
			if ( fields[fieldIndex].editable && !fields[fieldIndex].hidden ) {
				return { rowIndex, fieldIndex };
			}
		}
	}
	return null;
}

function finishEditing( id_row : string, field : string, event : Event ) : void {
	const row = rowsById.get( id_row );
	if ( !row ) return;

	const element = event.target as HTMLInputElement | HTMLSelectElement;
	let newValue = element.value;
	const oldValue = row[field];
	const fieldDef = fields.find( ( f ) => f.name === field );

	if ( fieldDef?.type === 'select' ) {
		if ( !fieldDef?.options?.select?.length ) {
			console.warn( '=== WARN: select field must have options', fieldDef.name );
			return;
		}
	}

	if ( fieldDef ) newValue = sanitizeText( newValue, fieldDef );

	if ( newValue !== oldValue?.toString() ) {
		const updatedRow = { ...row, [field]: newValue };

		// look the row up by id: the position in `data` is not the position in the
		// page, and sorting / filtering can have moved the row since the edit started
		const rowIndex = data.findIndex( ( r ) => r.id === id_row );
		if ( rowIndex == -1 ) return;

		data[rowIndex] = updatedRow;

		oncelledit?.( updatedRow, field, oldValue, newValue );
	}

	editingCell = null;
}

/**
 * Commits the toggle of a boolean cell.
 *
 * @param row - the row the cell belongs to
 * @param field - the toggled field
 * @param checked - the new checked state
 */
function toggleBool( row : DataGridRow, field : DataGridField, checked : boolean ) : void {
	row[field.name] = checked;

	oncelledit?.( row, field.name, !checked, checked );

	if ( field.onclick ) field.onclick( row );
}

function handleKeyDown(
	event : KeyboardEvent,
	id_row : string,
	field : string,
	rowIndex : number,
	fieldIndex : number,
) : void {
	const row = rowsById.get( id_row );
	if ( !row ) return;

	if ( event.key === 'Enter' ) {
		finishEditing( row.id, field, event );
	} else if ( event.key === 'Escape' ) {
		editingCell = null;
	} else if ( event.key === 'Tab' ) {
		handleTabKey( id_row, event, rowIndex, fieldIndex );
	}
}

/**
 * Applies a new view mode, scaling the row action buttons with it.
 *
 * @param mode - the new view mode
 */
const changeViewMode = ( mode : string ) => {
	viewMode = mode;

	if ( mode === 'condensed' ) {
		buttonSize = 'xs';
	} else if ( mode === 'comfy' ) {
		buttonSize = 'md';
	} else {
		buttonSize = 'lg';
	}
};

const _do_filter = ( filters : Record<string, any> ) => {
	dontSendPaginationChange = true;
	paginator && paginator.resetPage();
	if ( onfilterchange ) onfilterchange( filters );
};

/**
 * Applies the filters coming from the filter row.
 *
 * @param new_filters - the complete new filters object
 */
const filters_change = ( new_filters : DataGridFilters ) => {
	filters = new_filters;

	_do_filter( filters );
};

const internalPageChange = ( page_ : number, rows : number ) => {
	if ( onpagechange && !dontSendPaginationChange ) {
		onpagechange( page_, rows );
		dontSendPaginationChange = false;
		return;
	}

	dontSendPaginationChange = false;

	page = page_;
};
</script>

{#snippet renderActions(
	actions : DataGridAction[] | undefined,
	row : DataGridRow,
)}
	{#if actions && actions.length > 0}
		<td class="actions-cell">
			<div class="actions">
				{#each actions as action}
					{#if !( typeof action.hide === 'function' ? action.hide( row ) : action.hide )}
						<Button
							size={buttonSize}
							mode={action.mode || mode}
							variant={action.variant}
							icon={action.icon}
							onclick={() => action.onclick && action.onclick( row )}
						>{action.label ?? ''}</Button>
					{/if}
				{/each}
			</div>
		</td>
	{/if}
{/snippet}

<div class="dg-container form-container">
	<div class="dg-header">
		{#if title || buttons}
			<DataGridToolbar
				{title}
				{buttons}
				{mode}
				{viewMode}
				onviewmodechange={changeViewMode}
				onshowfields={() => ( showFieldsModal = true )}
			/>
		{/if}
	</div>
	<div class="dg-body">
		<div bind:this={dataView} class="dataview">
			<table bind:this={tableElement} class={viewMode}>
				<thead>
					<DataGridHeader
						{fields}
						{sortField}
						{sortDirection}
						hasActions={!!actions?.length}
						onsort={sortData}
					/>
					{#if has_filters}
						<DataGridFilterRow
							{fields}
							{filters}
							{mode}
							{keyboardInputTimeout}
							hasActions={!!actions?.length}
							onchange={filters_change}
						/>
					{/if}
				</thead>
				<tbody>
					{#each paginatedData as row, rowIndex}
						<tr>
							{#each fields as field}
								{#if !field.hidden}
									<td
										ondblclick={() => startEditing( rowIndex, field.name )}
										style:text-align={field.align}
										class:editable={field.editable}
									>
										{#if editingCell && editingCell.rowIndex === rowIndex && editingCell.field === field.name}
											<DataGridCellEditor
												{row}
												{field}
												{rowIndex}
												onfinish={( e ) => finishEditing( row.id, field.name, e )}
												onkeydown={( e ) => handleKeyDown( e, row.id, field.name, rowIndex, fields.indexOf( field ) )}
											/>
										{:else}
											<DataGridCell {row} {field} {mode} onbooltoggle={toggleBool} />
										{/if}
									</td>
								{/if}
							{/each}
							{@render renderActions( actions, row )}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	{#if !disablePaginator}
		<div class="dg-footer">
			<Paginator
				bind:this={paginator}
				total={totRows}
				rows={rowsPerPage}
				onpagechange={internalPageChange}
				buttons={paginatorButtons}
			/>
		</div>
	{/if}
</div>

{#if showFieldsModal}
	<DataGridFieldsModal {fields} onclose={() => ( showFieldsModal = false )} />
{/if}

<style>
:root {
	--table-font-size: var(--liwe3-text-sm);
	--table-font-color: var(--liwe3-text);
	--table-font-family: var(--liwe3-font-sans);
}

.dg-container {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 250px;
	border: 1px solid var(--liwe3-border);
	border-radius: var(--liwe3-radius-md);
	overflow: hidden;
	width: 100%;
	background-color: var(--liwe3-surface);
	color: var(--liwe3-text);
	font-family: var(--table-font-family);
	font-size: var(--table-font-size);
}

.dg-header {
	flex: 0 0 auto;
	background-color: var(--liwe3-surface-sunken);
	z-index: 2;
}

.dg-body {
	flex: 1 1 auto;
	overflow: auto;
	position: relative;
}

.dataview {
	height: 100%;
	scrollbar-width: thin;
	scrollbar-color: var(--liwe3-border) var(--liwe3-surface-sunken);
}

.actions {
	display: flex;
	flex-direction: row;
	gap: var(--liwe3-space-2);
}

table {
	width: 100%;
	border-collapse: separate;
	border-spacing: 0;
	border-radius: var(--liwe3-radius-md);
}

thead {
	position: sticky;
	top: 0;
	z-index: 1;
	background-color: var(--liwe3-surface-sunken);
}

.dg-footer {
	flex: 0 0 auto;
	background-color: var(--liwe3-surface-sunken);
	z-index: 2;
	border-top: 1px solid var(--liwe3-border-subtle);
}

.full-width,
.condensed,
.comfy,
.large {
	width: 100%;
	min-width: 100%;
}

.condensed td {
	padding: var(--liwe3-space-1);
	font-size: var(--liwe3-text-xs);
}

.comfy td {
	padding: var(--liwe3-space-2) var(--liwe3-space-3);
	font-size: var(--liwe3-text-sm);
}

.large td {
	padding: var(--liwe3-space-4) var(--liwe3-space-3);
	font-size: var(--liwe3-text-base);
}

tr {
	border-bottom: 1px solid var(--liwe3-border-subtle);
	max-height: 2rem;
	transition: background-color var(--liwe3-duration-fast) var(--liwe3-ease-out);
}

tr:hover {
	background-color: var(--liwe3-hover-overlay) !important;
}

td {
	text-align: left;
	border-right: 1px solid var(--liwe3-border-subtle);
	border-bottom: 1px solid var(--liwe3-border-subtle);
	color: var(--liwe3-text);
}

.actions-cell {
	width: 1%;
	white-space: nowrap;
}

tbody tr:nth-child(even) {
	background-color: var(--liwe3-surface-sunken);
}

td.editable {
	cursor: pointer;
	position: relative;
	padding-left: 1.5rem;
}

td.editable::before {
	content: "";
	position: absolute;
	top: 0.2rem;
	right: 0.2rem;
	width: 0.7rem;
	height: 0.7rem;
	background-image: url("data:image/svg+xml;utf8,<svg data-slot=\"icon\" fill=\"none\" stroke-width=\"1.5\" stroke=\"currentColor\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\"> <path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10\"></path> </svg>");
	background-size: contain;
	background-repeat: no-repeat;
	color: var(--liwe3-text-muted);
}

table.condensed td.editable::before {
	top: 0.5rem;
}
</style>
