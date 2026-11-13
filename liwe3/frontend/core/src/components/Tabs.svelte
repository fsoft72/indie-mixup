<script lang="ts">
import { browser } from '$app/environment';
import type { Color } from '../types/types';
import { onMount } from 'svelte';

interface Props {
	active? : string;
	minHeight? : string;
	height? : string;
	mode? : Color;
	children : any;
}

let {
	active = $bindable( '' ),
	minHeight = '',
	height = '',
	mode = 'neutral',
	children,
} : Props = $props();

interface TabInfo {
	id : string;
	title : string;
	component : HTMLElement;
}

let tabsDiv : HTMLDivElement | undefined = $state();

let tabs : TabInfo[] = $state( [] );

onMount( () => {
	if ( !tabsDiv ) return;

	const originalTabs = tabsDiv.querySelectorAll( '.tab' );

	originalTabs.forEach( ( tab : any ) => {
		const id = tab.getAttribute( 'data-id' ) ?? '';
		const title = tab.getAttribute( 'data-title' ) ?? '';
		const component = tab.querySelector( '.tab-content' );

		if ( !component ) return;

		tabs.push( {
			id,
			title,
			component,
		} );
	} );

	tabs = tabs;

	if ( tabs.length ) {
		active = active || tabs[0].id;
	}
} );

$effect( () => {
	if ( !tabsDiv ) return;

	if ( browser && tabs.length ) {
		tabsDiv.innerHTML = '';
		tabsDiv.appendChild(
			tabs.find( ( tab ) => tab.id === active )?.component ?? tabs[0].component,
		);
	}
} );
</script>

<div class="liwe3-tabs-container">
	<div class="liwe3-tabs">
		<div class="liwe3-tabs__buttons">
			{#each tabs as tab (tab.id)}
				<div
					role="button"
					tabindex="0"
					class="liwe3-tabs__label"
					class:active={tab.id === active}
					onclick={() => ( active = tab.id )}
					onkeydown={( e ) => {
						if ( e.key === 'Enter' ) {
							active = tab.id;
						}
					}}
				>
					{tab.title}
				</div>
			{/each}
		</div>
		<div
			class="liwe3-tabs__content"
			bind:this={tabsDiv}
			style:height
			style:min-height={minHeight}
		>
			{@render children()}
		</div>
	</div>
</div>

<style>
.liwe3-tabs-container {
	width: 100%;
}

.liwe3-tabs {
	width: 100%;
	margin: 0 auto;
	position: relative;
	height: auto;
	border: 1px solid var(--liwe3-border);
	border-radius: var(--liwe3-radius-md);
}

.liwe3-tabs__content {
	position: relative;
	height: auto;
	display: flex;
	padding: 0;
	background: var(--liwe3-surface);
	width: 100%;
}

.liwe3-tabs__buttons {
	position: relative;
	display: flex;
}

.liwe3-tabs__label {
	cursor: pointer;
	background: var(--liwe3-surface-sunken);
	border-left: 1px solid var(--liwe3-border);
	border-right: 1px solid var(--liwe3-border);
	border-top: 1px solid var(--liwe3-border);
	color: var(--liwe3-text-muted);
	padding: var(--liwe3-space-3) var(--liwe3-space-4);
	font-size: var(--liwe3-text-sm);
	font-weight: var(--liwe3-weight-medium);
	user-select: none;
	transition: background var(--liwe3-duration-fast) var(--liwe3-ease-out);
}

.liwe3-tabs__label:hover {
	background: var(--liwe3-surface);
	color: var(--liwe3-text);
}

.liwe3-tabs__label.active {
	background: var(--liwe3-surface);
	color: var(--liwe3-primary);
	border-bottom-color: var(--liwe3-surface);
	font-weight: var(--liwe3-weight-semibold);
}
</style>
