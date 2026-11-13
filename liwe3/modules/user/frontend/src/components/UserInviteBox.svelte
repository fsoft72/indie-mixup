<script lang="ts">
import type { LiWEResponse } from '@frontend/liwe3';
import { onMount } from 'svelte';
import type { UserInvite } from '../types';
import { user_invite_create } from '../actions';
import copyToClipboard from '@frontend/liwe3/actions/copyToClipboard';

let inviteCode = $state( '' );
let isLoading = $state( true );

/**
 * Fetches a new invite code from the API
 */
const getInvCode = async () => {
	isLoading = true;
	const res : LiWEResponse<UserInvite> = await user_invite_create();
	if ( !res.ok ) {
		isLoading = false;
		return;
	}

	inviteCode = res.data!.code;
	isLoading = false;
};

onMount( async () => {
	await getInvCode();
} );
</script>

<div class="uinv-cnt">
	<div class="invite-card">
		<div class="header">
			<h3>Your Invite Code</h3>
		</div>

		<p class="description">Share this code with others to invite them to join</p>

		{#if isLoading}
			<div class="code-display loading">
				<div class="skeleton"></div>
			</div>
		{:else}
			<div class="code-display">
				<code class="invite-code">{inviteCode}</code>
			</div>
		{/if}

		<div class="actions">
			<button
				class="btn btn-primary"
				use:copyToClipboard={inviteCode}
				disabled={isLoading || !inviteCode}
			>
				<svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M8 4V16C8 16.5304 8.21071 17.0391 8.58579 17.4142C8.96086 17.7893 9.46957 18 10 18H18C18.5304 18 19.0391 17.7893 19.4142 17.4142C19.7893 17.0391 20 16.5304 20 16V7.242C20 6.97556 19.9467 6.71181 19.8433 6.46624C19.7399 6.22068 19.5885 5.99824 19.398 5.812L16.083 2.57C15.7094 2.20466 15.2076 2.00007 14.685 2H10C9.46957 2 8.96086 2.21071 8.58579 2.58579C8.21071 2.96086 8 3.46957 8 4Z"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M16 18V20C16 20.5304 15.7893 21.0391 15.4142 21.4142C15.0391 21.7893 14.5304 22 14 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V9C4 8.46957 4.21071 7.96086 4.58579 7.58579C4.96086 7.21071 5.46957 7 6 7H8"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<span class="btn-text">Copy Code</span>
				<span class="btn-text-copied">Copied!</span>
			</button>
		</div>
	</div>
</div>

<style>
.uinv-cnt {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 2rem;
}

.invite-card {
	/* Darkened gradient + fixed light text: in dark mode the primary is light and the themed text-on-primary has no contrast on it */
	--uinv-text: oklch(0.98 0 0);
	background: linear-gradient(
		135deg,
		color-mix(in oklch, var(--liwe3-primary) 55%, black) 0%,
		color-mix(in oklch, var(--liwe3-accent) 55%, black) 100%
	);
	border-radius: 1.5rem;
	padding: 2.5rem;
	max-width: 800px;
	width: 100%;
	color: var(--uinv-text);
	position: relative;
	overflow: hidden;
}

.invite-card::before {
	content: "";
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(
		135deg,
		color-mix(in oklch, var(--uinv-text) 10%, transparent) 0%,
		transparent 100%
	);
	pointer-events: none;
}

.header {
	display: flex;
	align-items: center;
	gap: 1rem;
	margin-bottom: 1rem;
}

h3 {
	margin: 0;
	font-size: 1.75rem;
	font-weight: 700;
	letter-spacing: -0.5px;
}

.description {
	margin: 0 0 2rem 0;
	opacity: 0.85;
	font-size: 0.95rem;
	line-height: 1.5;
}

.code-display {
	background: var(--liwe3-scrim);
	border-radius: 12px;
	padding: 1.5rem;
	margin-bottom: 1.5rem;
	backdrop-filter: blur(10px);
	border: 1px solid color-mix(in oklch, var(--uinv-text) 10%, transparent);
}

.code-display.loading {
	min-height: 60px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.skeleton {
	width: 100%;
	height: 30px;
	background: linear-gradient(
		90deg,
		color-mix(in oklch, var(--uinv-text) 10%, transparent) 0%,
		color-mix(in oklch, var(--uinv-text) 20%, transparent) 50%,
		color-mix(in oklch, var(--uinv-text) 10%, transparent) 100%
	);
	background-size: 200% 100%;
	animation: loading 1.5s ease-in-out infinite;
	border-radius: 6px;
}

@keyframes loading {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}

.invite-code {
	font-family: "Monaco", "Courier New", monospace;
	font-size: 1.0rem;
	font-weight: 700;
	letter-spacing: 3px;
	color: var(--uinv-text);
	text-align: center;
	display: block;
	text-shadow: 0 2px 4px var(--liwe3-shadow-color);
	word-break: break-all;
	line-height: 1.6;
}

.actions {
	display: flex;
	gap: 0.75rem;
}

.btn {
	flex: 1;
	padding: 0.875rem 1.25rem;
	border: none;
	border-radius: 10px;
	font-size: 0.95rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	position: relative;
	overflow: hidden;
}

.btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-icon {
	width: 18px;
	height: 18px;
}

.btn-text-copied {
	display: none;
}

.btn:global(.copied) .btn-text {
	display: none;
}

.btn:global(.copied) .btn-text-copied {
	display: block;
}

.btn-primary {
	background: var(--liwe3-surface);
	color: var(--liwe3-primary);
}

.btn-primary:hover:not(:disabled) {
	transform: translateY(-2px);
	box-shadow: 0 8px 20px var(--liwe3-shadow-color);
}

.btn-primary:active:not(:disabled) {
	transform: translateY(0);
}

@media (max-width: 480px) {
	.uinv-cnt {
		padding: 1rem;
	}

	.invite-card {
		padding: 1.5rem;
	}

	h3 {
		font-size: 1.5rem;
	}

	.invite-code {
		font-size: 1.25rem;
		letter-spacing: 2px;
	}

	.actions {
		flex-direction: column;
	}

	.btn {
		width: 100%;
	}
}
</style>
