<script lang="ts">
interface _props {
	title? : string;
	children? : import('svelte').Snippet;
}

let { title = '', children } : _props = $props();
</script>

<section class="liwe3-section">
	{#if title}
		<h3 class="liwe3-section__title">{title}</h3>
	{/if}
	<div class="liwe3-section__body">
		{@render children?.()}
	</div>
</section>

<style>
.liwe3-section {
	background-color: var(--liwe3-surface);
	border: 1px solid var(--liwe3-border);
	border-radius: var(--liwe3-radius-lg);
	padding: var(--liwe3-space-4);
}

.liwe3-section__title {
	margin: 0 0 var(--liwe3-space-3);
	font-size: var(--liwe3-text-lg);
	font-weight: 600;
	color: var(--liwe3-text);
}
</style>
