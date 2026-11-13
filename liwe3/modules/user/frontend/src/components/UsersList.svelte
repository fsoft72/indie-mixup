<script lang="ts">
import { Button, DataGrid, Modal, has_perm } from '@frontend/liwe3';
import type {
	DataGridAction,
	DataGridButton,
	DataGridField,
	DataGridRow,
	LiWEResponse,
	UserAuth,
} from '@frontend/liwe3';
import { onMount } from 'svelte';
import { Identification, Key, PencilSquare, ShieldCheck, Trash } from 'svelte-hero-icons';
import { PermsSelector } from '@frontend-modules/system';
import UserCreate from './UserCreate.svelte';
import ChangePassword from './ChangePassword.svelte';
import UserEdit from './UserEdit.svelte';
import { goto } from '$app/navigation';
import { type User } from '../types';
import { dialogAdd, toastAdd } from '@liwe3/webcomponents-svelte';
import { user_set_email_verified, user_set_enabled } from '../actions';

import storeUser from '../store.svelte';
import storeUserAdmin from '../store-admin.svelte';

interface Props {
	domain? : string;
	onbeforeuserperms? : ( userId : number, perms : string[] ) => Promise<LiWEResponse<boolean>>;
	onuserpermsset? : ( user : UserAuth ) => void;
}

let { domain, onbeforeuserperms, onuserpermsset } : Props = $props();

const fields : DataGridField[] = [
	{
		name: 'username',
		label: 'Username',
		sortable: true,
		filterable: true,
		type: 'string',
	},
	{
		name: 'email',
		label: 'Email',
		sortable: true,
		filterable: true,
		type: 'string',
	},
	{
		name: 'name',
		label: 'Name',
		sortable: true,
		filterable: true,
		type: 'string',
	},
	{
		name: 'lastname',
		label: 'Lastname',
		sortable: true,
		filterable: true,
		type: 'string',
	},
	{
		name: 'enabled',
		label: 'Enabled',
		sortable: true,
		type: 'boolean',
	},
	{
		name: 'email_verified',
		label: 'Email Verified',
		sortable: true,
		type: 'boolean',
	},
];

// svelte-ignore state_referenced_locally (one-time column setup at init; domain doesn't change after mount for this view)
if ( !domain )
	fields.unshift(
		{
			name: 'domain',
			label: 'Domain',
			sortable: true,
			filterable: true,
			type: 'string',
		},
	);

let currUser : DataGridRow | null = $state( null );
let buttons : DataGridButton[] = [];
let showPermsModal = $state( false );
let showCreateUserModal = $state( false );
let showChangePasswordModal = $state( false );
let showEditModal = $state( false );

// Add buttons depening on user perms
if ( has_perm( storeUser.user, 'user.create' ) )
{
	buttons.push( {
		label: 'Create User',
		mode: 'neutral',
		onclick: () => showCreateUserModal = true,
	} );
}

const userDel = async ( user : DataGridRow ) => {
	const dialog = dialogAdd(
		{
			title: 'Deleting User',
			body: `<p>Do you really want to delete user <strong>${user.username}</strong>?</p>`,
			buttons: [
				{
					label: 'Delete',
					backgroundColor: 'var(--liwe3-error)',
					onclick: async ( dialog ) => {
						const res = await storeUserAdmin.delUser( user?.id ?? '__' );

						if ( !res.ok ) return false;

						dialog.close();
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

const editPerms = ( user : DataGridRow ) => {
	currUser = user;
	showPermsModal = true;
};

const editUser = ( user : DataGridRow ) => {
	currUser = user;
	showEditModal = true;
};

const changePassword = ( user : DataGridRow ) => {
	currUser = user;
	showChangePasswordModal = true;
};

const onCellEdit = async ( row : DataGridRow, field : string, oldValue : any, newValue : any ) => {
	if ( field !== 'enabled' && field !== 'email_verified' ) return;

	const res = field === 'enabled'
		? await user_set_enabled( { id: row.id, enabled: newValue } )
		: await user_set_email_verified( { id: row.id, verified: newValue } );

	if ( !res.ok ) {
		// Revert the optimistic checkbox change DataGrid already applied
		row[field] = oldValue;
		toastAdd( {
			title: 'Update failed',
			type: 'error',
			text: res.error?.message || `Could not update "${field}" for ${row.username}.`,
		} );
	}
};

const actions : DataGridAction[] = $state( [] );

const setActionButtons = () => {
	if ( has_perm( storeUser.user, 'user.perms' ) )
		actions.push(
			{
				label: 'Edit Perms',
				icon: ShieldCheck,
				mode: 'primary',
				onclick: editPerms,
			},
		);

	if ( has_perm( storeUser.user, 'user.change_identity' ) )
		actions.push(
			{
				label: 'Impersonate',
				icon: Identification,
				mode: 'secondary',
				onclick: async ( user : DataGridRow ) => {
					await storeUser.changeIdentity( user.id );
					goto( '/modules' );
				},
			},
		);

	if ( has_perm( storeUser.user, 'user.password' ) )
		actions.push(
			{
				label: 'Edit',
				icon: PencilSquare,
				mode: 'neutral',
				onclick: editUser,
			},
		);

	if ( has_perm( storeUser.user, 'user.password' ) )
		actions.push(
			{
				label: 'Change Password',
				icon: Key,
				mode: 'accent',
				onclick: changePassword,
			},
		);

	if ( has_perm( storeUser.user, 'user.delete' ) )
		actions.push(
			{ label: 'Delete', icon: Trash, mode: 'error', onclick: userDel },
		);
};

const setUserPerms = async ( perms : string[] ) => {
	if ( !currUser ) return;
	const res = await storeUserAdmin.setUserPerms( currUser.id, perms );

	if ( !res || !res.ok ) return res;

	onuserpermsset?.( res.data as UserAuth );
	return res;
};

const onusercreated = async ( resp : LiWEResponse<User> ) => {
	console.log( '=== USER CREATED: ', resp );
	if ( !resp.ok ) return;
	showCreateUserModal = false;
};

onMount( async () => {
	await storeUserAdmin.load();
	setActionButtons();
} );
</script>

<DataGrid
	title="Users list"
	data={storeUserAdmin.domainUsers( domain )}
	{fields}
	{actions}
	{buttons}
	oncelledit={onCellEdit}
/>

{#if showPermsModal}
	<Modal
		title="Edit User Permissions"
		onclose={() => ( showPermsModal = false )}
		oncancel={() => ( showPermsModal = false )}
		closeOnOutsideClick={false}
	>
		<PermsSelector onconfirm={setUserPerms} perms={currUser?.perms ?? []} />
	</Modal>
{/if}

{#if showCreateUserModal}
	<Modal
		title="Create a new User"
		onclose={() => ( showCreateUserModal = false )}
		oncancel={() => ( showCreateUserModal = false )}
		closeOnOutsideClick={false}
	>
		<UserCreate {onusercreated} />
	</Modal>
{/if}

{#if showEditModal && currUser}
	<Modal
		title={`Edit User - ${currUser.username}`}
		onclose={() => ( showEditModal = false )}
		oncancel={() => ( showEditModal = false )}
		closeOnOutsideClick={false}
	>
		<UserEdit
			userId={currUser.id}
			username={currUser.username}
			passwordMaxAgeDays={currUser.password_max_age_days}
			passwordChangedAt={currUser.password_changed_at}
			passwordExpired={currUser.password_expired}
			onsaved={() => ( showEditModal = false )}
		/>
	</Modal>
{/if}

{#if showChangePasswordModal && currUser}
	<Modal
		title={`Change Password - ${currUser.username}`}
		onclose={() => ( showChangePasswordModal = false )}
		oncancel={() => ( showChangePasswordModal = false )}
		closeOnOutsideClick={false}
	>
		<ChangePassword
			userId={currUser.id}
			username={currUser.username}
			onchanged={() => ( showChangePasswordModal = false )}
		/>
	</Modal>
{/if}
