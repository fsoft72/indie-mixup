<script lang="ts">
import Button from './Button.svelte';

// Types for the component props
interface Props {
	/** Text to be copied or function that returns text */
	text : string | (() => string);
	/** Optional custom class for the button */
	class? : string;
	/** Optional success message */
	successMessage? : string;
	/** Optional error message */
	errorMessage? : string;
	/** Duration to show the feedback message in ms */
	feedbackDuration? : number;
}

let {
	text,
	class: className = '',
	successMessage = 'Copied!',
	errorMessage = 'Failed to copy',
	feedbackDuration = 2000,
} : Props = $props();

// State for handling copy feedback
let isCopied = $state( false );
let hasError = $state( false );
let feedbackText = $derived( hasError ? errorMessage : successMessage );
let feedbackTimeout : ReturnType<typeof setTimeout> | undefined;

/**
 * Handles the copy operation and manages feedback states
 */
const handleCopy = async () => {
	clearTimeout( feedbackTimeout );

	try {
		const valueToCopy = typeof text === 'function' ? text() : text;
		await navigator.clipboard.writeText( valueToCopy );
		isCopied = true;
		hasError = false;
	} catch ( err ) {
		console.error( 'Failed to copy text:', err );
		isCopied = true;
		hasError = true;
	}

	// Reset state after duration
	feedbackTimeout = setTimeout( () => {
		isCopied = false;
		hasError = false;
	}, feedbackDuration );
};
</script>

<Button onclick={handleCopy} aria-label={isCopied ? feedbackText : 'Copy to clipboard'}>
	{#if isCopied}
		<span class="liwe3-feedback" class:liwe3-feedback--error={hasError} class:liwe3-feedback--success={!hasError}>
			{feedbackText}
		</span>
	{:else}
		Copy to Clipboard
	{/if}
</Button>

<style>
.liwe3-feedback--success {
	background: var(--liwe3-success);
	color: var(--liwe3-text-on-success);
	padding: var(--liwe3-space-1) var(--liwe3-space-2);
	border-radius: var(--liwe3-radius-sm);
}

.liwe3-feedback--error {
	background: var(--liwe3-error);
	color: var(--liwe3-text-on-error);
	padding: var(--liwe3-space-1) var(--liwe3-space-2);
	border-radius: var(--liwe3-radius-sm);
}

.liwe3-feedback {
	font-size: var(--liwe3-text-sm);
}
</style>
