<script module lang="ts">
export type CheckListItemType = {
	id : string;
	text : string;
	completed : boolean;
};

export type CheckListType = {
	id : string;
	title : string;
	items : CheckListItemType[];
};
</script>

<script lang="ts">
import { Trash } from 'svelte-hero-icons';
import Button from './Button.svelte';
import ProgressBar from './ProgressBar.svelte';
import { mkid_simple } from '../utils/utils';

interface Props {
	checklist : CheckListType;

	titleEditable? : boolean;
	showDeleteCheckList? : boolean;
	showAddItem? : boolean;
	showDeleteItem? : boolean;

	// events
	ondeleteitem? : ( checklistId : string, itemId : string ) => void;
	ontoggleitem? : (
		checklistId : string,
		itemId : string,
		completed : boolean,
	) => void;
	onadditem? : ( checklistId : string, item : CheckListItemType ) => void;
	onupdatetitle? : ( checklistId : string, title : string ) => void;

	ondeletechecklist? : ( checklistId : string ) => void;
}

let {
	checklist,
	showDeleteCheckList = true,
	showAddItem = true,
	showDeleteItem = true,
	titleEditable = true,

	ondeleteitem,
	ontoggleitem,
	onadditem,
	onupdatetitle,
	ondeletechecklist,
} : Props = $props();

// svelte-ignore state_referenced_locally (local editable copy of the checklist prop, changes are emitted back via events)
let title = $state( checklist.title );
let newItemText = $state( '' );

// checklist.items is the array actually rendered/mutated via bind:checked below,
// so progress must be derived from it directly rather than from a local copy.
const completedCount = $derived(
	checklist.items.filter( ( item ) => item.completed ).length,
);
const progress = $derived(
	checklist.items.length > 0
		? ( completedCount / checklist.items.length ) * 100
		: 0,
);

const handleToggle = ( itemId : string, event : Event ) => {
	const target = event.target as HTMLInputElement;
	ontoggleitem?.( checklist.id, itemId, target.checked );
};

const handleAddItem = () => {
	if ( newItemText.trim() ) {
		const it : CheckListItemType = {
			id: mkid_simple( 'it' ),
			text: newItemText.trim(),
			completed: false,
		};

		onadditem?.( checklist.id, it );
		newItemText = ''; // Clear input
	}
};

const handleAddItemKeydown = ( event : KeyboardEvent ) => {
	if ( event.key === 'Enter' ) {
		handleAddItem();
	}
};

const handleDelItem = ( checklistId : string, itemId : string ) => {
	// items = items.filter((item) => item.id !== itemId);
	ondeleteitem?.( checklistId, itemId );
};
</script>

<div class="checklist-container">
	<div class="section-header">
		{#if titleEditable}
			<input
				type="text"
				bind:value={title}
				class="checklist-title-input"
				placeholder="Checklist title"
				oninput={( e ) => {
					const target = e.target as HTMLInputElement;
					onupdatetitle?.( checklist.id, target.value );
				}}
			/>
		{:else}
			<span class="sect-title">{checklist.title}</span>
		{/if}
		{#if showDeleteCheckList && ondeletechecklist}
			<button
				class="delete-checklist-button"
				onclick={() => ondeletechecklist?.( checklist.id )}
			>
				Delete
			</button>
		{/if}
	</div>

	<ProgressBar percentage={progress} mode="neutral" />

	<div class="checklist-items">
		{#each checklist.items as item (item.id)}
			<div class="checklist-item">
				<input
					type="checkbox"
					id={`item-${item.id}`}
					bind:checked={item.completed}
					onchange={( e ) => handleToggle( item.id, e )}
				/>
				<label for={`item-${item.id}`} class:completed={item.completed}>{item.text}</label>
				{#if showDeleteItem}
					<Button
						mode="warning"
						size="xs"
						icon={Trash}
						aria-label="Delete item"
						onclick={() => handleDelItem( checklist.id, item.id )}
					></Button>
				{/if}
			</div>
		{/each}
	</div>

	{#if showAddItem}
		<div class="add-item-section">
			<input
				type="text"
				bind:value={newItemText}
				placeholder="Add an item"
				onkeydown={handleAddItemKeydown}
			/>
			<Button
				mode="success"
				size="sm"
				disabled={!newItemText.trim()}
				onclick={handleAddItem}
			>Add</Button>
		</div>
	{/if}
</div>

<style>
.checklist-container {
	background-color: var(--liwe3-surface);
	padding: var(--liwe3-space-3);
	border: 1px solid var(--liwe3-border);
	border-radius: var(--liwe3-radius-md);
}
.section-header {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 10px;
	user-select: none;
}

.checklist-title-input {
	flex-grow: 1;
	font-size: 1.1em;
	font-weight: 600;
	border: none;
	padding: 5px;
	background-color: transparent;
	color: var(--liwe3-text);
}
.checklist-title-input:focus {
	outline: none;
	background-color: var(--liwe3-surface-sunken);
}
.sect-title {
	color: var(--liwe3-text);
}
.delete-checklist-button {
	background-color: var(--liwe3-surface-sunken);
	border: none;
	border-radius: 3px;
	color: var(--liwe3-text-muted);
	cursor: pointer;
	padding: 6px 12px;
	font-size: 0.9em;
	user-select: none;
}
.delete-checklist-button:hover {
	background-color: var(--liwe3-surface-raised);
}

.checklist-items {
	display: flex;
	flex-direction: column;
	gap: 5px;
	margin: 10px 0;
}
.checklist-item {
	display: flex;
	align-items: center;
	gap: 8px;
}
.checklist-item input[type="checkbox"] {
	width: 16px;
	height: 16px;
}
.checklist-item label {
	flex-grow: 1;
	color: var(--liwe3-text);
	user-select: none;
}
.checklist-item label.completed {
	text-decoration: line-through;
	color: var(--liwe3-text-muted);
}

.add-item-section {
	display: flex;
	gap: 8px;
}
.add-item-section input[type="text"] {
	flex-grow: 1;
	padding: 6px 12px;
	border: 1px solid var(--liwe3-border);
	border-radius: 3px;
	background-color: var(--liwe3-surface);
	color: var(--liwe3-text);
}
</style>
