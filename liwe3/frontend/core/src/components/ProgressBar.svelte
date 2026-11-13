<script lang="ts">
import type { Color } from '../types/types';

interface _props {
	text? : string;
	percentage? : number;
	mode? : Color;
}

let { text = '', percentage = 0, mode = 'primary' } : _props = $props();
</script>

<div class="liwe3-progress-bar">
	<div class="liwe3-progress-bar__fill" style:width={percentage + '%'}></div>
	{#if text}
		<div class="liwe3-progress-bar__text">{text}</div>
	{/if}
</div>

<style>
.liwe3-progress-bar {
	width: 100%;
	height: 20px;
	border: 1px solid var(--liwe3-border);
	background-color: var(--liwe3-surface-sunken);
	border-radius: var(--liwe3-radius-full);
	overflow: hidden;
	position: relative;
}

.liwe3-progress-bar__text {
	position: absolute;
	font-size: var(--liwe3-text-xs);
	left: var(--liwe3-space-2);
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	text-align: left;
	color: var(--liwe3-text);
}

.liwe3-progress-bar__fill {
	height: 100%;
	background-color: var(--liwe3-primary);
	transition: width var(--liwe3-duration-base) var(--liwe3-ease-out);
}
</style>
