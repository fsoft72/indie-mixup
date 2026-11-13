<script lang="ts">
import type { Color, Size, Variant } from '../types/types';
import { Icon } from 'svelte-hero-icons';
import type { IconSource } from 'svelte-hero-icons';

type Gradient = {
	colors : string[];
	mode? : 'linear' | 'radial';
	angle? : number;
};

interface Props {
	size? : Size;
	cssClass? : string;
	mode? : Color;
	variant? : Variant;
	icon? : IconSource;
	iconRight? : IconSource;
	solid? : boolean;
	disabled? : boolean;
	gradient? : Gradient;

	// events
	onclick? : ( e : MouseEvent ) => void;

	// children
	children? : any;

	// restProps
	[key : string] : any; // for restProps
}

let {
	size = 'md',
	cssClass = '',
	mode = 'primary',
	variant = 'solid',
	disabled = false,
	icon,
	iconRight,
	solid = true,
	gradient,
	onclick,
	children,
	...restProps
} : Props = $props();

const iconSizes = {
	xxs: '0.6rem',
	xs: '0.8rem',
	sm: '0.8rem',
	md: '1rem',
	lg: '1.2rem',
	xl: '1.5rem',
	xxl: '2rem',
};

const onClick = ( e : MouseEvent ) => {
	e.preventDefault();
	onclick && onclick( e );
};

const gradientStyle : string = $derived(
	gradient
		? `background: ${gradient.mode || 'linear'}-gradient(${
			gradient.mode === 'radial'
				? 'circle'
				: gradient.angle
				? `${gradient.angle}deg`
				: '90deg'
		}, ${gradient.colors.join( ', ' )})`
		: '',
);

const BUTTON_MODE_CLASSES : Record<string, string> = {
	primary: 'liwe3-btn--primary',
	secondary: 'liwe3-btn--secondary',
	accent: 'liwe3-btn--accent',
	success: 'liwe3-btn--success',
	warning: 'liwe3-btn--warning',
	info: 'liwe3-btn--info',
	danger: 'liwe3-btn--danger',
	error: 'liwe3-btn--danger',
};

const btnClass = $derived( () => {
	const classes = [ 'liwe3-btn' ];
	if ( BUTTON_MODE_CLASSES[mode] ) classes.push( BUTTON_MODE_CLASSES[mode] );
	if ( variant === 'outline' ) classes.push( 'liwe3-btn--outline' );
	if ( variant === 'link' || variant === 'ghost' ) classes.push( 'liwe3-btn--ghost' );
	if ( size ) classes.push( `liwe3-btn--${size}` );
	if ( cssClass ) classes.push( cssClass );
	return classes.join( ' ' );
} );
</script>

<button
	{...restProps}
	class={btnClass()}
	style={restProps.style
	? `${restProps.style} ${gradientStyle}`
	: gradientStyle}
	onclick={onClick}
	{disabled}
>
	{#if icon}
		<div class="liwe3-button-icon-left">
			<Icon src={icon} size={iconSizes[size]} {solid} />
		</div>
	{/if}
	{#if children}
		{@render children()}
	{:else}
		<div class="button-no-content"></div>
	{/if}
	{#if iconRight}
		<div class="liwe3-button-icon-right">
			<Icon src={iconRight} size={iconSizes[size]} {solid} />
		</div>
	{/if}
</button>

<style>
.liwe3-button-icon-left {
	flex: 0.1 0 10%;
	margin-right: 0.5em;
	padding-top: 0.2em;
}
.liwe3-button-icon-right {
	flex: 0.1 0 10%;
	margin-left: 0.5em;
	padding-top: 0.2em;
}
.button-no-content {
	flex: 0;
	margin-right: -0.5em;
}

.liwe3-btn--xxs {
	padding: 0.12em 0.2em;
	font-size: 0.6rem;
	min-height: var(--liwe3-control-height-xxs);
}
.liwe3-btn--xs {
	padding: 0.12em 0.25em;
	font-size: 0.8rem;
	min-height: var(--liwe3-control-height-xs);
}
.liwe3-btn--sm {
	padding: 0.25em 0.5em;
	font-size: 0.8rem;
	min-height: var(--liwe3-control-height-sm);
}
.liwe3-btn--md {
	padding: var(--liwe3-space-2) var(--liwe3-space-4);
	font-size: 1rem;
	min-height: var(--liwe3-control-height-md);
}
.liwe3-btn--lg {
	padding: 0.2em 0.5em;
	font-size: 1.2rem;
	min-height: var(--liwe3-control-height-lg);
}
.liwe3-btn--xl {
	padding: 0.2em 0.5em;
	font-size: 1.5rem;
	min-height: var(--liwe3-control-height-xl);
}
.liwe3-btn--xxl {
	padding: 0.2em 0.5em;
	font-size: 2rem;
	min-height: var(--liwe3-control-height-xxl);
}

.liwe3-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
