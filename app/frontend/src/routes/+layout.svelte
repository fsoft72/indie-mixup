<script lang="ts">
import '../app.css';
import { goto } from '$app/navigation';
import { env } from '$env/dynamic/public';
import { page } from '$app/state';
import { FormCheckbox, FormTextArea, FormTextInput, apiClient, formCreatorPluginRegister, has_perm } from '@frontend/liwe3';
import { Icon } from '@frontend-modules/indiegame';
import { ThemeProvider } from '@frontend-modules/theme';
import { storeUser } from '@frontend-modules/user';
import { onMount } from 'svelte';
import type { Snippet } from 'svelte';

interface Props {
	children : Snippet;
}

let { children } : Props = $props();

// Every API call goes to the LiWE server of the environment (empty: the same origin that serves the app)
apiClient.setBaseURL( env.PUBLIC_LIWE_SERVER ?? '' );

// Field types available to every FormCreator of the app
formCreatorPluginRegister( 'text', FormTextInput );
formCreatorPluginRegister( 'textarea', FormTextArea );
formCreatorPluginRegister( 'checkbox', FormCheckbox );

onMount( () => storeUser.load() );

const isModerator = $derived( !!storeUser.user.perms?.some( ( p ) => p === 'indiegame.moderate' || p === 'system.admin' ) );

const isOAuthAdmin = $derived( has_perm( storeUser.user, 'user.oauth.manage' ) );

const canListUsers = $derived( has_perm( storeUser.user, 'user.list' ) );

const canManageRoles = $derived( has_perm( storeUser.user, 'user.role.manage' ) );

const isActive = ( href : string ) => ( href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith( href ) );

const logout = async () => {
	await storeUser.logout();
	await goto( '/' );
};
</script>

<ThemeProvider variant="dark" brand="cyberpunk" extras={[ 'theme-extra/indie-mixup.css' ]}>
	<a class="skip" href="#main">Skip to content</a>

	<header class="bar">
		<div class="inner">
			<a class="brand" href="/" aria-label="Indie Mixup, home">
				<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
					<path d="M5 23 16 5l11 18" fill="none" stroke="var(--liwe3-primary)" stroke-width="3" stroke-linejoin="round" />
					<path d="M10 23h12" stroke="var(--liwe3-secondary)" stroke-width="3" stroke-linecap="round" />
				</svg>
				<span class="word">INDIE<b>//</b>MIXUP</span>
			</a>

			<nav aria-label="Main">
				<a href="/" aria-current={isActive( '/' ) ? 'page' : undefined}>Catalog</a>
				<a href="/rankings" aria-current={isActive( '/rankings' ) ? 'page' : undefined}><Icon name="trophy" size={16} /> Rankings</a>
				{#if storeUser.isLoggedIn}
					<a href="/my-games" aria-current={isActive( '/my-games' ) ? 'page' : undefined}>My games</a>
					{#if isModerator}<a href="/admin" aria-current={page.url.pathname === '/admin' ? 'page' : undefined}>Moderation</a>{/if}
					{#if isModerator}<a href="/admin/games" aria-current={isActive( '/admin/games' ) ? 'page' : undefined}>Games</a>{/if}
					{#if canListUsers}<a href="/admin/users" aria-current={isActive( '/admin/users' ) ? 'page' : undefined}>Users</a>{/if}
					{#if canManageRoles}<a href="/admin/roles" aria-current={isActive( '/admin/roles' ) ? 'page' : undefined}>Roles</a>{/if}
					{#if isOAuthAdmin}<a href="/admin/providers" aria-current={isActive( '/admin/providers' ) ? 'page' : undefined}>Providers</a>{/if}
				{/if}
			</nav>

			<div class="actions">
				<a class="liwe3-btn liwe3-btn--primary im-cta" href="/submit"><Icon name="plus" size={16} /> Submit a game</a>
				{#if storeUser.isLoggedIn}
					<span class="who"><Icon name="user" size={16} /> {storeUser.user.name || storeUser.user.username}</span>
					<button class="liwe3-btn liwe3-btn--ghost" onclick={logout}>Logout</button>
				{:else}
					<a class="liwe3-btn" href="/login"><Icon name="github" size={16} /> Login</a>
				{/if}
			</div>
		</div>
	</header>

	<main id="main" class="page">
		{@render children()}
	</main>

	<footer class="foot">
		<p>INDIE<b>//</b>MIXUP · free indie games, open repos, endless remixes</p>
	</footer>
</ThemeProvider>

<style>
.skip {
	position: absolute;
	left: -999px;
	top: 0;
	z-index: 100;
	padding: var(--liwe3-space-2) var(--liwe3-space-4);
	background: var(--liwe3-primary);
	color: var(--liwe3-text-on-primary);
}
.skip:focus {
	left: var(--liwe3-space-2);
	top: var(--liwe3-space-2);
}

.bar {
	position: sticky;
	top: 0;
	z-index: var(--liwe3-z-sticky, 20);
	background: color-mix(in oklch, var(--liwe3-surface) 78%, transparent);
	backdrop-filter: blur(14px);
	border-bottom: 1px solid var(--im-panel-border);
	box-shadow: 0 1px 0 color-mix(in oklch, var(--liwe3-primary) 25%, transparent), 0 8px 30px color-mix(in oklch, var(--liwe3-primary) 6%, transparent);
}
.inner {
	max-width: 76rem;
	margin: 0 auto;
	padding: var(--liwe3-space-3) var(--liwe3-space-5);
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--liwe3-space-3) var(--liwe3-space-6);
}

.brand {
	display: inline-flex;
	align-items: center;
	gap: var(--liwe3-space-2);
	text-decoration: none;
	color: var(--liwe3-text);
}
.word {
	font-family: var(--im-font-display);
	font-weight: 900;
	letter-spacing: 0.14em;
	font-size: 1.05rem;
}
.word b {
	color: var(--liwe3-secondary);
	margin: 0 1px;
}

nav {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--liwe3-space-1);
}
nav a {
	display: inline-flex;
	align-items: center;
	gap: var(--liwe3-space-2);
	padding: var(--liwe3-space-2) var(--liwe3-space-3);
	color: var(--liwe3-text-muted);
	text-decoration: none;
	font-size: var(--liwe3-text-sm);
	font-weight: var(--liwe3-weight-semibold);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	border-bottom: 2px solid transparent;
}
nav a:hover {
	color: var(--liwe3-text);
}
nav a[aria-current="page"] {
	color: var(--liwe3-primary);
	border-bottom-color: var(--liwe3-primary);
	text-shadow: 0 0 12px color-mix(in oklch, var(--liwe3-primary) 60%, transparent);
}

.actions {
	margin-left: auto;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--liwe3-space-2);
}
.who {
	display: inline-flex;
	align-items: center;
	gap: var(--liwe3-space-2);
	color: var(--liwe3-text-muted);
	font-size: var(--liwe3-text-sm);
}

.page {
	position: relative;
	z-index: 1;
	max-width: 76rem;
	margin: 0 auto;
	padding: var(--liwe3-space-8) var(--liwe3-space-5) var(--liwe3-space-12, 4rem);
	min-height: 70vh;
}

.foot {
	position: relative;
	z-index: 1;
	border-top: 1px solid var(--im-panel-border);
	padding: var(--liwe3-space-6) var(--liwe3-space-5);
	text-align: center;
	font-family: var(--im-font-mono);
	font-size: var(--liwe3-text-xs);
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--liwe3-text-subtle);
}
.foot p {
	margin: 0;
}
.foot b {
	color: var(--liwe3-secondary);
}

@media (max-width: 52rem) {
	.actions {
		margin-left: 0;
		width: 100%;
	}
	.page {
		padding-top: var(--liwe3-space-6);
	}
}
</style>
