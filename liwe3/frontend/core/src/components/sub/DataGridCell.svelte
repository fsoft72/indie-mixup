<script lang="ts">
/**
 * DataGrid read only cell content: everything the grid renders for a cell that
 * is not being edited (custom renderer, boolean, clickable value, date, pre,
 * avatar, plain value). The `<td>` itself stays in the grid.
 */

import Avatar from '../Avatar.svelte';
import Button from '../Button.svelte';
import Checkbox from '../Checkbox.svelte';
import type { Color } from '../../types/types';
import { format_date, safeHTML, toBool } from '../../utils/utils';
import type { DataGridField, DataGridRow } from './datagrid_types';

interface Props {
	row : DataGridRow;
	field : DataGridField;
	mode? : Color;

	/** called when a boolean cell is toggled, with the new checked state */
	onbooltoggle : ( row : DataGridRow, field : DataGridField, checked : boolean ) => void;
}

let { row, field, mode = 'accent', onbooltoggle } : Props = $props();

const BOOL_TYPES = [ 'bool', 'boolean', 'checkbox' ];
</script>

{#if field.render}
	{#if field.onclick}
		<Button mode="neutral" size="sm" onclick={() => field.onclick && field.onclick( row )}>
			{@html safeHTML( field.render( row[field.name], row ) )}
		</Button>
	{:else}
		{@html safeHTML( field.render( row[field.name], row ) )}
	{/if}
{:else if BOOL_TYPES.includes( field.type )}
	<Checkbox
		{mode}
		checked={toBool( row[field.name] )}
		size="xs"
		onchange={( e : any ) => onbooltoggle( row, field, e.target.checked )}
	/>
{:else if field.onclick}
	<Button mode="neutral" size="sm" onclick={() => field.onclick && field.onclick( row )}>
		{row[field.name]}
	</Button>
{:else if field.type == 'date'}
	{#if field.extra?.dateFormat}
		{format_date( row[field.name], field.extra.dateFormat )}
	{:else}
		{row[field.name]}
	{/if}
{:else if field.pre}
	<pre>{row[field.name]}</pre>
{:else if field.type == 'avatar'}
	<Avatar size="64px" value={row} />
{:else}
	{row[field.name]}
{/if}
