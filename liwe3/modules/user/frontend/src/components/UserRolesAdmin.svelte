<script lang="ts">
import { Button, DataGrid, Input, Modal, has_perm } from '@frontend/liwe3';
import type { DataGridAction, DataGridButton, DataGridField, DataGridRow } from '@frontend/liwe3';
import { onMount } from 'svelte';
import { PencilSquare, Trash } from 'svelte-hero-icons';
import { PermsSelector } from '@frontend-modules/system';
import { dialogAdd } from '@liwe3/webcomponents-svelte';

import { user_role_add, user_role_del, user_role_list } from '../actions';
import { type UserRole } from '../types';
import storeUser from '../store.svelte';

interface Props {
	onchange? : ( roles : UserRole[] ) => void;
}

let { onchange } : Props = $props();

const fields : DataGridField[] = [
	{
		name: 'name',
		label: 'Name',
		sortable: true,
		filterable: true,
		type: 'string',
	},
	{
		name: 'description',
		label: 'Description',
		sortable: true,
		filterable: true,
		type: 'string',
	},
	{
		name: 'perms',
		label: 'Permissions',
		type: 'string',
		render: ( value : string[] ) => value?.length ?? 0,
	},
];

let roles : DataGridRow[] = $state( [] );
let errorMessage = $state( '' );
let busy = $state( false );

let showEditModal = $state( false );
let editingRole : UserRole | null = $state( null );
let roleName = $state( '' );
let roleDescription = $state( '' );
let rolePerms : string[] = $state( [] );

const canManage = $derived( has_perm( storeUser.user, 'user.role.manage' ) );

const loadRoles = async () => {
	busy = true;
	errorMessage = '';
	try {
		const res = await user_role_list( {} );
		if ( !res.ok ) {
			errorMessage = res.error.message || 'Failed to load roles';
			return;
		}

		roles = ( res.data ?? [] ) as DataGridRow[];
		onchange?.( res.data ?? [] );
	} finally {
		busy = false;
	}
};

const openCreate = () => {
	editingRole = null;
	roleName = '';
	roleDescription = '';
	rolePerms = [];
	showEditModal = true;
};

const openEdit = ( role : DataGridRow ) => {
	editingRole = role as UserRole;
	roleName = role.name ?? '';
	roleDescription = role.description ?? '';
	rolePerms = [ ...( role.perms ?? [] ) ];
	showEditModal = true;
};

const closeEdit = () => {
	showEditModal = false;
	editingRole = null;
};

const saveRole = async () => {
	if ( !roleName.trim() ) return;

	busy = true;
	errorMessage = '';
	try {
		const res = await user_role_add( {
			id: editingRole?.id,
			name: roleName.trim(),
			description: roleDescription.trim() || undefined,
			perms: rolePerms,
		} );

		if ( !res.ok ) {
			errorMessage = res.error.message || 'Failed to save role';
			return;
		}

		closeEdit();
		await loadRoles();
	} finally {
		busy = false;
	}
};

const deleteRole = ( role : DataGridRow ) => {
	const dialog = dialogAdd(
		{
			title: 'Deleting Role',
			body: `<p>Do you really want to delete role <strong>${role.name}</strong>?</p>`,
			buttons: [
				{
					label: 'Delete',
					backgroundColor: '#dc3545',
					onclick: async ( dialog ) => {
						const res = await user_role_del( { id: role.id } );

						if ( !res.ok ) return false;

						dialog.close();
						await loadRoles();
					},
				},
				{
					label: 'Cancel',
					onclick: ( dialog ) => {
						dialog?.close();
					},
				},
			],
		},
	);
};

const actions : DataGridAction[] = $derived(
	canManage
		? [
			{ label: 'Edit', icon: PencilSquare, mode: 'primary', onclick: openEdit },
			{ label: 'Delete', icon: Trash, mode: 'error', onclick: deleteRole },
		]
		: [],
);

const buttons : DataGridButton[] = $derived(
	canManage
		? [
			{ label: 'Create Role', mode: 'neutral', onclick: openCreate },
		]
		: [],
);

onMount( async () => {
	await loadRoles();
} );
</script>

<DataGrid
	title="Roles"
	data={roles}
	{fields}
	{actions}
	{buttons}
/>

{#if errorMessage}
	<p class="error-message">{errorMessage}</p>
{/if}

{#if showEditModal}
	<Modal
		title={editingRole ? 'Edit Role' : 'Create Role'}
		onclose={closeEdit}
		oncancel={closeEdit}
		closeOnOutsideClick={false}
	>
		<div class="role-form">
			<Input
				name="name"
				label="Name"
				type="text"
				required={true}
				bind:value={roleName}
			/>
			<Input
				name="description"
				label="Description"
				type="text"
				bind:value={roleDescription}
			/>
			<div class="perms-wrapper">
				<PermsSelector
					perms={rolePerms}
					onchange={( perms ) => ( rolePerms = perms )}
				/>
			</div>
			<div class="role-form-buttons">
				<Button mode="secondary" onclick={closeEdit} disabled={busy}>Cancel</Button>
				<Button onclick={saveRole} disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
			</div>
		</div>
	</Modal>
{/if}

<style>
.role-form {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	min-width: 400px;
}

.perms-wrapper {
	height: 40vh;
}

.role-form-buttons {
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
