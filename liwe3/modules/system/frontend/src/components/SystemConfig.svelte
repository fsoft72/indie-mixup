<script lang="ts">
import { FormCreator, type FormField } from '@frontend/liwe3';
import { toastAdd } from '@liwe3/webcomponents-svelte';
import { onMount } from 'svelte';

import { system_admin_config_fields, system_admin_config_reset, system_admin_config_set } from '../actions';
import type { SystemConfigGroup } from '../types';

/** Values of the form, per group id and field name */
type GroupValues = Record<string, Record<string, any>>;

let groups : SystemConfigGroup[] = $state( [] );
let values : GroupValues = $state( {} );
// what the server returned, to send only the fields the user changed
let initial : GroupValues = $state( {} );
let loading = $state( true );
let failed = $state( '' );
let busy = $state( false );

/** The FormCreator fields of a group */
const _fields = ( group : SystemConfigGroup ) : FormField[] => group.fields as FormField[];

/** Compares two form values: a number input hands back a string */
const _same = ( a : any, b : any ) : boolean => String( a ?? '' ) === String( b ?? '' );

/**
 * Takes the server version of a group as both the form values and the reference to detect changes.
 *
 * @param group - The group as returned by the config endpoints (current effective values as defaults)
 */
const _applyGroup = ( group : SystemConfigGroup ) => {
	const fresh = Object.fromEntries( _fields( group ).map( ( f ) => [ f.name, f.default ?? '' ] ) );

	values[group.id] = { ...fresh };
	initial[group.id] = { ...fresh };
};

/** Shows the error of a failed call */
const _fail = ( title : string, message? : string ) => toastAdd( { title, text: message ?? 'Unknown error', type: 'error' } );

const load = async () => {
	loading = true;
	const res = await system_admin_config_fields();
	loading = false;

	if ( !res.ok || !res.data ) {
		failed = res.message ?? 'Cannot load the configuration';
		return;
	}

	failed = '';
	groups = res.data;
	res.data.forEach( _applyGroup );
};

/**
 * Saves the fields of a group the user changed. Fields left as they were are not sent,
 * so they keep following config.json instead of being pinned to today's value.
 *
 * @param group - The group whose form was submitted
 */
const save = async ( group : SystemConfigGroup ) => {
	const changed = Object.fromEntries(
		_fields( group )
			.filter( ( f ) => !_same( values[group.id][f.name], initial[group.id][f.name] ) )
			.map( ( f ) => [ f.name, values[group.id][f.name] ] ),
	);

	if ( Object.keys( changed ).length === 0 ) {
		toastAdd( { title: 'Configuration', text: 'Nothing to save', type: 'info' } );
		return;
	}

	busy = true;
	const res = await system_admin_config_set( { values: changed } );
	busy = false;

	if ( !res.ok ) return _fail( 'Cannot save', res.message );

	const saved = res.data?.find( ( g ) => g.id === group.id );
	if ( saved ) _applyGroup( saved );

	toastAdd( { title: 'Configuration', text: `${group.label} saved. Other servers pick it up within a couple of minutes.`, type: 'success' } );
};

/**
 * Removes the overrides of a whole group, so its values go back to the ones in config.json.
 *
 * @param group - The group to reset
 */
const reset = async ( group : SystemConfigGroup ) => {
	busy = true;
	const res = await system_admin_config_reset( { keys: _fields( group ).map( ( f ) => f.name ) } );
	busy = false;

	if ( !res.ok ) return _fail( 'Cannot reset', res.message );

	const fresh = res.data?.find( ( g ) => g.id === group.id );
	if ( fresh ) _applyGroup( fresh );

	toastAdd( { title: 'Configuration', text: `${group.label} is back to the values of config.json`, type: 'success' } );
};

onMount( load );
</script>

<div class="system-config">
	<h2>Configuration</h2>
	<p class="hint">
		Values saved here override <code>config.json</code>. Secrets are not editable from this page.
	</p>

	{#if loading}
		<p role="status">Loading...</p>
	{:else if failed}
		<p role="alert">{failed}</p>
	{:else}
		{#each groups as group (group.id)}
			<section class="config-group">
				<h3>{group.label}</h3>
				<FormCreator
					bind:values={values[group.id]}
					fields={_fields( group )}
					submitLabel={busy ? 'Saving...' : 'Save'}
					showReset={false}
					onsubmit={() => save( group )}
				/>
				<button class="liwe3-btn" type="button" disabled={busy} onclick={() => reset( group )}>
					Back to config.json values
				</button>
			</section>
		{/each}
	{/if}
</div>

<style>
.system-config {
	max-width: 48rem;
}

.hint {
	color: var(--liwe3-text-muted);
}

.config-group {
	margin-bottom: var(--liwe3-space-4);
	padding: var(--liwe3-space-3);
	border: 1px solid var(--liwe3-border-subtle);
	border-radius: var(--liwe3-radius-md, 6px);
	background: var(--liwe3-surface-raised);
}
</style>
