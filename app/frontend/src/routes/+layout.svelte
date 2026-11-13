<script lang="ts">
import { PUBLIC_LIWE_SERVER } from '$env/static/public';
import { FormCheckbox, FormTextArea, FormTextInput, apiClient, formCreatorPluginRegister } from '@frontend/liwe3';
import { storeUser } from '@frontend-modules/user';
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import type { Snippet } from 'svelte';

interface Props {
	children : Snippet;
}

let { children } : Props = $props();

// Every API call goes to the LiWE server of the environment
apiClient.setBaseURL( PUBLIC_LIWE_SERVER );

// Field types available to every FormCreator of the app
formCreatorPluginRegister( 'text', FormTextInput );
formCreatorPluginRegister( 'textarea', FormTextArea );
formCreatorPluginRegister( 'checkbox', FormCheckbox );

onMount( () => storeUser.load() );

const isModerator = $derived( !!storeUser.user.perms?.some( ( p ) => p === 'indiegame.moderate' || p === 'system.admin' ) );

const logout = async () => {
	await storeUser.logout();
	await goto( '/' );
};
</script>

<header class="bar">
	<a class="brand" href="/">Indie Mixup</a>
	<nav>
		<a href="/">Catalog</a>
		<a href="/rankings">Rankings</a>
		<a href="/submit">Submit a game</a>
		{#if storeUser.isLoggedIn}
			<a href="/my-games">My games</a>
			{#if isModerator}<a href="/admin">Moderation</a>{/if}
			<button class="link" onclick={logout}>Logout ({storeUser.user.name || storeUser.user.username})</button>
		{:else}
			<a href="/login">Login with GitHub</a>
		{/if}
	</nav>
</header>

<main class="page">
	{@render children()}
</main>

<style>
:global(body) {
	margin: 0;
	font-family: system-ui, sans-serif;
}
.bar {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	align-items: center;
	justify-content: space-between;
	padding: 0.75rem 1.25rem;
	border-bottom: 1px solid #8884;
}
.brand {
	font-weight: 700;
	font-size: 1.2rem;
	text-decoration: none;
	color: inherit;
}
nav {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	align-items: center;
}
.link {
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	font: inherit;
	text-decoration: underline;
	color: inherit;
}
.page {
	max-width: 72rem;
	margin: 0 auto;
	padding: 1.25rem;
}
</style>
