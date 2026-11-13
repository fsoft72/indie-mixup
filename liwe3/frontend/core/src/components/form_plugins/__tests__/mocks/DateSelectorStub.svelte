<script lang="ts">
// Test stub replacing @liwe3/webcomponents-svelte's DateSelector.
// See AIMarkdownEditorStub.svelte for why a stub is needed.
interface Props {
	rangeMode? : boolean;
	selectedDate? : string | null;
	selectedRange? : { start : string | null; end : string | null };
	ondateselected? : ( date : string ) => void;
	onrangeselected? : ( range : { start : string | null; end : string | null } ) => void;
	[key : string] : any;
}

let { rangeMode = false, selectedDate, selectedRange, ondateselected, onrangeselected } : Props = $props();
</script>

<div
	data-testid="date-selector-stub"
	data-range-mode={rangeMode}
	data-selected-date={selectedDate}
	data-selected-range={selectedRange ? JSON.stringify( selectedRange ) : undefined}
>
	<button type="button" onclick={() => ondateselected?.( '2024-01-15' )}>trigger-date</button>
	<button type="button" onclick={() => onrangeselected?.( { start: '2024-01-01', end: '2024-01-31' } )}>
		trigger-range
	</button>
</div>
