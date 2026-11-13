<script lang="ts">
import { has_perm } from '@frontend/liwe3';
import { UsersList, storeUser } from '@frontend-modules/user';

const canManage = $derived( has_perm( storeUser.user, 'user.list' ) );
</script>

<svelte:head><title>Users - Indie Mixup</title></svelte:head>

<p class="im-eyebrow">// control room</p>
<h1>Users</h1>

{#if !storeUser.isLoggedIn}
	<p>Login required. <a href="/login">Login</a></p>
{:else if !canManage}
	<div class="liwe3-alert--error">You do not have the permission to manage the users.</div>
{:else}
	<UsersList />
{/if}
