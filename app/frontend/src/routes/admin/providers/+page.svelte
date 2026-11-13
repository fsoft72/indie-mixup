<script lang="ts">
import { has_perm } from '@frontend/liwe3';
import { OAuthProvidersAdmin, storeUser } from '@frontend-modules/user';

const canManage = $derived( has_perm( storeUser.user, 'user.oauth.manage' ) );
</script>

<svelte:head><title>Login providers - Indie Mixup</title></svelte:head>

<p class="im-eyebrow">// control room</p>
<h1>Login providers</h1>

{#if !storeUser.isLoggedIn}
	<p>Login required. <a href="/login">Login</a></p>
{:else if !canManage}
	<div class="liwe3-alert--error">You do not have the permission to manage the login providers.</div>
{:else}
	<p class="im-muted">
		GitHub OAuth App callback URL: <code>{typeof window === 'undefined' ? '' : window.location.origin}/login/callback</code>
	</p>
	<OAuthProvidersAdmin />
{/if}
