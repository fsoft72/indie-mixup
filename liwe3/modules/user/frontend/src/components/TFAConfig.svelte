<script lang="ts">
import { Button, Input, QRCode } from '@frontend/liwe3';
import { onMount } from 'svelte';
import { user_2fa_disable, user_2fa_enable, user_2fa_setup, user_me } from '../actions';

interface Props {
	onerror? : ( message : string ) => void;
	onchange? : ( enabled : boolean ) => void;
}

let { onerror, onchange } : Props = $props();

type Step = 'loading' | 'disabled' | 'setup' | 'codes' | 'enabled';

let step : Step = $state( 'loading' );
let busy = $state( false );
let errorMessage = $state( '' );

let secret = $state( '' );
let otpauthUrl = $state( '' );
let code = $state( '' );
let recoveryCodes : string[] = $state( [] );
let password = $state( '' );
let copied = $state( false );

const fail = ( message : string ) => {
	if ( onerror ) return onerror( message );
	errorMessage = message;
};

onMount( async () => {
	const res = await user_me();
	if ( !res.ok ) return fail( res.error.message || 'Failed to load user data' );

	step = res.data?.two_factor_enabled ? 'enabled' : 'disabled';
} );

const startSetup = async () => {
	busy = true;
	errorMessage = '';
	try {
		const res = await user_2fa_setup();
		if ( !res.ok || !res.data ) return fail( res.error?.message || 'Failed to start 2FA setup' );

		secret = res.data.secret;
		otpauthUrl = res.data.otpauth_url;
		code = '';
		step = 'setup';
	} finally {
		busy = false;
	}
};

const enable = async () => {
	if ( busy || !code.trim() ) return;

	busy = true;
	errorMessage = '';
	try {
		const res = await user_2fa_enable( { code: code.trim() } );
		if ( !res.ok ) return fail( res.error.message || 'Invalid code' );

		recoveryCodes = res.data ?? [];
		copied = false;
		step = 'codes';
	} finally {
		busy = false;
	}
};

const finishSetup = () => {
	recoveryCodes = [];
	step = 'enabled';
	onchange?.( true );
};

const copyCodes = async () => {
	try {
		await navigator.clipboard.writeText( recoveryCodes.join( '\n' ) );
		copied = true;
	} catch {
		fail( 'Failed to copy to clipboard' );
	}
};

const disable = async () => {
	if ( busy || !password ) return;

	busy = true;
	errorMessage = '';
	try {
		const res = await user_2fa_disable( { password } );
		if ( !res.ok ) return fail( res.error.message || 'Failed to disable 2FA' );

		password = '';
		secret = '';
		otpauthUrl = '';
		step = 'disabled';
		onchange?.( false );
	} finally {
		busy = false;
	}
};
</script>

<div class="tfa-config-container">
	{#if step === 'loading'}
		<p class="info-message">Loading...</p>
	{:else if step === 'disabled'}
		<div class="tfa-section">
			<h3 class="tfa-title">Two-Factor Authentication</h3>
			<p class="info-message">
				2FA is currently <strong>disabled</strong>. Enable it to protect your account with a code from your authenticator app.
			</p>
			<Button onclick={startSetup} disabled={busy}>{busy ? 'Starting...' : 'Enable 2FA'}</Button>
		</div>
	{:else if step === 'setup'}
		<div class="tfa-section">
			<h3 class="tfa-title">Set up Two-Factor Authentication</h3>
			<p class="info-message">
				Add this account to your authenticator app (Google Authenticator, Authy, 1Password...), then enter the 6-digit code it generates.
			</p>
			<QRCode value={otpauthUrl} size={200} onerror={fail} />
			<div class="secret-box">
				<span class="secret-label">Secret key (manual entry)</span>
				<code class="secret-value">{secret}</code>
			</div>
			<Input
				name="code"
				label="6-digit code"
				type="text"
				required={true}
				bind:value={code}
			/>
			<div class="btns">
				<Button mode="secondary" onclick={() => ( step = 'disabled' )} disabled={busy}>Cancel</Button>
				<Button onclick={enable} disabled={busy}>{busy ? 'Verifying...' : 'Verify & Enable'}</Button>
			</div>
		</div>
	{:else if step === 'codes'}
		<div class="tfa-section">
			<h3 class="tfa-title">Save your recovery codes</h3>
			<p class="alert-message">
				These codes are shown only once. Save them somewhere safe - each can be used a single time if you lose access to your authenticator app.
			</p>
			<ul class="codes-list">
				{#each recoveryCodes as rc}
					<li><code>{rc}</code></li>
				{/each}
			</ul>
			<div class="btns">
				<Button mode="secondary" onclick={copyCodes}>{copied ? 'Copied!' : 'Copy codes'}</Button>
				<Button onclick={finishSetup}>Done</Button>
			</div>
		</div>
	{:else}
		<div class="tfa-section">
			<h3 class="tfa-title">Two-Factor Authentication</h3>
			<p class="info-message">
				2FA is currently <strong>enabled</strong>. To disable it, confirm your account password.
			</p>
			<Input
				name="password"
				label="Current password"
				type="password"
				required={true}
				bind:value={password}
			/>
			<Button mode="error" onclick={disable} disabled={busy}>{busy ? 'Disabling...' : 'Disable 2FA'}</Button>
		</div>
	{/if}

	{#if errorMessage}
		<p class="error-message">{errorMessage}</p>
	{/if}
</div>

<style>
.tfa-config-container {
	min-width: 400px;
}

.tfa-section {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1rem;
}

.tfa-title {
	margin: 0;
	font-size: 1.1rem;
}

.info-message {
	font-size: 14px;
	margin: 0;
	line-height: 1.5;
}

.alert-message {
	color: var(--liwe3-text-on-warning);
	background-color: var(--liwe3-warning-subtle);
	border: 1px solid var(--liwe3-warning);
	border-radius: 6px;
	padding: 0.75rem;
	font-size: 14px;
	margin: 0;
	line-height: 1.5;
}

.error-message {
	color: var(--liwe3-text-on-error);
	background-color: var(--liwe3-error-subtle);
	border: 1px solid var(--liwe3-error);
	border-radius: 4px;
	padding: 0.5rem;
	font-size: 14px;
	margin: 0.5rem 1rem 1rem;
}

.secret-box {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	background-color: var(--liwe3-surface-sunken);
	border: 1px solid var(--liwe3-border);
	border-radius: 6px;
	padding: 0.75rem;
}

.secret-label {
	font-size: 12px;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--liwe3-text-muted);
}

.secret-value {
	font-size: 16px;
	font-weight: 600;
	letter-spacing: 0.1em;
	word-break: break-all;
}

.codes-list {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 0.5rem;
	list-style: none;
	margin: 0;
	padding: 0;
}

.codes-list li {
	background-color: var(--liwe3-surface-sunken);
	border: 1px solid var(--liwe3-border);
	border-radius: 4px;
	padding: 0.4rem 0.6rem;
	text-align: center;
	font-size: 14px;
}

.btns {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	gap: 0.5rem;
}
</style>
