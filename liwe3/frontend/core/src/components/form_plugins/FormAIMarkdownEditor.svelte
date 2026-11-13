<script lang="ts">
import { AIMarkdownEditor } from '@liwe3/webcomponents-svelte';
import type { FormField } from '../FormCreator.svelte';

interface Props {
	field : FormField;

	name : string;

	// dependency injection
	_v : ( field : FormField ) => any;

	// events
	onchange : ( name : string, value : any, field : FormField ) => void;

	// extra
	[key : string] : any;
}

let { field, name, onchange, _v, ...props } : Props = $props();

// Get the current value
const currentValue = $derived.by( () => {
	const val = _v( field );
	return val ?? '';
} );
</script>

<div class="form-ai-markdown-editor">
	{#if field?.label}
		<label for={name} class="label">{field.label}</label>
	{/if}
	<AIMarkdownEditor
		value={currentValue}
		apiKey={field?.extra?.apiKey ?? ''}
		suggestionDelay={field?.extra?.suggestionDelay ?? 3000}
		systemPrompt={field?.extra?.systemPrompt
		?? "You are a helpful writing assistant. Continue the user's text naturally and coherently. Provide 1-3 sentences that would logically follow their writing. Keep the same tone and style. Do not repeat what they've already written."}
		apiEndpoint={field?.extra?.apiEndpoint ?? 'https://api.openai.com/v1/chat/completions'}
		modelName={field?.extra?.modelName ?? 'gpt-3.5-turbo'}
		context={field?.extra?.context ?? ''}
		{...field?.extra ?? {}}
		{...props}
		onchange={( val : string ) => onchange( name, val, field )}
	/>
</div>

<style>
.form-ai-markdown-editor {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;

	min-height: 300px;
}

.label {
	font-size: 0.8rem;
	font-weight: 500;
	user-select: none;
}
</style>
