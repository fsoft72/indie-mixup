<script lang="ts">
/**
 * DataGrid column visibility modal: one checkbox per field, toggling `hidden`.
 */

import Checkbox from '../Checkbox.svelte';
import Modal from '../Modal.svelte';
import type { DataGridField } from './datagrid_types';

interface Props {
	fields : DataGridField[];

	onclose : () => void;
}

let { fields, onclose } : Props = $props();
</script>

<Modal title="Fields show" {onclose} oncancel={onclose}>
	<div class="fields-cont">
		{#each fields as field}
			<div class="field">
				<Checkbox
					checked={!field.hidden}
					onchange={( e : any ) => ( field.hidden = !e.target?.checked )}
					label={field.label || field.name}
				/>
			</div>
		{/each}
	</div>
</Modal>
