<script lang="ts">
import { fade } from 'svelte/transition';
import { safeHTML } from '../../utils/utils';
import {
	CheckCircle as SuccessIcon,
	ExclamationCircle as ErrorIcon,
	Icon,
	InformationCircle as InfoIcon,
	QuestionMarkCircle as WarningIcon,
	XMark as CloseIcon,
} from 'svelte-hero-icons';

interface ToastProps {
	type? : 'success' | 'error' | 'warning' | 'info';
	dismissible? : boolean;
	title? : string;
	message? : string;

	// events
	ondismiss? : () => void;
}

let {
	type = 'error',
	dismissible = true,
	title = '',
	message = '',
	ondismiss,
} : ToastProps = $props();
</script>

<article class="liwe3-toast liwe3-toast--{type}" role="alert" transition:fade>
	<div class="liwe3-toast__header">
		<div class="liwe3-toast__title">
			{#if type === 'success'}
				<Icon src={SuccessIcon} width="1.1em" />
			{:else if type === 'error'}
				<Icon src={ErrorIcon} width="1.1em" />
			{:else if type === 'warning'}
				<Icon src={WarningIcon} width="1.1em" />
			{:else}
				<Icon src={InfoIcon} width="1.1em" />
			{/if}
			<span>{title}</span>
		</div>

		{#if dismissible}
			<button
				class="liwe3-toast__close"
				onclick={() => {
					ondismiss && ondismiss();
				}}
			>
				<Icon src={CloseIcon} width="0.8em" />
			</button>
		{/if}
	</div>

	<div class="liwe3-toast__body">
		{@html safeHTML( message )}
	</div>
</article>

<style>
.liwe3-toast {
	display: flex;
	flex-direction: column;
	border-radius: var(--liwe3-radius-lg);
	margin: 0 auto var(--liwe3-space-2) auto;
	width: 20rem;
	overflow: hidden;
	box-shadow: var(--liwe3-shadow-lg);
}

.liwe3-toast__header {
	width: 100%;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	padding: var(--liwe3-space-2) var(--liwe3-space-3);
	background: var(--liwe3-active-overlay);
	user-select: none;
}

.liwe3-toast__title {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--liwe3-space-2);
	font-weight: var(--liwe3-weight-semibold);
}

.liwe3-toast__body {
	padding: var(--liwe3-space-3);
	font-size: var(--liwe3-text-sm);
	line-height: var(--liwe3-leading-relaxed);
}

.liwe3-toast--error {
	background: var(--liwe3-error);
	color: var(--liwe3-text-on-error);
}
.liwe3-toast--success {
	background: var(--liwe3-success);
	color: var(--liwe3-text-on-success);
}
.liwe3-toast--warning {
	background: var(--liwe3-warning);
	color: var(--liwe3-text-on-warning);
}
.liwe3-toast--info {
	background: var(--liwe3-info);
	color: var(--liwe3-text-on-info);
}

.liwe3-toast__close {
	color: inherit;
	background: transparent;
	border: none;
	padding: 0;
	margin: 0 0 0 auto;
	line-height: 1;
	font-size: var(--liwe3-text-base);
	cursor: pointer;
	opacity: 0.7;
	transition: opacity var(--liwe3-duration-fast) var(--liwe3-ease-out);
}

.liwe3-toast__close:hover {
	opacity: 1;
}
</style>
