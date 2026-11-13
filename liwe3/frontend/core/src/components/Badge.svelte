<script lang="ts">
import type { Color } from '../types/types';

interface _props {
	text : string;
	color? : Color;
	large? : boolean;
}

let { text, color = 'neutral', large = false } : _props = $props();
</script>

<span
	class="liwe3-badge"
	class:liwe3-badge--large={large}
	style:background-color={`var(--liwe3-${color}-subtle)`}
	style:border-color={`var(--liwe3-${color})`}
	style:color={`var(--liwe3-text-on-${color})`}
>{text}</span>

<style>
.liwe3-badge {
	display: inline-flex;
	align-items: center;
	padding: var(--liwe3-space-1) var(--liwe3-space-2);
	border: 1px solid;
	border-radius: var(--liwe3-radius-full);
	font-size: var(--liwe3-text-xs);
	font-weight: 600;
	line-height: 1;
	white-space: nowrap;
}

.liwe3-badge--large {
	font-size: 0.85rem;
	padding: 0.35rem 0.75rem;
}
</style>
