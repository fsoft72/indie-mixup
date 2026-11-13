<script lang="ts">
import { Icon } from '@frontend-modules/indiegame';
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

<section class="login im-panel">
	<p class="im-eyebrow">// access</p>
	<h1>Jack in</h1>
	<p class="im-muted">Sign in with your GitHub account to publish games and remixes. We only read your public profile.</p>
	<button class="liwe3-btn liwe3-btn--primary" disabled={busy} onclick={login}><Icon name="github" size={18} /> Login with GitHub</button>
	{#if error}<div class="liwe3-alert--error">{error}</div>{/if}
</section>

<style>
.login {
	max-width: 28rem;
	margin: var(--liwe3-space-8) auto;
	display: grid;
	gap: var(--liwe3-space-4);
	justify-items: start;
}
.login p {
	margin: 0;
}
.login h1 {
	margin: 0;
}
</style>
