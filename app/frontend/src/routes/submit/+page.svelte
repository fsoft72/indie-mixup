<script lang="ts">
import { goto } from '$app/navigation';
import { storeUser } from '@frontend-modules/user';
import GameForm from '../../lib/GameForm.svelte';
</script>

<svelte:head><title>Submit a game - Indie Mixup</title></svelte:head>

<h1>Submit a game</h1>

{#if storeUser.isLoggedIn}
	<GameForm onsaved={( g ) => goto( `/games/${g.id}` )} />
{:else}
	<p>Login with GitHub to publish a game or a remix.</p>
	<p><a class="liwe3-btn liwe3-btn--primary" href="/login">Login with GitHub</a></p>
{/if}
