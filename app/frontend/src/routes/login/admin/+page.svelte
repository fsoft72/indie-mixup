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

/* The Login component of the user module ships a 500px min-width and unstyled buttons: tune it for the site */
.login :global(.login-cnt) {
	min-width: 0;
	display: grid;
	gap: var(--liwe3-space-4);
}

.login :global(.login-cnt input) {
	width: 100%;
	box-sizing: border-box;
}

.login :global(.login-cnt .btns) {
	padding: var(--liwe3-space-2) var(--liwe3-space-2) 0;
	justify-content: flex-end;
	gap: var(--liwe3-space-3);
}

/* "Forgot password" is not implemented in this app (the handler only logs) */
.login :global(.login-cnt .btns a) {
	display: none;
}

.login :global(.login-cnt button) {
	min-height: 2.5rem;
	padding: 0 var(--liwe3-space-5);
	font-family: inherit;
	font-weight: var(--liwe3-weight-semibold);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	cursor: pointer;
	border-radius: var(--liwe3-radius-md);
	border: 1px solid var(--im-panel-border);
	background: var(--im-panel-bg);
	color: var(--liwe3-text);
}

.login :global(.login-cnt button[type="submit"]) {
	background: var(--liwe3-primary);
	border-color: var(--liwe3-primary);
	color: var(--liwe3-text-on-primary);
}

.login :global(.login-cnt button:hover:not(:disabled)) {
	box-shadow: var(--im-glow-primary);
}

.login :global(.login-cnt button[type="submit"]:hover:not(:disabled)) {
	background: var(--liwe3-primary-hover);
}

.login :global(.login-cnt button:disabled) {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
