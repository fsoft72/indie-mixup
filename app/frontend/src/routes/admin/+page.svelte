<script lang="ts">
import { AdminQueue } from '@frontend-modules/indiegame';
import { storeUser } from '@frontend-modules/user';

const isModerator = $derived( !!storeUser.user.perms?.some( ( p ) => p === 'indiegame.moderate' || p === 'system.admin' ) );
</script>

<svelte:head><title>Moderation - Indie Mixup</title></svelte:head>

<p class="im-eyebrow">// control room</p>
<h1>Moderation</h1>

{#if !storeUser.isLoggedIn}
	<p>Login required. <a href="/login">Login</a></p>
{:else if !isModerator}
	<div class="liwe3-alert--error">You do not have the permission to moderate games.</div>
{:else}
	<AdminQueue />
{/if}
