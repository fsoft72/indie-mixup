<!-- Test-only host that feeds real (non-raw) `{#each}` markup into VerticalDND's
     children snippet, since createRawSnippet only supports a single root element
     and VerticalDND needs multiple sibling children to wrap. -->
<script lang="ts">
import VerticalDND from '../VerticalDND.svelte';

interface Props {
	items? : string[];
	disabled? : boolean;
	handlePosition? : 'left' | 'right';
	onreorder? : ( newOrder : any[] ) => void;
}

let {
	items = [ 'Item 1', 'Item 2', 'Item 3' ],
	disabled = false,
	handlePosition = 'right',
	onreorder,
} : Props = $props();
</script>

<VerticalDND {items} {disabled} {handlePosition} {onreorder}>
	{#each items as item (item)}
		<div class="host-item">{item}</div>
	{/each}
</VerticalDND>
