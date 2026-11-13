<script lang="ts">
/**
 * FiscalDataForm — FormCreator for fiscal/billing data (Codice Fiscale, P.IVA, IBAN).
 * Required before requesting point→EUR conversion.
 */
import { FormCreator, type FormField } from '@frontend/liwe3';
import { onMount } from 'svelte';
import { user_me } from '../actions';
import { COUNTRY_OPTIONS } from '../types';

interface FiscalData {
	codice_fiscale : string;
	partita_iva : string;
	iban : string;
	billing_name : string;
	billing_street : string;
	billing_city : string;
	billing_zip : string;
	billing_province : string;
	billing_country : string;
	pec : string;
	sdi : string;
}

interface Props {
	/** Called when form is saved */
	onsave? : ( data : FiscalData ) => void;
}

let { onsave } : Props = $props();

let values : FiscalData = $state( {
	codice_fiscale: '',
	partita_iva: '',
	iban: '',
	billing_name: '',
	billing_street: '',
	billing_city: '',
	billing_zip: '',
	billing_province: '',
	billing_country: 'IT',
	pec: '',
	sdi: '',
} );

let isLoading = $state( true );
let saved = $state( false );
let savedTimer : ReturnType<typeof setTimeout>;

/* Clean up timer on component destroy */
$effect( () => {
	return () => clearTimeout( savedTimer );
} );

const fields : FormField[] = [
	{ name: '_fiscal_title', label: 'Tax & Fiscal Information', type: 'title' },
	{ name: 'codice_fiscale', label: 'Codice Fiscale', type: 'text', required: true, col: 6, placeholder: 'RSSMRA85M01H501Z' },
	{ name: 'partita_iva', label: 'Partita IVA', type: 'text', col: 6, placeholder: '01234567890' },
	{ name: 'iban', label: 'IBAN', type: 'text', required: true, col: 12, placeholder: 'IT60X0542811101000000123456' },
	{ name: '_billing_title', label: 'Billing Address', type: 'title' },
	{ name: 'billing_name', label: 'Name / Company', type: 'text', required: true, col: 12, placeholder: 'Name or Company Name' },
	{ name: 'billing_street', label: 'Street Address', type: 'text', required: true, col: 12, placeholder: 'Via Roma 1' },
	{ name: 'billing_city', label: 'City', type: 'text', required: true, col: 5, placeholder: 'Milano' },
	{ name: 'billing_zip', label: 'ZIP Code', type: 'text', required: true, col: 3, placeholder: '20100' },
	{ name: 'billing_province', label: 'Province', type: 'text', required: true, col: 4, placeholder: 'MI' },
	{ name: 'billing_country', label: 'Country', type: 'smartselect', required: true, col: 6, options: COUNTRY_OPTIONS },
	{ name: '_electronic_title', label: 'Electronic Invoicing', type: 'title' },
	{ name: 'pec', label: 'PEC', type: 'email', col: 6, placeholder: 'invoicing@pec.it' },
	{ name: 'sdi', label: 'SDI Code', type: 'text', col: 6, placeholder: '0000000' },
];

const loadData = async () => {
	const res = await user_me();
	if ( res.ok && res.data ) {
		const meta = ( res.data as any ).metadata ?? {};
		const fiscal = meta.fiscal_data;
		if ( fiscal ) {
			values = { ...values, ...fiscal };
		}
	}
	isLoading = false;
};

const handleSubmit = () => {
	saved = true;
	onsave?.( values );
	clearTimeout( savedTimer );
	savedTimer = setTimeout( () => {
		saved = false;
	}, 3000 );
};

onMount( () => {
	loadData();
} );
</script>

<div class="fiscal-form">
	<div class="page-header">
		<h3 class="page-title">
			<span class="material-icons header-icon">receipt_long</span>
			Fiscal Data
		</h3>
		<p class="page-subtitle">Required for point-to-EUR conversion requests</p>
	</div>

	{#if isLoading}
		<div class="loading">
			<span class="material-icons spin">autorenew</span>
			Loading...
		</div>
	{:else}
		<div class="form-panel">
			<FormCreator
				{fields}
				bind:values
				submitLabel="Save Fiscal Data"
				onsubmit={handleSubmit}
			/>
		</div>

		{#if saved}
			<div class="success-msg">
				<span class="material-icons">check_circle</span>
				Fiscal data saved successfully
			</div>
		{/if}
	{/if}
</div>

<style>
.fiscal-form {
	max-width: 700px;
}

.page-header {
	margin-bottom: 1rem;
	padding-bottom: 0.75rem;
	border-bottom: 1px solid var(--wox-border, #333);
}

.page-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin: 0;
	font-size: 1.1rem;
	font-weight: 600;
	color: var(--wox-text-primary, #eee);
}

.header-icon {
	color: var(--wox-accent, #00e5ff);
	font-size: 22px;
}

.page-subtitle {
	margin: 0.25rem 0 0;
	font-size: 0.85rem;
	color: var(--wox-text-secondary, #999);
}

.form-panel {
	padding: 1rem;
	background: var(--wox-bg-panel, #17171a);
	border: 1px solid var(--wox-border, #333);
	border-radius: var(--wox-radius-lg, 8px);
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	min-height: 200px;
	color: var(--wox-text-secondary, #999);
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.spin {
	animation: spin 1s linear infinite;
}

.success-msg {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-top: 1rem;
	padding: 0.6rem 1rem;
	border-radius: var(--wox-radius-md, 6px);
	background: rgba(16, 185, 129, 0.1);
	border: 1px solid rgba(16, 185, 129, 0.3);
	color: #10b981;
	font-size: 0.9rem;
}

.success-msg .material-icons {
	font-size: 20px;
}
</style>
