<script lang="ts">
/**
 * AddressForm — FormCreator-based shipping address form.
 * Used for adding or editing saved shipping addresses.
 */
import { FormCreator, type FormField } from '@frontend/liwe3';
import { COUNTRY_OPTIONS, type ShippingAddress } from '../types';

interface Props {
	/** Pre-filled address values for editing */
	address? : ShippingAddress;
	/** Called when form is submitted */
	onsave? : ( address : ShippingAddress ) => void;
	/** Called when user cancels */
	oncancel? : () => void;
}

let {
	address = $bindable( { label: '', name: '', street: '', city: '', zip: '', province: '', country: 'IT', phone: '', is_default: false } ),
	onsave,
	oncancel,
} : Props = $props();

const fields : FormField[] = [
	{ name: '_addr_title', label: 'Shipping Address', type: 'title' },
	{ name: 'label', label: 'Address Label', type: 'text', required: true, col: 12, placeholder: 'e.g. Home, Office, ...' },
	{ name: 'name', label: 'Full Name', type: 'text', required: true, col: 12, placeholder: 'Name and Surname' },
	{ name: 'street', label: 'Street Address', type: 'text', required: true, col: 12, placeholder: 'Via Roma 1' },
	{ name: 'city', label: 'City', type: 'text', required: true, col: 5, placeholder: 'Milano' },
	{ name: 'zip', label: 'ZIP Code', type: 'text', required: true, col: 3, placeholder: '20100' },
	{ name: 'province', label: 'Province', type: 'text', required: true, col: 4, placeholder: 'MI' },
	{ name: 'country', label: 'Country', type: 'smartselect', required: true, col: 6, options: COUNTRY_OPTIONS },
	{ name: 'phone', label: 'Phone Number', type: 'text', col: 6, placeholder: '+39 xxx xxx xxxx' },
	{ name: 'is_default', label: 'Set as default address', type: 'checkbox', col: 12 },
];

const handleSubmit = ( values : Record<string, any> ) => {
	const saved = { ...address, ...values } as ShippingAddress;
	onsave?.( saved );
};
</script>

<div class="address-form">
	<FormCreator
		{fields}
		bind:values={address}
		submitLabel="Save Address"
		onsubmit={handleSubmit}
	/>

	{#if oncancel}
		<button class="cancel-btn" onclick={oncancel}>
			<span class="material-icons">close</span>
			Cancel
		</button>
	{/if}
</div>

<style>
.address-form {
	max-width: 600px;
}

.cancel-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	margin-top: 1rem;
	padding: 0.4rem 0.75rem;
	border: 1px solid var(--wox-border, #333);
	border-radius: var(--wox-radius-md, 6px);
	background: transparent;
	color: var(--wox-text-secondary, #999);
	font-size: 0.85rem;
	font-family: var(--wox-font, "Inter", sans-serif);
	cursor: pointer;
	transition: all var(--wox-transition-fast, 0.12s ease);
}

.cancel-btn:hover {
	border-color: var(--wox-danger, #f72585);
	color: var(--wox-text-primary, #eee);
}

.cancel-btn .material-icons {
	font-size: 16px;
}
</style>
