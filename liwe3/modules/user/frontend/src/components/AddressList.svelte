<script lang="ts">
/**
 * AddressList — Displays saved shipping addresses with default selection, edit, and delete.
 * Addresses are stored in user metadata via the user_me / user profile update API.
 */
import { mkid_simple } from '@frontend/liwe3';
import type { ShippingAddress } from '../types';
import AddressForm from './AddressForm.svelte';

interface Props {
	/** List of saved addresses */
	addresses? : ShippingAddress[];
	/** Called when addresses change (add, edit, delete, set default) */
	onchange? : ( addresses : ShippingAddress[] ) => void;
}

let { addresses = $bindable( [] ), onchange } : Props = $props();

let showForm = $state( false );
let editingIndex = $state( -1 );
let editAddress : ShippingAddress = $state( { label: '', name: '', street: '', city: '', zip: '', province: '', country: 'IT', phone: '' } );

const startAdd = () => {
	editingIndex = -1;
	editAddress = { label: '', name: '', street: '', city: '', zip: '', province: '', country: 'IT', phone: '' };
	showForm = true;
};

const startEdit = ( index : number ) => {
	editingIndex = index;
	editAddress = { ...addresses[index] };
	showForm = true;
};

const handleSave = ( addr : ShippingAddress ) => {
	const updated = [ ...addresses ];

	if ( !addr.id ) addr.id = mkid_simple( 'addr' );

	// If this is default, clear other defaults
	if ( addr.is_default ) {
		updated.forEach( ( a ) => a.is_default = false );
	}

	if ( editingIndex >= 0 ) {
		updated[editingIndex] = addr;
	} else {
		// First address is auto-default
		if ( updated.length === 0 ) addr.is_default = true;
		updated.push( addr );
	}

	addresses = updated;
	onchange?.( addresses );
	showForm = false;
};

const handleDelete = ( index : number ) => {
	const updated = [ ...addresses ];
	const wasDefault = updated[index].is_default;
	updated.splice( index, 1 );

	// If deleted was default, assign default to first remaining
	if ( wasDefault && updated.length > 0 ) {
		updated[0].is_default = true;
	}

	addresses = updated;
	onchange?.( addresses );
};

const setDefault = ( index : number ) => {
	const updated = addresses.map( ( a, i ) => ( { ...a, is_default: i === index } ) );
	addresses = updated;
	onchange?.( addresses );
};

const handleCancel = () => {
	showForm = false;
};
</script>

<div class="address-list">
	<div class="list-header">
		<h3 class="list-title">
			<span class="material-icons">location_on</span>
			Shipping Addresses
		</h3>
		{#if !showForm}
			<button class="add-btn" onclick={startAdd}>
				<span class="material-icons">add</span>
				Add Address
			</button>
		{/if}
	</div>

	{#if showForm}
		<div class="form-panel">
			<AddressForm
				bind:address={editAddress}
				onsave={handleSave}
				oncancel={handleCancel}
			/>
		</div>
	{:else if addresses.length === 0}
		<div class="empty-state">
			<span class="material-icons">home_work</span>
			<p>No saved addresses yet.</p>
			<p class="hint">Add your first shipping address to speed up checkout.</p>
		</div>
	{:else}
		<div class="address-cards">
			{#each addresses as addr, i}
				<div class="address-card" class:is-default={addr.is_default}>
					<div class="card-header">
						<span class="card-label">
							{#if addr.is_default}
								<span class="default-badge">Default</span>
							{/if}
							{addr.label || 'Address'}
						</span>
						<div class="card-actions">
							{#if !addr.is_default}
								<button class="action-btn" title="Set as default" onclick={() => setDefault( i )}>
									<span class="material-icons">star_outline</span>
								</button>
							{/if}
							<button class="action-btn" title="Edit" onclick={() => startEdit( i )}>
								<span class="material-icons">edit</span>
							</button>
							<button class="action-btn danger" title="Delete" onclick={() => handleDelete( i )}>
								<span class="material-icons">delete_outline</span>
							</button>
						</div>
					</div>
					<div class="card-body">
						<p class="addr-name">{addr.name}</p>
						<p class="addr-line">{addr.street}</p>
						<p class="addr-line">{addr.zip} {addr.city} ({addr.province})</p>
						<p class="addr-line">{addr.country}</p>
						{#if addr.phone}
							<p class="addr-phone">
								<span class="material-icons">phone</span>
								{addr.phone}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
.address-list {
	width: 100%;
}

.list-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 1rem;
	padding-bottom: 0.75rem;
	border-bottom: 1px solid var(--wox-border, #333);
}

.list-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin: 0;
	font-size: 1.1rem;
	font-weight: 600;
	color: var(--wox-text-primary, #eee);
}

.list-title .material-icons {
	color: var(--wox-accent, #00e5ff);
	font-size: 22px;
}

.add-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	padding: 0.4rem 0.75rem;
	border: 1px solid var(--wox-accent, #00e5ff);
	border-radius: var(--wox-radius-md, 6px);
	background: transparent;
	color: var(--wox-accent, #00e5ff);
	font-size: 0.85rem;
	font-family: var(--wox-font, "Inter", sans-serif);
	cursor: pointer;
	transition: all var(--wox-transition-fast, 0.12s ease);
}

.add-btn:hover {
	background: rgba(0, 229, 255, 0.08);
}

.add-btn .material-icons {
	font-size: 18px;
}

.form-panel {
	padding: 1rem;
	background: var(--wox-bg-panel, #17171a);
	border: 1px solid var(--wox-border, #333);
	border-radius: var(--wox-radius-lg, 8px);
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 2rem;
	text-align: center;
	color: var(--wox-text-secondary, #999);
}

.empty-state .material-icons {
	font-size: 48px;
	margin-bottom: 0.5rem;
	opacity: 0.5;
}

.empty-state p {
	margin: 0.25rem 0;
}

.hint {
	font-size: 0.85rem;
	opacity: 0.7;
}

.address-cards {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 1rem;
}

.address-card {
	background: var(--wox-bg-panel, #17171a);
	border: 1px solid var(--wox-border, #333);
	border-radius: var(--wox-radius-lg, 8px);
	overflow: hidden;
	transition: border-color var(--wox-transition-fast, 0.12s ease);
}

.address-card.is-default {
	border-color: var(--wox-accent, #00e5ff);
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--wox-border, #333);
}

.card-label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-weight: 600;
	font-size: 0.9rem;
	color: var(--wox-text-primary, #eee);
}

.default-badge {
	display: inline-block;
	padding: 1px 6px;
	border-radius: var(--wox-radius-sm, 3px);
	background: var(--wox-accent, #00e5ff);
	color: #000;
	font-size: 0.7rem;
	font-weight: 700;
	text-transform: uppercase;
}

.card-actions {
	display: flex;
	gap: 0.25rem;
}

.action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border: none;
	border-radius: var(--wox-radius-sm, 3px);
	background: transparent;
	color: var(--wox-text-secondary, #999);
	cursor: pointer;
	transition: all var(--wox-transition-fast, 0.12s ease);
}

.action-btn:hover {
	background: rgba(255, 255, 255, 0.05);
	color: var(--wox-accent, #00e5ff);
}

.action-btn.danger:hover {
	color: var(--wox-danger, #f72585);
}

.action-btn .material-icons {
	font-size: 18px;
}

.card-body {
	padding: 0.75rem 1rem;
}

.addr-name {
	margin: 0 0 0.25rem;
	font-weight: 600;
	font-size: 0.9rem;
	color: var(--wox-text-primary, #eee);
}

.addr-line {
	margin: 0;
	font-size: 0.85rem;
	color: var(--wox-text-secondary, #999);
	line-height: 1.5;
}

.addr-phone {
	display: flex;
	align-items: center;
	gap: 0.3rem;
	margin: 0.4rem 0 0;
	font-size: 0.85rem;
	color: var(--wox-text-secondary, #999);
}

.addr-phone .material-icons {
	font-size: 16px;
}

@media (max-width: 640px) {
	.address-cards {
		grid-template-columns: 1fr;
	}
}
</style>
