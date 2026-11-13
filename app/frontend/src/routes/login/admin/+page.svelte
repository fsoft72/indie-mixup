<script lang="ts">
import { goto } from '$app/navigation';
import { Login } from '@frontend-modules/user';
</script>

<svelte:head>
	<title>Admin login - Indie Mixup</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="login im-panel">
	<p class="im-eyebrow">// restricted</p>
	<h1>Admin login</h1>
	<Login onsuccess={() => goto( '/admin/providers' )} />
</section>

<style>
.login {
	max-width: 28rem;
	margin: var(--liwe3-space-8) auto;
	display: grid;
	gap: var(--liwe3-space-4);
}
</style>
