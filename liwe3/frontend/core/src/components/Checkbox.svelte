<script lang="ts">
import type { Color, Size } from '../types/types';
import { mkid } from '../utils/utils';

interface Props {
	id? : string;
	name? : string;
	checked? : boolean;
	value? : string | number | boolean;

	divClass? : string;
	label? : string;
	mode? : Color;
	size? : Size;

	// events
	onblur? : ( event : FocusEvent ) => void;
	onchange? : ( event : Event ) => void;

	// rest
	[k : string] : any;
}

let {
	id = mkid( 'id' ),
	name = mkid( 'fld' ),
	label = '',
	size = 'md',
	mode = 'neutral',
	divClass = '',
	value = '',
	checked = $bindable(),
	onblur,
	onchange,
	...rest
} : Props = $props();
</script>

<div
	class="{divClass} liwe3-checkbox-container {size}"
	style="width: auto"
>
	{#if label}
		<label for={id} class="liwe3-label">{label}</label>
	{/if}
	<input
		{id}
		{name}
		{...rest}
		class="liwe3-checkbox {size}"
		type="checkbox"
		{value}
		bind:checked
		{onblur}
		{onchange}
	/>
</div>

<style>
.liwe3-checkbox-container {
	display: flex;
	flex-direction: row-reverse;
	align-items: center;
	justify-content: flex-end;
	gap: var(--liwe3-space-1);
	padding-block: var(--liwe3-space-1);
	padding-inline: var(--liwe3-space-2);
}

.liwe3-label {
	white-space: nowrap;
	color: var(--liwe3-text);
	user-select: none;
	font-size: var(--liwe3-text-sm);
}

.liwe3-checkbox-container.xxs {
	min-height: var(--liwe3-control-height-xxs);
}
.liwe3-checkbox-container.xxs .liwe3-label {
	font-size: var(--liwe3-text-xs);
}
.liwe3-checkbox-container.xs {
	min-height: var(--liwe3-control-height-xs);
}
.liwe3-checkbox-container.xs .liwe3-label {
	font-size: var(--liwe3-text-xs);
}
.liwe3-checkbox-container.sm {
	min-height: var(--liwe3-control-height-sm);
}
.liwe3-checkbox-container.sm .liwe3-label {
	font-size: var(--liwe3-text-sm);
}
.liwe3-checkbox-container.md {
	min-height: var(--liwe3-control-height-md);
}
.liwe3-checkbox-container.md .liwe3-label {
	font-size: var(--liwe3-text-base);
}
.liwe3-checkbox-container.lg {
	min-height: var(--liwe3-control-height-lg);
}
.liwe3-checkbox-container.lg .liwe3-label {
	font-size: var(--liwe3-text-lg);
}
.liwe3-checkbox-container.xl {
	min-height: var(--liwe3-control-height-xl);
}
.liwe3-checkbox-container.xl .liwe3-label {
	font-size: var(--liwe3-text-xl);
}
.liwe3-checkbox-container.xxl {
	min-height: var(--liwe3-control-height-xxl);
}
.liwe3-checkbox-container.xxl .liwe3-label {
	font-size: var(--liwe3-text-2xl);
}

input[type="checkbox"].liwe3-checkbox {
	background: var(--liwe3-surface-raised);
	border: 2px solid var(--liwe3-border);
	appearance: none;
	-webkit-appearance: none;
	-moz-appearance: none;
	position: relative;
	cursor: pointer;
	border-radius: var(--liwe3-radius-sm);
	transition: all var(--liwe3-duration-fast) var(--liwe3-ease-out);
}

input[type="checkbox"].liwe3-checkbox:hover {
	border-color: var(--liwe3-primary);
}

input[type="checkbox"].liwe3-checkbox:checked {
	background: var(--liwe3-primary);
	border-color: var(--liwe3-primary);
}

input[type="checkbox"].liwe3-checkbox:checked::after {
	content: "✓";
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	color: var(--liwe3-text-on-primary);
	font-weight: bold;
}

/* Size variants */
input[type="checkbox"].xxs {
	width: 1rem;
	height: 1rem;
	min-width: 1rem;
	min-height: 1rem;
}
input[type="checkbox"].xxs:checked::after {
	font-size: 0.6rem;
}

input[type="checkbox"].xs {
	width: 1.2rem;
	height: 1.2rem;
	min-width: 1.2rem;
	min-height: 1.2rem;
}
input[type="checkbox"].xs:checked::after {
	font-size: 0.7rem;
}

input[type="checkbox"].sm {
	width: 1.5rem;
	height: 1.5rem;
	min-width: 1.5rem;
	min-height: 1.5rem;
}
input[type="checkbox"].sm:checked::after {
	font-size: 0.9rem;
}

input[type="checkbox"].md {
	width: 2rem;
	height: 2rem;
	min-width: 2rem;
	min-height: 2rem;
}
input[type="checkbox"].md:checked::after {
	font-size: 1.2rem;
}

input[type="checkbox"].lg {
	width: 2.5rem;
	height: 2.5rem;
	min-width: 2.5rem;
	min-height: 2.5rem;
}
input[type="checkbox"].lg:checked::after {
	font-size: 1.5rem;
}

input[type="checkbox"].xl {
	width: 3rem;
	height: 3rem;
	min-width: 3rem;
	min-height: 3rem;
}
input[type="checkbox"].xl:checked::after {
	font-size: 1.8rem;
}

input[type="checkbox"].xxl {
	width: 3.5rem;
	height: 3.5rem;
	min-width: 3.5rem;
	min-height: 3.5rem;
}
input[type="checkbox"].xxl:checked::after {
	font-size: 2.1rem;
}
</style>
