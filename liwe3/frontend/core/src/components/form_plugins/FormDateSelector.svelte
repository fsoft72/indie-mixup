<script lang="ts">
import { DateSelector } from '@liwe3/webcomponents-svelte';
import type { FormField } from '../FormCreator.svelte';

interface Props {
	field : FormField;

	name : string;

	// dependency injection
	_v : ( field : FormField ) => any;

	// events
	onchange : ( name : string, value : any, field : FormField ) => void;

	// extra
	[key : string] : any;
}

let { field, name, onchange, _v, ...props } : Props = $props();

// Get the current value
const currentValue = $derived.by( () => {
	const val = _v( field );
	return val ?? ( field?.extra?.rangeMode ? { start: null, end: null } : null );
} );

// Handle date selection
const handleDateSelected = ( date : string ) => {
	onchange( name, date, field );
};

// Handle range selection
const handleRangeSelected = ( range : { start : string | null; end : string | null } ) => {
	onchange( name, range, field );
};
</script>

<div class="form-date-selector">
	{#if field?.label}
		<label for={name} class="label">{field.label}</label>
	{/if}
	<DateSelector
		rangeMode={field?.extra?.rangeMode ?? false}
		selectedDate={!field?.extra?.rangeMode ? currentValue : null}
		selectedRange={field?.extra?.rangeMode ? currentValue : { start: null, end: null }}
		ondateselected={handleDateSelected}
		onrangeselected={handleRangeSelected}
		{...field?.extra ?? {}}
		{...props}
	/>
</div>

<style>
.form-date-selector {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.label {
	font-size: 0.8rem;
	font-weight: 500;
	user-select: none;
}
</style>
