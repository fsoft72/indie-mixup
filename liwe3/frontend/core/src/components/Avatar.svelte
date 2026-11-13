<script lang="ts">
import type { Color } from '../types/types';
import { media_url } from '../utils/utils';
import { onMount } from 'svelte';

interface _props {
	value? : any;
	url? : string;
	name? : string;
	size? : string;
	mode? : Color;
	shape? : 'circle' | 'square';
	shadow? : boolean;
	border? : string;
}

let {
	value = null,
	url = '',
	name = 'A',
	size,
	mode = 'primary',
	shape = 'circle',
	shadow = false,
	border = 'none',
} : _props = $props();

// local, reassignable copies: `value`/`url`/`name` can resolve to something else
// (a Media Manager id, `value.avatar`/`value.name`) without mutating the props directly
let resolvedUrl = $state( url );
let resolvedName = $state( name );

// svelte-ignore state_referenced_locally (seeds local state once; resolvedUrl can change afterward without src re-deriving, by design)
let src = $state( url );

onMount( () => {
	if ( value ) {
		if ( value.avatar ) resolvedUrl = value.avatar;
		resolvedName = `${value.name} ${value.lastname}`;
	}
	if ( !resolvedUrl || !resolvedUrl.length ) return;

	// absolute url are not touched
	if ( resolvedUrl.startsWith( 'http' ) ) return;

	// if it doesn't start with http, maybe it is a Media Manager ID
	src = media_url( resolvedUrl, '', true );
} );
</script>

<div
	class="liwe3-avatar {shape} {shadow ? 'shadow' : ''}"
	style="background-image: url({resolvedUrl}); width: {size}; height: {size}; border: {border}"
>
	{#if !src}
		{#if resolvedName}
			{#each resolvedName?.split( ' ' ) as word}
				{word[0]}
			{/each}
		{:else}
			A
		{/if}
	{/if}
</div>

<style>
.liwe3-avatar {
	display: flex;
	justify-content: center;
	align-items: center;
	background-size: cover;
	background-position: center;
	background-color: var(--liwe3-primary);
	color: var(--liwe3-text-on-primary);
	border: 2px solid var(--liwe3-border);
	user-select: none;
	font-weight: var(--liwe3-weight-semibold);
	font-size: var(--liwe3-text-lg);
}

.liwe3-avatar.circle {
	border-radius: var(--liwe3-radius-full);
}

.liwe3-avatar.square {
	border-radius: var(--liwe3-radius-md);
}

.liwe3-avatar.shadow {
	box-shadow: var(--liwe3-shadow-md);
}
</style>
