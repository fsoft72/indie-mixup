<script lang="ts">
/**
 * DataGrid inline cell editor.
 *
 * Renders the input matching the field type (select / numeric / text), keeps
 * the typed and pasted text within the field constraints, and reports the end
 * of the edit through `onfinish` / `onkeydown`.
 */

import { clampNumeric, sanitizeText, spliceText } from './datagrid_edit';
import type { DataGridField, DataGridRow } from './datagrid_types';

interface Props {
	row : DataGridRow;
	field : DataGridField;
	/** index of the row in the current page, used to focus the cell from the grid */
	rowIndex : number;

	onfinish : ( event : Event ) => void;
	onkeydown : ( event : KeyboardEvent ) => void;
}

let { row, field, rowIndex, onfinish, onkeydown } : Props = $props();

const handleInput = ( event : Event ) => {
	const input = event.target as HTMLInputElement;
	input.value = sanitizeText( input.value, field );
};

const handlePaste = ( event : ClipboardEvent ) => {
	event.preventDefault();

	const input = event.target as HTMLInputElement;
	const value = sanitizeText( event.clipboardData?.getData( 'text' ) || '', field );
	const start = input.selectionStart || 0;
	const end = input.selectionEnd || 0;

	input.value = spliceText( input.value, value, start, end );
	input.setSelectionRange( start + value.length, start + value.length );
};

const handleNumericInput = ( event : Event ) => {
	const input = event.target as HTMLInputElement;
	const value = clampNumeric( input.valueAsNumber, field );

	if ( value !== null ) input.value = value.toString();
};

const handleNumericPaste = ( event : ClipboardEvent ) => {
	event.preventDefault();

	const input = event.target as HTMLInputElement;
	const value = clampNumeric( parseFloat( event.clipboardData?.getData( 'text' ) || '' ), field );

	if ( value !== null ) input.value = value.toString();
};
</script>

{#if field.options?.select}
	<!-- Use select input if selectOptions are provided -->
	<select
		value={row[field.name]}
		onblur={onfinish}
		onchange={onfinish}
		{onkeydown}
		data-row={rowIndex}
		data-field={field.name}
	>
		{#each field.options.select as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
{:else if field.type === 'number'}
	<input
		type="text"
		pattern="[0-9]*[.]?[0-9]*"
		value={row[field.name]}
		min={field.options?.min}
		max={field.options?.max}
		onblur={onfinish}
		{onkeydown}
		oninput={handleNumericInput}
		onpaste={handleNumericPaste}
		data-row={rowIndex}
		data-field={field.name}
	/>
{:else}
	<!-- Existing text input logic -->
	<input
		type="text"
		value={row[field.name]}
		onblur={onfinish}
		{onkeydown}
		oninput={handleInput}
		onpaste={handlePaste}
		data-row={rowIndex}
		data-field={field.name}
	/>
{/if}

<style>
input {
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

input:focus {
	outline: none;
	border-color: var(--liwe3-primary);
	box-shadow: 0 0 0 2px oklch(from var(--liwe3-primary) l c h / 0.2);
}

select {
	background-color: var(--liwe3-surface);
	color: var(--liwe3-text);
	border: 1px solid var(--liwe3-border);
	border-radius: var(--liwe3-radius-sm);
	padding: var(--liwe3-space-1) var(--liwe3-space-2);
	font-family: var(--liwe3-font-sans);
	font-size: var(--liwe3-text-sm);
}

select:focus {
	outline: none;
	border-color: var(--liwe3-primary);
}
</style>
