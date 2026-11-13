<script lang="ts">
import { Input } from '@frontend/liwe3';
import storeUser from '../store.svelte';
import type { UserLogin } from '../types';

// Must match the backend rule in user_password_change_expired
const PASSWORD_MIN_LENGTH = 8;

interface Props {
	onsuccess? : () => void;
	onerror? : ( message : string ) => void;
	verificationError? : boolean;
	userEmail? : string;
}

let { onsuccess, onerror, verificationError = false, userEmail = '' } : Props = $props();

let username = $state( '' );
let password = $state( '' );
let code = $state( '' );
let step : 'login' | 'domain' | '2fa' | 'change_password' = $state( 'login' );
let domains : string[] = $state( [] );
let pendingToken = $state( '' );
let newPassword = $state( '' );
let newPasswordConfirm = $state( '' );
let changeReason : 'flag' | 'age' = $state( 'flag' );
let loading = $state( false );
let loginError = $state( '' );
let resendLoading = $state( false );
let resendSuccess = $state( false );
let resendError = $state( '' );

const fail = ( message : string ) => {
	if ( onerror ) return onerror( message );
	loginError = message;
};

/**
 * Moves to the "choose a new password" step. The backend answers with a short lived
 * token instead of a session when the password is expired: the token is sent back,
 * together with the new password, to complete the login.
 *
 * @param data - The login answer with `requires_password_change` set
 */
const startPasswordChange = ( data : UserLogin ) => {
	pendingToken = data.pending_token ?? '';
	changeReason = data.password_change_reason === 'age' ? 'age' : 'flag';
	newPassword = '';
	newPasswordConfirm = '';
	step = 'change_password';
};

/** Goes back to the login form, forgetting the domains and the password kept for the domain choice */
const backToLogin = () => {
	step = 'login';
	domains = [];
	password = '';
};

/** Validates the new password and completes the login with it */
const doChangePassword = async () => {
	if ( newPassword.length < PASSWORD_MIN_LENGTH ) return fail( `The password must be at least ${PASSWORD_MIN_LENGTH} characters long` );
	if ( newPassword !== newPasswordConfirm ) return fail( 'The two passwords do not match' );

	const res = await storeUser.changeExpiredPassword( pendingToken, newPassword );
	if ( !res.ok ) {
		// 401: the 5 minutes of the token are over, the user has to log in again
		if ( res.status === 401 ) {
			step = 'login';
			password = '';
			return fail( 'Your session has expired, please log in again' );
		}

		return fail( res.error?.message || 'Could not change the password' );
	}

	onsuccess?.();
};

/**
 * Logs in. When the credentials open accounts in more than one domain the backend asks
 * which one to use: the user picks it and the login is repeated with that domain.
 *
 * @param e - The submit event, if any
 * @param domain - The domain chosen by the user, when the backend asked for it
 */
const doLogin = async ( e? : Event, domain? : string ) => {
	if ( e ) e.preventDefault();
	if ( loading ) return;

	loading = true;
	loginError = '';

	try {
		if ( step === 'change_password' ) return await doChangePassword();

		if ( step === '2fa' ) {
			const res = await storeUser.verify2fa( pendingToken, code.trim() );
			if ( !res.ok ) return fail( res.error.message || 'Invalid 2FA code' );
			if ( res.data?.requires_password_change ) return startPasswordChange( res.data );
			onsuccess?.();
			return;
		}

		const res = await storeUser.login( username, password, domain );
		if ( !res.ok ) return fail( res.error.message || 'Login failed' );

		if ( res.data?.requires_domain_choice ) {
			domains = res.data.domains ?? [];
			step = 'domain';
			return;
		}

		if ( res.data?.requires_2fa ) {
			pendingToken = res.data.pending_token ?? '';
			step = '2fa';
			code = '';
			return;
		}

		if ( res.data?.requires_password_change ) return startPasswordChange( res.data );

		onsuccess?.();
	} finally {
		loading = false;
	}
};

const forgotPassword = ( e : Event ) => {
	e.preventDefault();
	e.stopPropagation();
	// Implement forgot password logic here
	console.log( 'Forgot password clicked' );
};

const resendVerification = async ( e : Event ) => {
	e.preventDefault();
	e.stopPropagation();

	const emailToResend = userEmail || username;
	if ( !emailToResend ) {
		resendError = 'Please enter your email address';
		return;
	}

	resendLoading = true;
	resendError = '';
	resendSuccess = false;

	try {
		const response = await fetch( '/api/user/email/resend', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify( { email: emailToResend } ),
		} );

		const result = await response.json();

		if ( result.success ) {
			resendSuccess = true;
		} else {
			resendError = result.error || 'Failed to resend verification email';
		}
	} catch ( error ) {
		resendError = 'Network error. Please try again later.';
	} finally {
		resendLoading = false;
	}
};
</script>

<div class="login-cnt form-container">
	{#if step === 'change_password'}
		<p class="tfa-message">
			{#if changeReason === 'age'}
				Your password has expired. Choose a new one to continue.
			{:else}
				You must choose a new password before you can continue.
			{/if}
		</p>
		{#if loginError}
			<p class="error-message">{loginError}</p>
		{/if}
		<Input
			name="new_password"
			label="New Password"
			type="password"
			required={true}
			bind:value={newPassword}
		/>
		<Input
			name="new_password_confirm"
			label="Confirm New Password"
			type="password"
			required={true}
			bind:value={newPasswordConfirm}
		/>
		<div class="btns">
			<button type="button" class="back-btn" onclick={() => ( step = 'login' )} disabled={loading}>Back</button>
			<button type="submit" disabled={loading} onclick={doLogin}>{loading ? 'Saving...' : 'Change password'}</button>
		</div>
	{:else if step === 'domain'}
		<p class="tfa-message">
			These credentials are valid in more than one domain. Choose where to log in.
		</p>
		{#if loginError}
			<p class="error-message">{loginError}</p>
		{/if}
		<ul class="domains">
			{#each domains as domain (domain)}
				<li>
					<button type="button" class="domain-btn" disabled={loading} onclick={() => doLogin( undefined, domain )}>{domain}</button>
				</li>
			{/each}
		</ul>
		<div class="btns">
			<button type="button" class="back-btn" onclick={backToLogin} disabled={loading}>Back</button>
		</div>
	{:else if step === '2fa'}
		<p class="tfa-message">
			Enter the 6-digit code from your authenticator app, or one of your recovery codes.
		</p>
		{#if loginError}
			<p class="error-message">{loginError}</p>
		{/if}
		<Input
			name="code"
			label="2FA Code"
			type="text"
			required={true}
			bind:value={code}
		/>
		<div class="btns">
			<button type="button" class="back-btn" onclick={() => ( step = 'login' )} disabled={loading}>Back</button>
			<button type="submit" disabled={loading} onclick={doLogin}>{loading ? 'Verifying...' : 'Verify'}</button>
		</div>
	{:else}
		{#if verificationError}
			<div class="verification-alert">
				<p class="alert-message">
					⚠️ Please verify your email address before logging in. Check your inbox for the verification link.
				</p>
				{#if resendSuccess}
					<p class="success-message">✓ Verification email sent! Please check your inbox.</p>
				{:else if resendError}
					<p class="error-message">{resendError}</p>
				{:else}
					<button
						type="button"
						class="resend-btn"
						onclick={resendVerification}
						disabled={resendLoading}
					>
						{resendLoading ? 'Sending...' : 'Resend Verification Email'}
					</button>
				{/if}
			</div>
		{/if}

		{#if loginError}
			<p class="error-message">{loginError}</p>
		{/if}
		<Input
			name="username"
			label="Username / Email"
			type="text"
			required={true}
			bind:value={username}
		/>
		<Input
			name="password"
			label="Password"
			type="password"
			required={true}
			bind:value={password}
		/>
		<div class="btns">
			<a href="/user/forgot" onclick={forgotPassword}>Forgot password?</a>
			<button type="submit" disabled={loading} onclick={doLogin}>{loading ? 'Logging in...' : 'Login'}</button>
		</div>
	{/if}
</div>

<style>
.login-cnt {
	min-width: 500px;
}

.btns {
	display: flex;
	flex-direction: row;
	justify-content: space-between;

	padding-top: 0.5rem;
}

.tfa-message {
	font-size: 14px;
	margin: 0;
	line-height: 1.5;
}

.verification-alert {
	background-color: var(--liwe3-warning-subtle);
	border: 1px solid var(--liwe3-warning);
	border-radius: 6px;
	padding: 1rem;
	margin-bottom: 1rem;
}

.alert-message {
	color: var(--liwe3-text-on-warning);
	font-size: 14px;
	margin: 0 0 0.75rem;
	line-height: 1.5;
}

.success-message {
	color: var(--liwe3-text-on-success);
	background-color: var(--liwe3-success-subtle);
	border: 1px solid var(--liwe3-success);
	border-radius: 4px;
	padding: 0.5rem;
	font-size: 14px;
	margin: 0.5rem 0 0;
}

.error-message {
	color: var(--liwe3-text-on-error);
	background-color: var(--liwe3-error-subtle);
	border: 1px solid var(--liwe3-error);
	border-radius: 4px;
	padding: 0.5rem;
	font-size: 14px;
	margin: 0.5rem 0 0;
}

.domains {
	list-style: none;
	margin: 0.5rem 0 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.domain-btn {
	width: 100%;
	padding: 0.9rem 1rem;
	font-size: 1.1rem;
	text-align: left;
	cursor: pointer;
}

.back-btn {
	background: none;
	border: none;
	cursor: pointer;
	font-size: 14px;
	padding: 0;
}

.resend-btn {
	background-color: var(--liwe3-primary);
	color: var(--liwe3-text-on-primary);
	border: none;
	border-radius: 4px;
	padding: 0.5rem 1rem;
	font-size: 14px;
	cursor: pointer;
	transition: background-color 0.2s;
}

.resend-btn:hover:not(:disabled) {
	background-color: var(--liwe3-primary-hover);
}

.resend-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
