<script lang="ts">
import { Button } from '@frontend/liwe3';
import { onMount } from 'svelte';

interface Props {
	token? : string;
	onSuccess? : () => void;
	onError? : ( error : string ) => void;
}

let { token = '', onSuccess, onError } : Props = $props();

let loading = $state( true );
let success = $state( false );
let errorMessage = $state( '' );

onMount( async () => {
	if ( !token ) {
		const urlParams = new URLSearchParams( window.location.search );
		token = urlParams.get( 'token' ) || '';
	}

	if ( !token ) {
		errorMessage = 'No verification token provided';
		loading = false;
		if ( onError ) onError( errorMessage );
		return;
	}

	try {
		// Send the token in the request body, not the query string: query params
		// leak into proxy/CDN access logs and browser history.
		const response = await fetch( '/api/user/email/verify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify( { token } ),
		} );
		const result = await response.json();

		if ( result.success ) {
			success = true;
			if ( onSuccess ) onSuccess();
		} else {
			errorMessage = result.error || 'Verification failed. The link may be invalid or expired.';
			if ( onError ) onError( errorMessage );
		}
	} catch ( error ) {
		errorMessage = 'Network error. Please try again later.';
		if ( onError ) onError( errorMessage );
	} finally {
		loading = false;
	}
} );

const redirectToLogin = () => {
	window.location.href = '/';
};
</script>

<div class="liwe3-verify-container">
	{#if loading}
		<div class="liwe3-verify-card">
			<div class="liwe3-spinner"></div>
			<h2>Verifying your email...</h2>
			<p>Please wait while we verify your email address.</p>
		</div>
	{:else if success}
		<div class="liwe3-verify-card">
			<div class="liwe3-verify-icon liwe3-verify-icon--success">✓</div>
			<h2>Email Verified!</h2>
			<p>Your email address has been successfully verified.</p>
			<p>You can now log in to your account.</p>
			<Button onclick={redirectToLogin}>Go to Login</Button>
		</div>
	{:else}
		<div class="liwe3-verify-card">
			<div class="liwe3-verify-icon liwe3-verify-icon--error">✗</div>
			<h2>Verification Failed</h2>
			<p>{errorMessage}</p>
			<div class="liwe3-verify-actions">
				<Button onclick={redirectToLogin}>Go to Login</Button>
			</div>
		</div>
	{/if}
</div>

<style>
.liwe3-verify-container {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 400px;
	padding: var(--liwe3-space-6);
}

.liwe3-verify-card {
	text-align: center;
	max-width: 500px;
	padding: var(--liwe3-space-8) var(--liwe3-space-6);
	background-color: var(--liwe3-surface-raised);
	border: 1px solid var(--liwe3-border-subtle);
	border-radius: var(--liwe3-radius-lg);
	box-shadow: var(--liwe3-shadow-md);
}

.liwe3-spinner {
	width: 50px;
	height: 50px;
	border: 4px solid var(--liwe3-border);
	border-top-color: var(--liwe3-primary);
	border-radius: var(--liwe3-radius-full);
	animation: spin 1s linear infinite;
	margin: 0 auto var(--liwe3-space-6);
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.liwe3-verify-icon {
	width: 80px;
	height: 80px;
	border-radius: var(--liwe3-radius-full);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: var(--liwe3-text-4xl);
	font-weight: var(--liwe3-weight-bold);
	margin: 0 auto var(--liwe3-space-6);
}

.liwe3-verify-icon--success {
	background-color: var(--liwe3-success);
	color: var(--liwe3-text-on-success);
}

.liwe3-verify-icon--error {
	background-color: var(--liwe3-error);
	color: var(--liwe3-text-on-error);
}

h2 {
	margin: 0 0 var(--liwe3-space-4);
	color: var(--liwe3-text);
	font-size: var(--liwe3-text-2xl);
	font-weight: var(--liwe3-weight-semibold);
}

p {
	margin: 0 0 var(--liwe3-space-3);
	color: var(--liwe3-text-muted);
	font-size: var(--liwe3-text-base);
	line-height: var(--liwe3-leading-relaxed);
}

.liwe3-verify-actions {
	margin-top: var(--liwe3-space-6);
	display: flex;
	gap: var(--liwe3-space-4);
	justify-content: center;
}
</style>
