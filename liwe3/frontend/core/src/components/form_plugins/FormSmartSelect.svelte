<script lang="ts">
import { SmartSelect } from '@liwe3/webcomponents-svelte';
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

// Get the current value - can be string or string[] for multiple mode
const currentValue = $derived.by( () => {
	const val = _v( field );
	return val ?? ( field?.extra?.multiple ? [] : '' );
} );
</script>

<div class="form-smart-select">
	{#if field?.label}
		<label for={name} class="label">{field.label}</label>
	{/if}
	<SmartSelect
		value={currentValue}
		options={field?.options ?? []}
		placeholder={field?.placeholder ?? 'Select an option'}
		multiple={field?.extra?.multiple ?? false}
		searchable={field?.extra?.searchable ?? false}
		disabled={field?.extra?.disabled ?? false}
		{...field?.extra ?? {}}
		{...props}
		onchange={( val : string | string[] | undefined ) => onchange( name, val, field )}
	/>
</div>

<style>
.form-smart-select {
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
