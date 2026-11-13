<script lang="ts">
import {
	Button,
	type Color,
	LocalizationStore,
	type Variant,
} from '@frontend/liwe3';
import { user_logout } from '../actions.ts.xxx';
import { userStoreClear } from '../store.svelte';

const _ = LocalizationStore._;
interface LogoutProps {
	redir? : string;
	mode? : Color;
	variant? : Variant;
	label? : string;
	children? : any;
}

let {
	redir = '/',
	mode = 'error',
	variant = 'solid',
	label = 'Logout',
	children,
} : LogoutProps = $props();

const doLogout = async () => {
	await user_logout();
	userStoreClear();
	localStorage.removeItem( 'token' );
	window.location.href = redir;
};
</script>

<Button {variant} {mode} onclick={() => doLogout()}>
	{#if children}
		{@render children()}
	{:else}
		{_( label )}
	{/if}
</Button>
