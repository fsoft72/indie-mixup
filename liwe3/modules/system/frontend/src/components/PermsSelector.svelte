<script lang="ts">
import { onMount } from 'svelte';
import { Button } from '@frontend/liwe3';
import store from '../store.svelte';
import { SvelteSet } from 'svelte/reactivity';

interface Props {
	oncancel? : () => void;
	onconfirm? : ( perms : string[] ) => void;
	onchange? : ( perms : string[] ) => void;

	perms? : string[];
}

let { oncancel, onconfirm, onchange, perms = [] } : Props = $props();
// svelte-ignore state_referenced_locally (seeds local set once; selection is owned locally from here on, emitted back via onchange)
let selectedPerms : SvelteSet<string> = new SvelteSet( perms );

const chkPerm = ( name : string, checked : boolean ) => {
	console.log( '=== CHK: ', name, checked );

	if ( !checked ) {
		selectedPerms.delete( name );
	} else {
		selectedPerms.add( name );
	}

	onchange?.( [ ...selectedPerms ] );
};

onMount( async () => {
	// load permissions from store
	await store.load();
} );
</script>

<div class="sect form-container">
	<div class="perms-block">
		{#each Object.entries( store.perms ) as [ module, perms ]}
			<div class="mob-block">
				<div class="mod-name">{module}</div>
				{#each perms as perm}
					<div class="chkbox">
						<input
							type="checkbox"
							id={perm.name}
							name={perm.name}
							checked={selectedPerms.has( perm.name )}
							onchange={( e : any ) => chkPerm( perm.name, e.target?.checked ?? false )}
						/>
						<label for={perm.name}>
							{perm.description}
						</label>
					</div>
				{/each}
			</div>
		{/each}
	</div>
	<div class="buttons">
		{#if oncancel}
			<Button mode="danger" onclick={oncancel}>Cancel</Button>
		{/if}
		{#if onconfirm}
			<Button mode="success" onclick={() => onconfirm( [ ...selectedPerms ] )}>
				Confirm
			</Button>
		{/if}
	</div>
</div>

<style>
.sect {
	display: flex;
	flex-direction: column;
	height: 100%;
	max-height: 70vh;

	border: 1px solid var(--liwe3-border-default);

	font-family: sans-serif;

	background: var(--liwe3-background);

	user-select: none;
	overflow: hidden;
}

.perms-block {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: 0.5rem;
}

.chkbox {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.3rem;
}

.chkbox label {
	color: var(--liwe3-text-primary);
}

.mod-name {
	font-size: 1.1rem;
	font-weight: bold;
	margin-bottom: 0.5rem;

	color: var(--liwe3-accent-800);
	background: var(--liwe3-accent-200);
	padding: 0.2rem 0.5rem;
}

.mob-block {
	margin-bottom: 0.5rem;
}

.buttons {
	display: flex;
	justify-content: flex-end;
	gap: 1rem;
	flex-shrink: 0;

	padding: 0.5rem 0.3rem 0.3rem 0.3rem;
	border-top: 1px solid var(--liwe3-border);

	background: var(--liwe3-background);
}
</style>
