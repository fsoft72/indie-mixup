<script lang="ts">
// Test stub replacing @liwe3/webcomponents-svelte's SmartSelect.
// See AIMarkdownEditorStub.svelte for why a stub is needed.
interface Props {
	value? : string | string[];
	options? : { label : string; value : string }[];
	placeholder? : string;
	multiple? : boolean;
	searchable? : boolean;
	disabled? : boolean;
	onchange? : ( value : string | string[] | undefined ) => void;
	[key : string] : any;
}

let { value, options = [], placeholder, multiple = false, searchable = false, disabled = false, onchange } : Props = $props();
</script>

<div
	data-testid="smart-select-stub"
	data-value={Array.isArray( value ) ? JSON.stringify( value ) : value}
	data-placeholder={placeholder}
	data-multiple={multiple}
	data-searchable={searchable}
	data-disabled={disabled}
	data-options-count={options.length}
>
	<button type="button" onclick={() => onchange?.( 'opt-1' )}>trigger-change</button>
</div>
