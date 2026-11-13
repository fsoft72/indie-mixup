<script lang="ts">
import { has_perm } from '@frontend/liwe3';
import { UserRolesAdmin, storeUser } from '@frontend-modules/user';

const canManage = $derived( has_perm( storeUser.user, 'user.role.manage' ) );
</script>

<svelte:head><title>Roles - Indie Mixup</title></svelte:head>

<p class="im-eyebrow">// control room</p>
<h1>Roles</h1>

{#if !storeUser.isLoggedIn}
	<p>Login required. <a href="/login">Login</a></p>
{:else if !canManage}
	<div class="liwe3-alert--error">You do not have the permission to manage the roles.</div>
{:else}
	<UserRolesAdmin />
{/if}
