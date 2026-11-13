<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { apiClient } from '@frontend/liwe3';
import { storeUser, user_oauth_callback } from '@frontend-modules/user';
import { onMount } from 'svelte';

let error = $state( '' );

onMount( async () => {
	const code = page.url.searchParams.get( 'code' );
	const state = page.url.searchParams.get( 'state' );

	if ( !code || !state ) {
		error = 'The GitHub answer is incomplete. Please try again.';
		return;
	}

	const res = await user_oauth_callback( { state, code } );
	if ( !res.ok || !res.data?.token ) {
		error = res.error?.message ?? 'Login failed. Accounts that need a second step are not supported on this site.';
		return;
	}

	storeUser.updateUser( res.data );
	storeUser.save();
	apiClient.setToken( res.data.token );

	await goto( '/' );
} );
</script>

<svelte:head><title>Login - Indie Mixup</title></svelte:head>

<section class="im-panel box">
	{#if error}
		<div class="liwe3-alert--error">{error}</div>
		<p><a href="/login">Try again</a></p>
	{:else}
		<p class="im-eyebrow">// handshake</p>
		<h1>Signing you in...</h1>
	{/if}
</section>

<style>
.box {
	max-width: 28rem;
	margin: var(--liwe3-space-8) auto;
}
</style>
