<script lang="ts">
import { Button, DataGrid, Input, Modal, has_perm } from '@frontend/liwe3';
import type { DataGridAction, DataGridButton, DataGridField, DataGridRow } from '@frontend/liwe3';
import { onMount } from 'svelte';
import { PencilSquare, Trash } from 'svelte-hero-icons';
import { dialogAdd, toastAdd } from '@liwe3/webcomponents-svelte';

import { user_oauth_provider_add, user_oauth_provider_del, user_oauth_provider_enable, user_oauth_provider_list } from '../actions';
import { type UserOAUTHProvider } from '../types';
import storeUser from '../store.svelte';

interface Props {
	/** Called every time the provider list is (re)loaded */
	onchange? : ( providers : UserOAUTHProvider[] ) => void;
}

let { onchange } : Props = $props();

const PERM_OAUTH_MANAGE = 'user.oauth.manage';

const fields : DataGridField[] = [
	{ name: 'provider', label: 'Provider', sortable: true, filterable: true, type: 'string' },
	{ name: 'client_id', label: 'Client ID', sortable: true, filterable: true, type: 'string' },
	{ name: 'enabled', label: 'Enabled', sortable: true, type: 'boolean' },
];

let providers : DataGridRow[] = $state( [] );
let errorMessage = $state( '' );
let busy = $state( false );

let showEditModal = $state( false );
let editingProvider : UserOAUTHProvider | null = $state( null );
let providerName = $state( '' );
let clientId = $state( '' );
let clientSecret = $state( '' );

const canManage = $derived( has_perm( storeUser.user, PERM_OAUTH_MANAGE ) );

/** Loads the providers configured for the current domain */
const loadProviders = async () => {
	busy = true;
	errorMessage = '';
	try {
		const res = await user_oauth_provider_list( {} );
		if ( !res.ok ) {
			errorMessage = res.error.message || 'Failed to load providers';
			return;
		}

		providers = ( res.data ?? [] ) as DataGridRow[];
		onchange?.( res.data ?? [] );
	} finally {
		busy = false;
	}
};

const openCreate = () => {
	editingProvider = null;
	providerName = '';
	clientId = '';
	clientSecret = '';
	showEditModal = true;
};

const openEdit = ( row : DataGridRow ) => {
	editingProvider = row as UserOAUTHProvider;
	providerName = row.provider ?? '';
	clientId = row.client_id ?? '';
	clientSecret = '';
	showEditModal = true;
};

const closeEdit = () => {
	showEditModal = false;
	editingProvider = null;
};

/** Creates a provider, or updates the credentials of an existing one */
const saveProvider = async () => {
	if ( !providerName.trim() || !clientId.trim() || !clientSecret.trim() ) {
		errorMessage = 'Provider, Client ID and Client Secret are required (the secret is never shown, type it again when editing)';
		return;
	}

	busy = true;
	errorMessage = '';
	try {
		const res = await user_oauth_provider_add( {
			id: editingProvider?.id,
			provider: providerName.trim().toLowerCase(),
			client_id: clientId.trim(),
			client_secret: clientSecret.trim(),
		} );

		if ( !res.ok ) {
			errorMessage = res.error.message || 'Failed to save provider';
			return;
		}

		closeEdit();
		await loadProviders();
	} finally {
		busy = false;
	}
};

/** Enable / disable switch (checkbox in the grid) */
const onCellEdit = async ( row : DataGridRow, field : string, oldValue : any, newValue : any ) => {
	if ( field !== 'enabled' ) return;

	const res = await user_oauth_provider_enable( { id: row.id, enabled: !!newValue } );
	if ( res.ok ) return;

	// Revert the optimistic checkbox change DataGrid already applied
	row[field] = oldValue;
	toastAdd( {
		title: 'Update failed',
		type: 'error',
		text: res.error?.message || `Could not update provider ${row.provider}.`,
	} );
};

const deleteProvider = ( row : DataGridRow ) => {
	dialogAdd( {
		title: 'Deleting Provider',
		body: `<p>Do you really want to delete provider <strong>${row.provider}</strong>? Nobody will be able to login with it anymore.</p>`,
		buttons: [
			{
				label: 'Delete',
				backgroundColor: '#dc3545',
				onclick: async ( dialog ) => {
					const res = await user_oauth_provider_del( { id: row.id } );
					if ( !res.ok ) return false;

					dialog.close();
					await loadProviders();
				},
			},
			{ label: 'Cancel', onclick: ( dialog ) => dialog?.close() },
		],
	} );
};

const actions : DataGridAction[] = $derived(
	canManage
		? [
			{ label: 'Edit', icon: PencilSquare, mode: 'primary', onclick: openEdit },
			{ label: 'Delete', icon: Trash, mode: 'error', onclick: deleteProvider },
		]
		: [],
);

const buttons : DataGridButton[] = $derived( canManage ? [ { label: 'Add Provider', mode: 'neutral', onclick: openCreate } ] : [] );

onMount( loadProviders );
</script>

<DataGrid
	title="Login providers"
	data={providers}
	{fields}
	{actions}
	{buttons}
	oncelledit={canManage ? onCellEdit : undefined}
/>

{#if errorMessage}
	<p class="error-message">{errorMessage}</p>
{/if}

{#if showEditModal}
	<Modal
		title={editingProvider ? `Edit ${editingProvider.provider}` : 'Add Provider'}
		onclose={closeEdit}
		oncancel={closeEdit}
		closeOnOutsideClick={false}
	>
		<div class="provider-form">
			{#if !editingProvider}
				<Input name="provider" label="Provider (github, google)" type="text" required={true} bind:value={providerName} />
			{/if}
			<Input name="client_id" label="Client ID" type="text" required={true} bind:value={clientId} />
			<Input name="client_secret" label="Client Secret" type="password" autocomplete="off" required={true} bind:value={clientSecret} />
			<div class="provider-form-buttons">
				<Button mode="secondary" onclick={closeEdit} disabled={busy}>Cancel</Button>
				<Button onclick={saveProvider} disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
			</div>
		</div>
	</Modal>
{/if}

<style>
.provider-form {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	min-width: 400px;
}

.provider-form-buttons {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	gap: 0.5rem;
}

.error-message {
	color: var(--liwe3-text-on-error);
	background-color: var(--liwe3-error-subtle);
	border: 1px solid var(--liwe3-error);
	border-radius: var(--liwe3-radius-md);
	padding: var(--liwe3-space-2) var(--liwe3-space-3);
	font-size: var(--liwe3-text-sm);
	margin: var(--liwe3-space-2) 0;
}
</style>
