<script lang="ts">
import { onMount } from 'svelte';
import { DataGrid, type DataGridField } from '@frontend/liwe3';
import type { WalletTransaction } from '../types';
import { wallet_list, wallet_transaction_list } from '../actions';

/**
 * DataGrid of wallet transactions with type filtering, date range, and pagination.
 */
interface Props {
	/** Optional wallet ID (if not provided, loads user's first active wallet) */
	idWallet? : string;
}

let { idWallet } : Props = $props();

let transactions : WalletTransaction[] = $state( [] );
let loading = $state( true );
let appending = $state( false );
let typeFilter = $state( '' );
let walletId = $state( idWallet || '' );
let offset = $state( 0 );
let hasMore = $state( false );
const PAGE_SIZE = 25;

const TYPE_OPTIONS = [
	{ value: '', label: 'All Types' },
	{ value: 'credit', label: 'Credit' },
	{ value: 'debit', label: 'Debit' },
	{ value: 'transfer', label: 'Transfer' },
];

const EUR_FORMATTER = new Intl.NumberFormat( 'it-IT', { style: 'currency', currency: 'EUR' } );

const formatCents = ( cents : number ) : string => {
	if ( cents == null ) return '\u20AC 0.00';
	return EUR_FORMATTER.format( cents / 100 );
};

const formatDateTime = ( val : string ) : string => {
	if ( !val ) return '-';
	return new Date( val ).toLocaleDateString( 'it-IT', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	} );
};

const TYPE_COLORS : Record<string, string> = {
	credit: '#10b981',
	debit: '#ef4444',
	transfer: '#6366f1',
};

const typeColor = ( type : string ) : string => TYPE_COLORS[type] || '#64748b';

const fields : DataGridField[] = [
	{
		name: 'created',
		type: 'string',
		label: 'Date',
		sortable: true,
		width: '160px',
		render: ( _value : string, row : any ) => {
			const meta = row.metadata;
			const dateStr = meta?.created || row.id;
			return formatDateTime( dateStr );
		},
	},
	{
		name: 'transaction_type',
		type: 'string',
		label: 'Type',
		sortable: true,
		width: '100px',
		render: ( value : string ) => {
			const color = typeColor( value );
			const label = value.charAt( 0 ).toUpperCase() + value.slice( 1 );
			return `<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:${color}"></span>${label}</span>`;
		},
	},
	{
		name: 'amount',
		type: 'number',
		label: 'Amount',
		sortable: true,
		width: '120px',
		align: 'right',
		render: ( value : number, row : any ) => {
			const isDebit = row.transaction_type === 'debit';
			const sign = isDebit ? '-' : '+';
			const color = isDebit ? '#ef4444' : '#10b981';
			return `<strong style="color: ${color}">${sign}${formatCents( value )}</strong>`;
		},
	},
	{
		name: 'balance_after',
		type: 'number',
		label: 'Balance',
		width: '120px',
		align: 'right',
		render: ( value : number ) => formatCents( value ),
	},
	{
		name: 'description',
		type: 'string',
		label: 'Description',
		render: ( value : string ) => value || '-',
	},
];

const resolveWallet = async () => {
	if ( walletId ) return;

	const res = await wallet_list( { is_active: true } );
	if ( res.ok && res.data && res.data.length > 0 ) {
		walletId = res.data[0].id;
	}
};

const loadTransactions = async ( append = false ) => {
	if ( !walletId ) return;

	if ( append ) {
		appending = true;
	} else {
		loading = true;
	}

	const res = await wallet_transaction_list( {
		id_wallet: walletId,
		transaction_type: typeFilter || undefined,
		offset,
		limit: PAGE_SIZE,
	} );

	if ( res.ok && res.data ) {
		if ( append ) {
			transactions = [ ...transactions, ...res.data ];
		} else {
			transactions = res.data;
		}
		hasMore = res.data.length === PAGE_SIZE;
	}

	loading = false;
	appending = false;
};

const handleFilterChange = ( e : Event ) => {
	typeFilter = ( e.target as HTMLSelectElement ).value;
	offset = 0;
	loadTransactions();
};

const handleLoadMore = () => {
	offset += PAGE_SIZE;
	loadTransactions( true );
};

onMount( async () => {
	await resolveWallet();
	loadTransactions();
} );
</script>

<div class="transaction-history">
	<div class="history-header">
		<h2 class="history-title">
			<span class="material-icons">receipt_long</span>
			Transaction History
		</h2>
		<div class="history-filters">
			<select class="type-filter" value={typeFilter} onchange={handleFilterChange}>
				{#each TYPE_OPTIONS as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if loading && transactions.length === 0}
		<div class="history-loading">
			<span class="material-icons spin">autorenew</span>
			Loading transactions...
		</div>
	{:else if !walletId}
		<div class="history-empty">
			<span class="material-icons">account_balance_wallet</span>
			<h3>No wallet found</h3>
			<p>Your wallet will be created when you receive your first commission.</p>
		</div>
	{:else if transactions.length === 0}
		<div class="history-empty">
			<span class="material-icons">receipt_long</span>
			<h3>No transactions</h3>
			<p>{typeFilter ? 'No transactions of this type.' : 'No transactions recorded yet.'}</p>
		</div>
	{:else}
		<DataGrid
			{fields}
			data={transactions}
		/>

		{#if hasMore}
			<div class="load-more">
				<button class="load-more-btn" onclick={handleLoadMore} disabled={appending}>
					{#if appending}
						<span class="material-icons spin">autorenew</span>
						Loading...
					{:else}
						<span class="material-icons">expand_more</span>
						Load More
					{/if}
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
.transaction-history {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.history-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 0.75rem;
}

.history-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin: 0;
	font-size: 1.25rem;
	font-weight: 600;
	color: var(--wox-text-primary, #eee);
}

.history-title .material-icons {
	font-size: 24px;
	color: var(--wox-accent, #00e5ff);
}

.history-filters {
	display: flex;
	gap: 0.5rem;
}

.type-filter {
	padding: 0.4rem 0.75rem;
	background: var(--wox-bg-input, #1a1a1d);
	border: 1px solid var(--wox-border, #333);
	border-radius: var(--wox-radius-md, 6px);
	color: var(--wox-text-primary, #eee);
	font-family: var(--wox-font, "Inter", sans-serif);
	font-size: 0.85rem;
}

.type-filter:focus {
	outline: none;
	border-color: var(--wox-accent, #00e5ff);
}

.history-loading,
.history-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 300px;
	gap: 0.75rem;
	color: var(--wox-text-secondary, #999);
}

.history-loading .material-icons,
.history-empty .material-icons {
	font-size: 48px;
}

.history-empty h3 {
	margin: 0;
	color: var(--wox-text-primary, #eee);
}

.history-empty p {
	margin: 0;
}

.load-more {
	display: flex;
	justify-content: center;
	padding: 0.5rem;
}

.load-more-btn {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	padding: 0.5rem 1.5rem;
	border: 1px solid var(--wox-border, #333);
	border-radius: var(--wox-radius-md, 6px);
	background: transparent;
	color: var(--wox-text-secondary, #999);
	font-family: var(--wox-font, "Inter", sans-serif);
	font-size: 0.85rem;
	cursor: pointer;
	transition: all var(--wox-transition-fast, 0.12s ease);
}

.load-more-btn:hover:not(:disabled) {
	border-color: var(--wox-accent, #00e5ff);
	color: var(--wox-text-primary, #eee);
}

.load-more-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.load-more-btn .material-icons {
	font-size: 18px;
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
</style>
