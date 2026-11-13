<script lang="ts">
import { FormCreator, type FormField } from '@frontend/liwe3';
import { onMount } from 'svelte';

import { user_register, user_register_config } from '../actions';
import type { User, UserRegisterConfig } from '../types';

// Must match the backend rules in user_register
const PASSWORD_MIN_LENGTH = 8;

interface Props {
	/** True while the form is shown: the parent can hide the login meanwhile */
	open? : boolean;
	/** Called with the new user after a successful registration */
	onregistered? : ( user : User ) => void;
}

let { open = $bindable( false ), onregistered } : Props = $props();

let config = $state<UserRegisterConfig | null>( null );
let values : Record<string, any> = $state( {} );
let busy = $state( false );
let error = $state( '' );
let done = $state( false );

/** The form fields: the auth code is asked only when the settings require it */
const fields : FormField[] = $derived( [
	{ name: 'username', label: 'Username', type: 'text', required: true, col: 6 },
	{ name: 'email', label: 'Email', type: 'email', required: true, col: 6 },
	{ name: 'name', label: 'Name', type: 'text', col: 6 },
	{ name: 'lastname', label: 'Lastname', type: 'text', col: 6 },
	{ name: 'password', label: 'Password', type: 'password', required: true, col: 6 },
	{ name: 'password_confirm', label: 'Confirm password', type: 'password', required: true, col: 6 },
	...( config?.auth_code_required ? [ { name: 'auth_code', label: 'Registration auth code', type: 'text', required: true, col: 12 } ] : [] ),
] as FormField[] );

onMount( async () => {
	const res = await user_register_config();
	// A failed call hides the form, like a closed registration
	if ( res.ok && res.data ) config = res.data;
} );

/**
 * Checks the password and sends the registration.
 *
 * @param data - The form values
 */
const submit = async ( data : Record<string, any> ) => {
	if ( busy ) return;

	error = '';
	if ( data.password.length < PASSWORD_MIN_LENGTH ) return void ( error = `The password must be at least ${PASSWORD_MIN_LENGTH} characters long` );
	if ( data.password !== data.password_confirm ) return void ( error = 'The two passwords do not match' );

	busy = true;
	const { password_confirm, ...params } = data;
	const res = await user_register( params as Parameters<typeof user_register>[0] );
	busy = false;

	if ( !res.ok || !res.data ) return void ( error = res.message || 'Registration failed' );

	done = true;
	onregistered?.( res.data );
};
</script>

{#if config?.enabled}
	<div class="user-registration form-container">
		{#if !open}
			<button type="button" class="register-btn" onclick={() => ( open = true )}>Register</button>
		{:else if done}
			<p class="success-message">Registration completed. Check your inbox for the email verification link, then log in.</p>
			<button type="button" class="register-btn" onclick={() => ( open = false )}>Go to login</button>
		{:else}
			{#if error}
				<p class="error-message" role="alert">{error}</p>
			{/if}
			<FormCreator bind:values {fields} submitLabel={busy ? 'Registering...' : 'Register'} showReset={false} onsubmit={submit} />
			<button type="button" class="back-btn" onclick={() => ( open = false )} disabled={busy}>Cancel</button>
		{/if}
	</div>
{/if}

<style>
.error-message {
	color: var(--liwe3-text-on-error);
	background-color: var(--liwe3-error-subtle);
	border: 1px solid var(--liwe3-error);
	border-left-width: 6px;
	border-radius: 4px;
	padding: 0.75rem 1rem;
	margin: 0 0 1rem;
	font-size: 15px;
	font-weight: 600;
}

.error-message::before {
	content: "\26A0\00a0";
}
</style>
