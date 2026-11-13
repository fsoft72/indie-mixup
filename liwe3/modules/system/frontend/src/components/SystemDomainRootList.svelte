<script lang="ts">
import {
	DataGrid,
	type DataGridAction,
	type DataGridButton,
	type DataGridField,
	type DataGridRow,
	FormCreator,
	type FormField,
} from '@frontend/liwe3';
import { onMount } from 'svelte';

import { PencilSquare, Trash, UserPlus } from 'svelte-hero-icons';
import Modal from '@frontend/liwe3/components/Modal.svelte';
import { type SystemDomain } from '../types';

import storeAdminDomains from '../store.admin.domains.svelte';
import { toastAdd } from '@liwe3/webcomponents-svelte';
import { goto } from '$app/navigation';

const fields : DataGridField[] = [
	{
		name: 'code',
		label: 'Code',
		type: 'string',
	},
	{
		name: 'name',
		label: 'Name',
		type: 'string',
	},
	{
		name: 'visible',
		label: 'Visible',
		type: 'boolean',
	},
	{
		name: 'tiers_allocated',
		label: 'Tiers Allocated',
		type: 'number',
	},
	{
		name: 'total_max_tiers',
		label: 'Max Tiers',
		type: 'number',
	},
];

const actions : DataGridAction[] = [
	{
		label: 'Edit',
		icon: PencilSquare,
		onclick: ( row : DataGridRow ) => {
			console.log( '=== EDIT: ', row );
		},
	},
	{
		label: 'Users',
		icon: UserPlus,
		onclick: ( row : DataGridRow ) => {
			goto( `/sys/domains/${row.code}/users` );
		},
	},
	{
		label: 'Delete',
		icon: Trash,
		mode: 'danger',
		onclick: ( row : DataGridRow ) => {
			domainData = row as any;

			showDeleteModal = true;
		},
	},
];

const buttons : DataGridButton[] = [
	{
		label: 'Create Root Domain',
		onclick: () => {
			createNewDomain();
		},
	},
];

let formFields : FormField[] = [
	{
		name: 'code',
		label: 'Domain Code',
		type: 'text',
		required: true,
		col: 6,
	},
	{
		name: 'name',
		label: 'Domain Name',
		type: 'text',
		required: true,
		col: 6,
	},
	{
		name: 'visible',
		label: 'Visible',
		type: 'checkbox',
		required: true,
	},
	{
		name: 'tiers_allocated',
		label: 'Tiers Allocated',
		type: 'text',
		required: true,
		col: 6,
	},
	{
		name: 'total_max_tiers',
		label: 'Total Max Tiers',
		type: 'text',
		required: true,
		col: 6,
	},
];

let showDomainModal = $state( false );
let domainData : SystemDomain = $state( {
	code: '',
	name: '',
	visible: true,
	tiers_allocated: 0,
	total_max_tiers: 0,
} );
let showDeleteModal = $state( false );

const createNewDomain = () => {
	domainData = {
		code: '',
		name: '',
		visible: true,
		tiers_allocated: 0,
		total_max_tiers: 0,
	};
	showDomainModal = true;
};

const handleSubmit = async ( values : any ) => {
	console.log( '=== SUBMIT DOMAIN DATA: ', values );
	// Here you would typically call a store action to save the data
	showDomainModal = false;

	const res = await storeAdminDomains.createRoot( values );
};

onMount( () => {
	storeAdminDomains.list();
} );
</script>

<DataGrid
	title="Root Domains"
	{fields}
	{actions}
	{buttons}
	data={storeAdminDomains.roots as DataGridRow[]}
/>

{#if showDomainModal}
	<Modal
		title="Modify root domain"
		onclose={() => ( showDomainModal = false )}
		oncancel={() => ( showDomainModal = false )}
	>
		<FormCreator
			bind:values={domainData}
			fields={formFields}
			submitLabel="Save changes"
			onsubmit={handleSubmit}
		/>
	</Modal>
{/if}

{#if showDeleteModal}
	<Modal
		title="Confirm Deletion"
		onclose={() => ( showDeleteModal = false )}
		oncancel={() => ( showDeleteModal = false )}
	>
		<div class="modal-body">
			Do you really want to delete the domain "{domainData.name}"?
		</div>
		<div class="footer">
			<button
				class="btn danger"
				onclick={() => {
					storeAdminDomains.del( domainData.code );
					showDeleteModal = false;
					toastAdd( {
						text: `Domain "${domainData.name}" deleted successfully.`,
						type: 'success',
					} );
				}}
			>
				Delete
			</button>
			<button
				class="btn btn-secondary"
				onclick={() => ( showDeleteModal = false )}
			>
				Cancel
			</button>
		</div>
	</Modal>
{/if}

<style>
.modal-body {
	padding: 2rem 3rem;
}

.footer {
	display: flex;
	justify-content: space-between;
	padding: 1rem;

	border-top: 1px solid var(--liwe3-border);
}

.danger {
	background-color: var(--liwe3-error);
}
</style>
