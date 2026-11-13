<script lang="ts">
import { DataGrid } from '@frontend/liwe3';
import type { DataGridAction, DataGridField, DataGridRow } from '@frontend/liwe3';
import { onMount } from 'svelte';
import { Eye } from 'svelte-hero-icons';
import { dialogAdd } from '@liwe3/webcomponents-svelte';
import type { ActivityLogEvent } from '../types';
import { activity_log_list } from '../actions';

/** Maximum events to fetch at once */
const FETCH_LIMIT = 200;

/** Module badge color map */
const MODULE_COLORS : Record<string, string> = {
	user: '#3b82f6',
	supplier: '#10b981',
	order: '#7c3aed',
	m3wallet: '#f59e0b',
	m3config: '#14b8a6',
	product: '#ec4899',
};

/** Default module badge color */
const MODULE_COLOR_DEFAULT = '#64748b';

/** List of known modules for filter dropdown */
const KNOWN_MODULES = [ 'user', 'supplier', 'order', 'm3wallet', 'm3config', 'product' ];

/** State */
let events : ActivityLogEvent[] = $state( [] );
let isLoading = $state( true );
let selectedModule = $state( '' );

/** Abbreviate an ID string for display */
const abbreviateId = ( id : string | undefined ) : string => {
	if ( !id ) return '-';
	if ( id.length <= 8 ) return id;
	return id.slice( 0, 4 ) + '...' + id.slice( -4 );
};

/** Get module badge color */
const moduleColor = ( mod : string ) : string => MODULE_COLORS[mod] ?? MODULE_COLOR_DEFAULT;

/** Render a colored module badge as HTML */
const renderModuleBadge = ( mod : string ) : string => {
	const color = moduleColor( mod );
	return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:${color}20;color:${color};font-weight:600;font-size:0.85em;text-transform:uppercase">${mod}</span>`;
};

/** Truncate data JSON for preview */
const truncateData = ( data : any ) : string => {
	if ( data == null ) return '-';
	try {
		const json = typeof data === 'string' ? data : JSON.stringify( data );
		if ( json.length <= 50 ) return json;
		return json.slice( 0, 47 ) + '...';
	} catch {
		return '-';
	}
};

/** DataGrid field definitions */
const fields : DataGridField[] = [
	{
		name: 'id_user',
		label: 'User',
		sortable: true,
		type: 'string',
		render: ( v : string ) => abbreviateId( v ),
	},
	{
		name: 'module',
		label: 'Module',
		sortable: true,
		type: 'string',
		render: ( v : string ) => renderModuleBadge( v ),
		options: {
			filterSelect: [
				{ value: '', label: 'All' },
				...KNOWN_MODULES.map( ( m ) => ( { value: m, label: m } ) ),
			],
			filterSelectShowSelect: true,
		},
	},
	{
		name: 'event',
		label: 'Event',
		sortable: true,
		filterable: true,
		type: 'string',
	},
	{
		name: 'data',
		label: 'Data',
		type: 'string',
		render: ( v : any ) => `<span style="font-family:var(--wox-font-mono,monospace);font-size:0.8em;color:var(--wox-text-secondary,#999)">${truncateData( v )}</span>`,
	},
];

/** Show full event data in a dialog */
const showDetails = ( row : DataGridRow ) => {
	const prettyJson = row.data != null
		? JSON.stringify( row.data, null, 2 )
		: 'No data';

	dialogAdd( {
		title: `Event Details: ${row.event}`,
		body: `
			<div style="font-family:var(--wox-font-mono,monospace);font-size:0.85em;white-space:pre-wrap;word-break:break-all;max-height:400px;overflow-y:auto;padding:0.75rem;background:var(--wox-bg-panel,#17171a);border:1px solid var(--wox-border,#333);border-radius:var(--wox-radius-md,6px);color:var(--wox-text-primary,#eee)">
				<p style="margin:0 0 0.5rem;color:var(--wox-text-secondary,#999);font-family:var(--wox-font,'Inter',sans-serif)"><strong>Module:</strong> ${row.module} &nbsp; <strong>User:</strong> ${
			row.id_user || '-'
		}</p>
				<hr style="border:none;border-top:1px solid var(--wox-border,#333);margin:0.5rem 0">
				${prettyJson}
			</div>`,
		buttons: [
			{ label: 'Close', onclick: ( dialog : any ) => dialog?.close() },
		],
	} );
};

/** DataGrid actions */
const actions : DataGridAction[] = [
	{ label: 'Details', icon: Eye, mode: 'mode3', onclick: showDetails },
];

/** Fetch activity log events from API */
const loadData = async () => {
	isLoading = true;

	const params : Record<string, any> = {
		limit: FETCH_LIMIT,
		sort: '-created',
	};

	if ( selectedModule ) params.module = selectedModule;

	const res = await activity_log_list( params );

	if ( res.ok && res.data ) {
		events = res.data;
	}

	isLoading = false;
};

/** Handle module filter change */
const handleModuleChange = ( e : Event ) => {
	const target = e.target as HTMLSelectElement;
	selectedModule = target.value;
	loadData();
};

onMount( () => {
	loadData();
} );
</script>

<div class="admin-audit-log">
	<div class="page-header">
		<h2 class="page-title">
			<span class="material-icons">history</span>
			Audit Log
		</h2>
		<div class="header-filters">
			<label class="filter-label">
				<span class="material-icons">filter_list</span>
				<select class="filter-select" value={selectedModule} onchange={handleModuleChange}>
					<option value="">All Modules</option>
					{#each KNOWN_MODULES as mod}
						<option value={mod}>{mod}</option>
					{/each}
				</select>
			</label>
		</div>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<span class="material-icons spin">sync</span>
			<span>Loading audit log...</span>
		</div>
	{:else}
		<DataGrid
			title=""
			{fields}
			data={events}
			{actions}
			rowsPerPage={25}
		/>
	{/if}
</div>

<style>
.admin-audit-log {
	width: 100%;
	padding: 1rem;
}

.page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 1rem;
	padding-bottom: 0.75rem;
	border-bottom: 1px solid var(--wox-border, #333);
	flex-wrap: wrap;
	gap: 0.75rem;
}

.page-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin: 0;
	font-size: 1.25rem;
	font-weight: 600;
	color: var(--wox-text-primary, #eee);
}

.page-title .material-icons {
	font-size: 24px;
	color: var(--wox-accent, #00e5ff);
}

.header-filters {
	display: flex;
	gap: 0.75rem;
}

.filter-label {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	color: var(--wox-text-secondary, #999);
}

.filter-label .material-icons {
	font-size: 18px;
}

.filter-select {
	padding: 0.35rem 0.6rem;
	border: 1px solid var(--wox-border, #333);
	border-radius: var(--wox-radius-md, 6px);
	background: var(--wox-bg-panel, #17171a);
	color: var(--wox-text-primary, #eee);
	font-family: var(--wox-font, "Inter", sans-serif);
	font-size: 0.85rem;
	cursor: pointer;
	transition: border-color var(--wox-transition-fast, 0.12s ease);
}

.filter-select:hover {
	border-color: var(--wox-accent, #00e5ff);
}

.filter-select:focus {
	outline: none;
	border-color: var(--wox-accent, #00e5ff);
}

/* Loading */
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.75rem;
	padding: 4rem 2rem;
	color: var(--wox-text-secondary, #999);
	font-size: 1rem;
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

@media (max-width: 768px) {
	.page-header {
		flex-direction: column;
		align-items: flex-start;
	}
}
</style>
