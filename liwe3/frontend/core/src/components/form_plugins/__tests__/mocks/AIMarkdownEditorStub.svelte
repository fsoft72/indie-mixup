<script lang="ts">
// Test stub replacing @liwe3/webcomponents-svelte's AIMarkdownEditor.
// The real component ships uncompiled .svelte in its dist folder, which
// vite-plugin-svelte will not transform when loaded from node_modules,
// so it cannot be rendered directly inside vitest/jsdom.
interface Props {
	value? : string;
	apiKey? : string;
	suggestionDelay? : number;
	systemPrompt? : string;
	apiEndpoint? : string;
	modelName? : string;
	context? : string;
	onchange? : ( value : string ) => void;
	[key : string] : any;
}

let { value = '', apiKey, suggestionDelay, systemPrompt, apiEndpoint, modelName, context, onchange } : Props = $props();
</script>

<div
	data-testid="ai-markdown-editor-stub"
	data-value={value}
	data-api-key={apiKey}
	data-suggestion-delay={suggestionDelay}
	data-system-prompt={systemPrompt}
	data-api-endpoint={apiEndpoint}
	data-model-name={modelName}
	data-context={context}
>
	<button type="button" onclick={() => onchange?.( 'new markdown value' )}>trigger-change</button>
</div>
