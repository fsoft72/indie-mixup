<script lang="ts">
import type { Color } from '../types/types';
import { mkid } from '../utils/utils';

interface PINInputProps {
	value? : string;
	size? : number;
	mode? : Color;
}

let {
	value = $bindable( '' ),
	size = 6,
	mode = 'primary',
} : PINInputProps = $props();

let fields : any[] = [];

// svelte-ignore state_referenced_locally (number of PIN boxes is fixed at creation, size never changes after mount)
for ( let i = 0; i < size; i++ ) {
	fields.push( {
		id: mkid( `pin-${i}` ),
		name: `pin-${i}`,
	} );
}

// svelte-ignore state_referenced_locally (one-time initial padding, same size assumption as above)
if ( value.length < size ) {
	value = value.padEnd( size, '0' );
}

// Updates the value of the PIN input with the given value at the given position
const updateVALUE = ( pos : number, val : string ) => {
	const new_value = value.split( '' );
	new_value[pos] = val;

	value = new_value.join( '' );
};

const updatePIN = ( e : Event ) => {
	e.preventDefault();

	const target = e.target as HTMLInputElement;
	const name = target.name;
	const val = target.value;
	const pos = parseInt( name.split( '-' )[1] );

	updateVALUE( pos, val );
};

const onKeyPress = ( e : KeyboardEvent ) => {
	const target = e.target as HTMLInputElement;
	const name = target.name;
	const pos = parseInt( name.split( '-' )[1] );

	if ( e.key === 'Backspace' ) {
		if ( pos > 0 ) {
			target.value = '';

			// attempts to change focus to the previous input
			if ( pos > 0 ) {
				const prevId = fields[pos - 1].id;
				const prev = document.getElementById( prevId ) as HTMLInputElement;

				prev.focus();
			}
		}
	} else {
		// attempts to change focus to the next input
		if ( pos < size - 1 ) {
			const nextId = fields[pos + 1].id;
			const next = document.getElementById( nextId ) as HTMLInputElement;

			next.focus();
		}
	}
};
</script>

<div class={`container ${mode}`}>
	{#each fields as field}
		<input
			type="text"
			name={field.name}
			id={field.id}
			required={true}
			maxLength={1}
			minLength={1}
			inputMode="numeric"
			oninput={updatePIN}
			onkeyup={onKeyPress}
		/>
	{/each}
</div>

<style>
.container {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	gap: 0.5rem;

	padding: 1rem;
}
input {
	border-radius: var(--liwe3-radius-md);
	border: 1px solid var(--liwe3-border);
	background-color: var(--liwe3-surface);
	color: var(--liwe3-text);
	text-align: center;
	padding: var(--liwe3-space-3);
	width: 3rem;
	font-size: var(--liwe3-text-lg);
	font-weight: var(--liwe3-weight-medium);
	transition: border-color var(--liwe3-duration-fast) var(--liwe3-ease-out);
}

input:focus {
	outline: none;
	border-color: var(--liwe3-primary);
	box-shadow: 0 0 0 2px oklch(from var(--liwe3-primary) l c h / 0.2);
}
</style>
