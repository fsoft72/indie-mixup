<script module lang="ts">
export interface SvelteItem {
	label : string;
	value : string;
}
</script>

<script lang="ts">
import Button from './Button.svelte';
import { XCircle } from 'svelte-hero-icons';

interface SelectProps {
	name : string;
	items : SvelteItem[] | string[];
	value : string | string[];
	placeholder? : string;
	readonly? : boolean;
	multiple? : boolean;
	dropdownOnly? : boolean;

	onchange? : ( value : string | string[] ) => void;
}

let {
	name = '',
	items = [],
	value = $bindable( '' ),
	placeholder = '',
	readonly = false,
	multiple = false,
	dropdownOnly = false,
	onchange,
} : SelectProps = $props();

let showClear : boolean = $derived( !readonly && value !== '' );

const get = ( obj : any, path : string ) => {
	if ( typeof obj === 'string' ) return obj;

	return obj[path];
};

const clear = () => {
	value = '';
	onchange && onchange( value );
};

const selectChange = ( e : any ) => {
	value = e.target.value;
	onchange && onchange( value );
};

const inputChange = ( e : Event ) => {
	const target = e.target as HTMLInputElement;
	value = target.value;
	onchange && onchange( value );
};
</script>

<div class="liwe3-select-container">
	{#if dropdownOnly}
		<select class="liwe3-select" {name} {value} {placeholder} onchange={selectChange}>
			<option value="" disabled selected hidden>{placeholder}</option>
			{#each items as item}
				<option value={get( item, 'value' )}>{get( item, 'label' )}</option>
			{/each}
		</select>
	{:else}
		<input class="liwe3-input" {name} {value} {placeholder} {readonly} oninput={inputChange} />
	{/if}
	{#if showClear}
		<Button icon={XCircle} size="xs" variant="ghost" onclick={clear} />
	{:else}
		<div style="width: 24px"></div>
	{/if}
</div>

<style>
.liwe3-select-container {
	position: relative;
	display: flex;
	flex-direction: row;
	align-items: center;
	border: 1px solid var(--liwe3-border);
	padding: var(--liwe3-space-1);
	border-radius: var(--liwe3-radius-md);
	background-color: var(--liwe3-surface);
	min-height: var(--liwe3-control-height-md);
}

.liwe3-select,
.liwe3-input {
	width: 100%;
	background-color: var(--liwe3-surface);
	border: none;
	outline: none;
	color: var(--liwe3-text);
	font-family: var(--liwe3-font-sans);
	font-size: var(--liwe3-text-sm);
}

.liwe3-select:focus,
.liwe3-input:focus {
	border: none;
	box-shadow: none;
}
</style>
