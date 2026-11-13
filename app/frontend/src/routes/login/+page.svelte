<script lang="ts">
import { user_oauth_authorize } from '@frontend-modules/user';

let error = $state( '' );
let busy = $state( false );

const login = async () => {
	busy = true;

	const res = await user_oauth_authorize( { provider: 'github', redirect_url: `${window.location.origin}/login/callback` } );
	if ( !res.ok || !res.data ) {
		error = res.error?.message ?? 'Could not start the GitHub login';
		busy = false;
		return;
	}

	window.location.href = res.data;
};
</script>

<svelte:head><title>Login - Indie Mixup</title></svelte:head>

<h1>Login</h1>
<p>Sign in with your GitHub account to publish games and remixes.</p>
<p><button class="liwe3-btn liwe3-btn--primary" disabled={busy} onclick={login}>Login with GitHub</button></p>
{#if error}<p class="liwe3-alert--error">{error}</p>{/if}
