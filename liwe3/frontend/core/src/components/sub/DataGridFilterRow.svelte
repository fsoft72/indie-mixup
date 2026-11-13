<script lang="ts">
/**
 * DataGrid filter row.
 *
 * Renders one filter input per filterable field and reports the complete new
 * filters object upwards through `onchange`. All the state it needs lives in
 * the component, so two DataGrids on the same page never interfere (the old
 * implementation looked the sibling range input up with `document.querySelector`
 * by input name).
 */

import Checkbox from '../Checkbox.svelte';
import Input from '../Input.svelte';
import type { Color } from '../../types/types';
import { filterModes } from '../../utils/match_filter';
import { toBool } from '../../utils/utils';
import { buildFilters, removeFilter } from './datagrid_filter';
import type { DataGridFilters } from './datagrid_filter';
import type { DataGridField } from './datagrid_types';

interface Props {
	fields : DataGridField[];
	filters : DataGridFilters;
	mode? : Color;
	/** ms to wait after the last keypress before filtering; falsy disables it */
	keyboardInputTimeout? : number;
	/** true when the grid has an actions column, to keep the row aligned */
	hasActions? : boolean;

	onchange : ( filters : DataGridFilters ) => void;
}

let {
	fields,
	filters,
	mode = 'accent',
	keyboardInputTimeout,
	hasActions = false,
	onchange,
} : Props = $props();

/** Field types rendered as a two inputs (from / to) range filter. */
const RANGE_TYPES = [ 'date', 'datetime-local', 'time', 'number' ];
const BOOL_TYPES = [ 'bool', 'boolean', 'checkbox' ];

let kiTimeout : any = null;

/**
 * Both ends of every range filter, keyed by field name.
 * Seeded from the `filters` prop (a range filter is stored as `"from|to"`) so
 * the inputs always show the filter currently in effect, and updated as the
 * user types so a half filled range does not need a DOM lookup to be read back.
 */
// svelte-ignore state_referenced_locally (one-time seed from the incoming filters, kept in sync by the handlers below)
let ranges : Record<string, { v1 : string; v2 : string }> = $state(
	_rangesFromFilters( filters ),
);

/**
 * Splits the `"from|to"` values of the active filters into input pairs.
 *
 * @param filters - the active filters
 * @returns the range ends keyed by field name
 */
function _rangesFromFilters( filters : DataGridFilters ) : Record<string, { v1 : string; v2 : string }> {
	const res : Record<string, { v1 : string; v2 : string }> = {};

	for ( const name in filters ) {
		const value = filters[name]?.value;
		if ( typeof value !== 'string' || value.indexOf( '|' ) == -1 ) continue;

		const [ v1, v2 ] = value.split( '|' );
		res[name] = { v1, v2 };
	}

	return res;
}

/**
 * Sets (or clears) the filter of a single field and reports it upwards.
 *
 * @param field - the field being filtered
 * @param value - the new filter value; an empty value clears the filter
 * @param searchMode - filter mode, defaults to the field `searchMode` or CONTAINS
 */
const _setFilter = ( field : DataGridField, value : any, searchMode? : filterModes ) => {
	onchange( buildFilters( filters, field.name, {
		mode: searchMode || field.searchMode || filterModes.CONTAINS,
		value,
		type: field.type || 'string',
	} ) );
};

const filter_change = ( e : Event, field : DataGridField ) => {
	_setFilter( field, ( e.target as HTMLInputElement ).value );
};

const filter_oninput = ( e : Event, field : DataGridField ) => {
	if ( !keyboardInputTimeout ) return;

	// if the user stops inserting chars, the filter is applied
	const value = ( e.target as HTMLInputElement ).value;
	clearTimeout( kiTimeout );
	kiTimeout = setTimeout( () => _setFilter( field, value ), keyboardInputTimeout );
};

const filter_change_checkbox = ( e : Event, field : DataGridField ) => {
	const input = e.target as HTMLInputElement;

	// only checkboxes set to true take part in the filtering
	if ( !toBool( input.checked ) ) return onchange( removeFilter( filters, field.name ) );

	_setFilter( field, true, field.searchMode || filterModes.EQUAL );
};

/**
 * Updates one end of a range filter.
 * The filter is applied when both ends are filled, and cleared as soon as one
 * of them is emptied.
 *
 * @param e - the input event
 * @param field - the field being filtered
 * @param which - which end of the range changed
 */
const filter_change_range = ( e : Event, field : DataGridField, which : 'v1' | 'v2' ) => {
	const value = ( e.target as HTMLInputElement ).value;
	const range = { ...( ranges[field.name] ?? { v1: '', v2: '' } ), [which]: value };

	ranges[field.name] = range;

	if ( !range.v1 || !range.v2 ) return onchange( removeFilter( filters, field.name ) );

	_setFilter( field, `${range.v1}|${range.v2}`, field.searchMode || filterModes.BETWEEN );
};
</script>

<tr class="filter" style="background-color: var(--liwe3-surface-raised)">
	{#each fields as field}
		{#if !field.hidden}
			<td class="filter" style={`width: ${field.width || 'min-content'};`}>
				{#if field.filterable}
					{#if field.options?.filterSelect}
						<select
							name={`f_${field.name}`}
							onchange={( e ) => filter_change( e, field )}
							value={filters[field.name]?.value}
							class="filter-select"
						>
							{#if field.options?.filterSelectShowSelect}
								<option value="">(Select)</option>
							{/if}
							{#each field.options.filterSelect as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					{:else if field.type == 'string' || field.type == 'text'}
						<Input
							{mode}
							width={field.width}
							size="xs"
							name={`f_${field.name}`}
							onchange={( e : Event ) => filter_change( e, field )}
							oninput={( e : Event ) => filter_oninput( e, field )}
							value={filters[field.name]?.value}
						/>
					{:else if RANGE_TYPES.indexOf( field.type ) != -1}
						<Input
							{mode}
							size="xs"
							type={field.type}
							name={`f_${field.name}_1`}
							value={ranges[field.name]?.v1 ?? ''}
							onchange={( e : Event ) => filter_change_range( e, field, 'v1' )}
						/>
						<Input
							{mode}
							size="xs"
							type={field.type}
							name={`f_${field.name}_2`}
							value={ranges[field.name]?.v2 ?? ''}
							onchange={( e : Event ) => filter_change_range( e, field, 'v2' )}
						/>
					{:else if BOOL_TYPES.indexOf( field.type ) != -1}
						<Checkbox
							{mode}
							name={`f_${field.name}`}
							size="xs"
							onchange={( e : Event ) => filter_change_checkbox( e, field )}
							checked={toBool( filters[field.name]?.value )}
						/>
					{/if}
				{/if}
			</td>
		{/if}
	{/each}
	{#if hasActions}
		<td></td>
	{/if}
</tr>

<style>
.filter {
	vertical-align: top;
}

.filter-select {
	width: 100%;
	box-sizing: border-box;
	padding: var(--liwe3-space-1) var(--liwe3-space-2);
	background-color: var(--liwe3-surface);
	color: var(--liwe3-text);
	border: 1px solid var(--liwe3-border);
	border-radius: var(--liwe3-radius-sm);
	font-family: var(--liwe3-font-sans);
	font-size: var(--liwe3-text-sm);
}

.filter-select:focus {
	outline: none;
	border-color: var(--liwe3-primary);
}
</style>
