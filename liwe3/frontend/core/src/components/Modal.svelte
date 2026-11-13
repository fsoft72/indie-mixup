<script module lang="ts">
export type ModalAction = {
	label : string;
	mode? : Color;
	action : Function;
};

// Stack of currently-open modal ids, topmost last. Lets nested/stacked
// Modal instances agree on which one should react to a single Escape press.
let openModalStack : symbol[] = [];

export interface ModalProps {
	title : string;
	size? : Size | string;
	mode? : Color;
	closeOnEsc? : boolean;
	closeOnOutsideClick? : boolean;
	padding? : string;
	showCloseButton? : boolean;
	actions? : ModalAction[];

	oncancel? : ( cancel : boolean ) => void;
	onclose? : ( close : boolean ) => void;

	children? : any;
}
</script>

<script lang="ts">
import type { Color, Size } from '../types/types';
import { onMount } from 'svelte';
import Button from './Button.svelte';
import { XCircle } from 'svelte-hero-icons';

let {
	title = '',
	size = 'md',
	mode = 'primary',
	closeOnEsc = true,
	closeOnOutsideClick = true,
	padding = '',
	showCloseButton = true,
	actions = [],
	oncancel,
	onclose,
	children,
} : ModalProps = $props();

const modalId = Symbol( 'modal' );
const titleId = `modal-title-${Math.random().toString( 36 ).slice( 2 )}`;

let bodyOverflow : string = $state( '' );

const setBodyOverflow = {
	orig: () => {
		bodyOverflow = document.body.style.overflow || '';
	},
	open: () => ( document.body.style.overflow = 'hidden' ),
	close: () => ( document.body.style.overflow = bodyOverflow ),
};

const onCloseOnOutside = ( e : MouseEvent ) => {
	if ( closeOnOutsideClick && e.target === e.currentTarget ) {
		setBodyOverflow.close();
		oncancel && oncancel( false );
	}
};

const onCloseOnEsc = ( e : KeyboardEvent ) => {
	const isTopmost = openModalStack[openModalStack.length - 1] === modalId;

	if ( closeOnEsc && e.key === 'Escape' && isTopmost ) {
		setBodyOverflow.close();
		oncancel && oncancel( false );
	}
};

onMount( () => {
	openModalStack.push( modalId );
	window.addEventListener( 'keydown', onCloseOnEsc );
	setBodyOverflow.orig();
	setBodyOverflow.open();

	return () => {
		openModalStack = openModalStack.filter( ( id ) => id !== modalId );
		setBodyOverflow.close();
		window.removeEventListener( 'keydown', onCloseOnEsc );
	};
} );
</script>

<div class="liwe3-modal-overlay" onclick={onCloseOnOutside} onkeydown={onCloseOnEsc} role="dialog" aria-modal="true" aria-labelledby={titleId} tabindex="-1">
	<div class="liwe3-modal liwe3-modal--{size}">
		<div class="liwe3-modal__header">
			<h3 id={titleId}>{title}</h3>
			<div class="liwe3-modal__actions">
				{#if actions.length}
					<div class="liwe3-modal__buttons">
						{#each actions as action}
							<Button
								size="sm"
								mode={action.mode || 'primary'}
								onclick={() => {
									action.action();
								}}
							>
								{action.label}
							</Button>
						{/each}
					</div>
				{/if}
				{#if showCloseButton}
					<Button
						size="sm"
						mode="danger"
						onclick={() => {
							oncancel && oncancel( false );
						}}
						icon={XCircle}
					/>
				{/if}
			</div>
		</div>
		<div class="liwe3-modal__body" style:padding>
			{@render children()}
		</div>
	</div>
</div>

<style>
.liwe3-modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	z-index: var(--liwe3-z-modal, 1060);
	bottom: 0;
	right: 0;
	background-color: var(--liwe3-scrim);
	display: flex;
	justify-content: center;
	align-items: center;
	backdrop-filter: blur(5px);
	overflow: auto;
}

.liwe3-modal {
	border: 1px solid var(--liwe3-border);
	border-radius: var(--liwe3-radius-lg);
	color: var(--liwe3-text);
	background-color: var(--liwe3-surface-raised);
	box-shadow: var(--liwe3-shadow-xl);
}

.liwe3-modal__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-radius: var(--liwe3-radius-lg) var(--liwe3-radius-lg) 0 0;
	border-bottom: 1px solid var(--liwe3-border-subtle);
	padding: var(--liwe3-space-3);
	background-color: var(--liwe3-surface);
}

.liwe3-modal__header h3 {
	margin: 0;
	font-size: var(--liwe3-text-lg);
	font-weight: var(--liwe3-weight-semibold);
	color: var(--liwe3-text);
}

.liwe3-modal__body {
	max-height: 90vh;
	overflow: auto;
	scrollbar-width: thin;
	background-color: var(--liwe3-surface);
}

.liwe3-modal__actions {
	display: flex;
	align-items: center;
	gap: var(--liwe3-space-2);
}

.liwe3-modal__buttons {
	display: flex;
	gap: var(--liwe3-space-2);
}

.liwe3-modal--xs {
	width: 20vw;
}
.liwe3-modal--sm {
	width: 30vw;
}
.liwe3-modal--md {
	min-width: 50vw;
}
.liwe3-modal--lg {
	width: 80vw;
}
.liwe3-modal--xl {
	width: 90vw;
}
</style>
