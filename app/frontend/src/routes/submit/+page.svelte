<script lang="ts">
import { goto } from '$app/navigation';
import { Icon } from '@frontend-modules/indiegame';
import { storeUser } from '@frontend-modules/user';
import GameForm from '../../lib/GameForm.svelte';
</script>

<svelte:head><title>Submit a game - Indie Mixup</title></svelte:head>

<p class="im-eyebrow">// new entry</p>
<h1>Submit a <span class="im-neon">game</span></h1>

{#if storeUser.isLoggedIn}
	<GameForm onsaved={( g ) => goto( `/games/${g.id}` )} />
{:else}
	<section class="im-panel gate">
		<p>Login with GitHub to publish a game or a remix.</p>
		<a class="liwe3-btn liwe3-btn--primary" href="/login"><Icon name="github" size={18} /> Login with GitHub</a>
	</section>
{/if}

<style>
.gate {
	max-width: 30rem;
	display: grid;
	gap: var(--liwe3-space-4);
	justify-items: start;
}
.gate p {
	margin: 0;
}
</style>
