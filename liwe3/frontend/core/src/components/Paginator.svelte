<script module lang="ts">
type ButtonProps = {
	mode? : Color;
	variant? : Variant;
	size? : Size;
};

export type PaginatorButtons = {
	first : ButtonProps;
	prev : ButtonProps;
	next : ButtonProps;
	last : ButtonProps;
};
</script>

<script lang="ts">
import Button from './Button.svelte';
import type { Color, Size, Variant } from '../types/types';

interface PaginatorProps {
	mode? : Color;
	page? : number; // current page
	rows? : number; // rows per page
	total? : number; // total number of rows
	buttons? : PaginatorButtons; // buttons customization

	onpagechange? : ( page : number, rows : number ) => void;
}

let {
	mode = 'primary',
	page = 1,
	rows = 10,
	total = 0,
	buttons,
	onpagechange,
} : PaginatorProps = $props();

let pages = $derived( Math.ceil( total / rows ) );

const setPage = ( num : number ) => {
	if ( num < 1 || num > pages ) return;

	page = num;
	onpagechange && onpagechange( page, rows );
};

// svelte-ignore state_referenced_locally (one-time default for an optional prop)
if ( !buttons ) {
	buttons = {
		first: { mode: 'info', size: 'sm' },
		prev: { mode: 'success', size: 'sm' },
		next: { mode: 'success', size: 'sm' },
		last: { mode: 'info', size: 'sm' },
	};
}

export const resetPage = () => {
	setPage( 1 );
};
</script>

<div class="liwe3-paginator">
	<Button {...buttons.first} disabled={page == 1} onclick={() => setPage( 1 )}>
		First
	</Button>
	<Button {...buttons.prev} disabled={page == 1} onclick={() => setPage( page - 1 )}>
		Prev
	</Button>
	<div class="liwe3-paginator__text">{page} of {pages}</div>
	<Button {...buttons.next} disabled={page == pages} onclick={() => setPage( page + 1 )}>
		Next
	</Button>
	<Button {...buttons.last} disabled={page == pages} onclick={() => setPage( pages )}>
		Last
	</Button>
</div>

<style>
.liwe3-paginator {
	display: flex;
	gap: var(--liwe3-space-2);
	justify-content: center;
	align-items: center;
	padding: var(--liwe3-space-2) 0;
}

.liwe3-paginator__text {
	font-size: var(--liwe3-text-sm);
	font-weight: var(--liwe3-weight-medium);
	color: var(--liwe3-text);
	padding: 0 var(--liwe3-space-2);
}
</style>
