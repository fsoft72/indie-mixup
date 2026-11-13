<script lang="ts">
/**
 * DataGrid title bar: grid title, column visibility button, view mode selector
 * and the caller defined buttons.
 */

import Button from '../Button.svelte';
import Checkbox from '../Checkbox.svelte';
import type { Color } from '../../types/types';
import { mkid } from '../../utils/utils';
import type { DataGridButton } from './datagrid_types';

interface Props {
	title? : string;
	buttons? : DataGridButton[];
	mode? : Color;
	viewMode? : string;

	onviewmodechange : ( viewMode : string ) => void;
	onshowfields : () => void;
}

let {
	title,
	buttons,
	mode = 'accent',
	viewMode = 'comfy',
	onviewmodechange,
	onshowfields,
} : Props = $props();

const VIEW_MODES = [ 'condensed', 'comfy', 'large' ];

// unique per instance: two grids on the same page must not share the radio group
const groupId = mkid( 'dg-vm' );

/**
 * Runs a button action, toggling its state first when it is a checkbox button.
 *
 * @param button - the button that was activated
 */
const handleButtonClick = ( button : DataGridButton ) => {
	if ( button.type === 'checkbox' ) button.checked = !button.checked;

	button.onclick( button.checked );
};
</script>

<div class="title-bar">
	<div class="title">
		<Button size="xs" onclick={onshowfields}>Fields</Button>
		{title}
	</div>

	<div class="view-modes">
		<div class="radio-group">
			{#each VIEW_MODES as vm}
				<input
					type="radio"
					id={`${groupId}-${vm}`}
					name={groupId}
					checked={vm === viewMode}
					onchange={() => onviewmodechange( vm )}
				/>
				<label for={`${groupId}-${vm}`}>{vm}</label>
			{/each}
		</div>
	</div>

	{#if buttons}
		<div class="buttons">
			{#each buttons as button}
				{#if !button.hidden}
					{#if button.type === 'checkbox'}
						<Checkbox
							size="md"
							mode={button.mode || mode}
							checked={button.checked || false}
							onchange={() => handleButtonClick( button )}
							label={button.label}
						/>
					{:else}
						<Button
							size="md"
							mode={button.mode || mode}
							variant={button.variant}
							icon={button.icon}
							onclick={() => handleButtonClick( button )}
						>
							{button.label}
						</Button>
					{/if}
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
.title-bar {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	padding: var(--liwe3-space-1);
	background-color: var(--liwe3-surface-sunken);
	border-bottom: 1px solid var(--liwe3-border-subtle);
}

.title {
	font-weight: var(--liwe3-weight-semibold);
	color: var(--liwe3-text);
}

.buttons {
	display: flex;
	flex-direction: row;
	gap: var(--liwe3-space-2);
}

.radio-group {
	display: flex;
	flex-direction: row;
	gap: var(--liwe3-space-2);
}
</style>
