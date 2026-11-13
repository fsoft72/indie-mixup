<script lang="ts">
import type { FullAutoFill } from 'svelte/elements';
import type { Color, Size } from '../types/types';
import { filterValidChars, mkid } from '../utils/utils';

interface Props {
	id? : string;
	name? : string;
	value? : string | number | boolean; // Allow boolean for checkbox

	autocomplete? : string;

	divClass? : string;
	label? : string;
	mode? : Color;
	size? : Size;
	type? : string;
	validChars? : string;
	width? : string;
	minLength? : number;
	maxLength? : number;

	// events
	onblur? : ( event : FocusEvent ) => void;
	onchange? : ( event : Event ) => void;
	onkeydown? : ( event : KeyboardEvent ) => void;
	onkeyup? : ( event : KeyboardEvent ) => void;
	oninput? : ( event : Event ) => void;
	onpaste? : ( event : ClipboardEvent ) => void; // Add onpaste

	// rest
	[k : string] : any;
}

let {
	name = mkid( 'fld' ),
	label = '',
	id = mkid( 'id' ),
	size = 'md',
	validChars = '',
	width,
	mode = 'neutral',
	divClass = '',
	value = $bindable( '' ),
	type = 'text',
	minLength,
	maxLength,
	onblur,
	onchange,
	onkeydown, // User's onkeydown
	onkeyup,
	oninput, // User's oninput
	onpaste, // User's onpaste
	autocomplete,
	...rest
} : Props = $props();

// svelte-ignore state_referenced_locally (one-time default derived from name/id, both stable identifiers)
// the default is the field name / id on purpose: it is not a spec autocomplete
// token, and browsers fall back to "off" heuristics for unknown values, which
// is what keeps them from autofilling unrelated fields
if ( !autocomplete ) autocomplete = name || id;

const inputClass = $derived( `liwe3-input ${size} ${rest.class || ''}` );

const handleKeyDown = ( event : KeyboardEvent ) => {
	// Call user's onkeydown first
	if ( onkeydown ) {
		onkeydown( event );
		// If user prevented default, respect it
		if ( event.defaultPrevented ) {
			return;
		}
	}

	// Only apply logic if validChars is set (inputType will be 'text' in this case)
	if ( !validChars ) return;

	const key = event.key;
	const isCtrlCmd = event.ctrlKey || event.metaKey;

	// Allow navigation, control keys, and specific combinations
	if (
		[
			'Backspace',
			'Delete',
			'Tab',
			'Escape',
			'Enter',
			'Home',
			'End',
			'ArrowLeft',
			'ArrowRight',
			'ArrowUp',
			'ArrowDown',
			'Shift',
			'Control',
			'Alt',
			'Meta',
		].includes( key )
		|| ( isCtrlCmd && [ 'a', 'c', 'v', 'x', 'z', 'y' ].includes( key.toLowerCase() ) )
	) {
		return; // Allow the event
	}

	// Check if the key is a printable character
	if ( key.length === 1 ) {
		// If the character is not in validChars, prevent it
		if ( !filterValidChars( key, validChars ) ) {
			event.preventDefault();
		}
	}
	// Allow other keys (like F1-F12) by default
};

const handlePaste = ( event : ClipboardEvent ) => {
	// Call user's onpaste first
	if ( onpaste ) {
		onpaste( event );
		// If user prevented default, respect it
		if ( event.defaultPrevented ) {
			return;
		}
	}

	// Only apply logic if validChars is set (inputType will be 'text' in this case)
	if ( !validChars ) return;

	event.preventDefault(); // Prevent default paste

	const text = event.clipboardData?.getData( 'text/plain' ) || '';
	if ( !text ) return;

	const filteredText = filterValidChars( text, validChars );
	if ( !filteredText ) return; // Nothing valid to paste

	const inputElement = event.target as HTMLInputElement;
	const start = inputElement.selectionStart ?? 0;
	const end = inputElement.selectionEnd ?? 0;
	const originalValue = inputElement.value;

	// Construct the new value
	const newValue = originalValue.substring( 0, start )
		+ filteredText
		+ originalValue.substring( end );

	// Update the input value directly and the bindable state
	inputElement.value = newValue;
	value = newValue; // Update bindable value

	// Manually set cursor position after paste
	const newCursorPos = start + filteredText.length;
	inputElement.selectionStart = inputElement.selectionEnd = newCursorPos;

	// Dispatch an 'input' event manually so Svelte bindings and user's oninput handler are triggered
	const inputEvent = new InputEvent( 'input', {
		bubbles: true,
		cancelable: false, // Typically false for programmatic changes
		composed: true,
		data: filteredText, // Optionally include the inserted data
		inputType: 'insertFromPaste', // Indicate the type of input
	} );
	inputElement.dispatchEvent( inputEvent );
};

const handleInput = ( event : Event ) => {
	// Simplified: Update state based on DOM value after keydown/paste filtering
	const target = event.target as HTMLInputElement;
	value = target.value;

	// Call user's oninput handler
	if ( oninput ) {
		oninput( event );
	}
};
</script>

<div
	class="{divClass} liwe3-input-container"
	style:width={width}
>
	{#if label}
		<label for={id} class="liwe3-label">{label}</label>
	{/if}
	<input
		{id}
		{name}
		class={inputClass}
		{value}
		{type}
		{onblur}
		{onchange}
		style="width: 100%; min-width: {minLength ? `calc(${minLength}ch + 2rem)` : '100%'}; max-width: {maxLength ? `calc(${maxLength}ch + 2rem)` : '100%'}"
		onkeydown={handleKeyDown}
		{onkeyup}
		oninput={handleInput}
		onpaste={handlePaste}
		title={rest.title || rest.placeholder || label || ''}
		autocomplete={autocomplete as FullAutoFill}
		{...rest}
	/>
</div>

<style>
.liwe3-input-container {
	display: inline-flex;
	flex-direction: column;
	align-self: stretch;
	align-items: stretch;
	flex-grow: 0;
	flex-shrink: 1;
	justify-content: flex-end;
	padding-block: var(--liwe3-space-1);
	padding-inline: var(--liwe3-space-2);
}

.liwe3-label {
	white-space: nowrap;
	font-size: var(--liwe3-text-xs);
	margin-bottom: var(--liwe3-space-1);
	color: var(--liwe3-text-muted);
	user-select: none;
}

.liwe3-input.xxs {
	padding: 0.12rem 0.2rem;
	font-size: var(--liwe3-text-xs);
	min-height: var(--liwe3-control-height-xxs);
}
.liwe3-input.xs {
	padding: 0.15rem 0.22rem;
	font-size: var(--liwe3-text-xs);
	min-height: var(--liwe3-control-height-xs);
}
.liwe3-input.sm {
	padding: 0.18rem 0.24rem;
	font-size: var(--liwe3-text-sm);
	min-height: var(--liwe3-control-height-sm);
}
.liwe3-input.md {
	font-size: var(--liwe3-text-base);
	min-height: var(--liwe3-control-height-md);
}
.liwe3-input.lg {
	padding: 0.22rem 0.28rem;
	font-size: var(--liwe3-text-lg);
	min-height: var(--liwe3-control-height-lg);
}
.liwe3-input.xl {
	padding: 0.24rem 0.4rem;
	font-size: var(--liwe3-text-xl);
	min-height: var(--liwe3-control-height-xl);
}
.liwe3-input.xxl {
	padding: 0.28rem 0.45rem;
	font-size: var(--liwe3-text-2xl);
	min-height: var(--liwe3-control-height-xxl);
}
</style>
