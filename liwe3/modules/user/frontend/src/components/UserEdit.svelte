<script lang="ts">
import { FormCreator, type FormField } from '@frontend/liwe3';
import { dialogAdd, toastAdd } from '@liwe3/webcomponents-svelte';

import { parseMaxAgeDays } from '../password-max-age';
import storeUserAdmin from '../store-admin.svelte';

interface Props {
	userId : string;
	username? : string;
	/** Days set on the user: 0 never expires, undefined / null use the global default */
	passwordMaxAgeDays? : number | null;
	/** Timestamp (unix ms) of the last password change, when known */
	passwordChangedAt? : number | null;
	/** True when a password change is already forced at the next login */
	passwordExpired? : boolean | null;
	onsaved? : () => void;
}

let { userId, username, passwordMaxAgeDays, passwordChangedAt, passwordExpired, onsaved } : Props = $props();

// svelte-ignore state_referenced_locally (initial values: the modal is rebuilt every time it opens)
let forced = $state( !!passwordExpired );
let busy = $state( false );

// The read only fields are FormCreator fields too: their value lives in `values`
// svelte-ignore state_referenced_locally
let values : Record<string, any> = $state( {
	password_max_age_days: passwordMaxAgeDays ?? '',
	last_change: passwordChangedAt ? new Date( passwordChangedAt ).toLocaleString() : 'Not recorded',
	forced: passwordExpired ? 'Yes' : 'No',
} );

const fail = ( title : string, text : string ) => toastAdd( { title, type: 'error', text } );

/**
 * Saves the expiry days. An empty field is "no value" (the user follows the global default):
 * `parseMaxAgeDays` gives undefined and the request leaves the `days` key out.
 */
const save = async ( data : Record<string, any> ) => {
	const parsed = parseMaxAgeDays( data.password_max_age_days );
	if ( !parsed.ok ) return fail( 'Invalid value', parsed.error );

	const res = await storeUserAdmin.setPasswordMaxAge( userId, parsed.days );
	if ( !res.ok ) return fail( 'Update failed', res.error?.message || 'Could not save the password expiry.' );

	toastAdd( { title: 'Saved', type: 'success', text: `Password expiry updated for ${username ?? 'the user'}.` } );
	onsaved?.();
};

const setForced = async ( expired : boolean ) => {
	busy = true;
	const res = await storeUserAdmin.setPasswordExpired( userId, expired );
	busy = false;

	if ( !res.ok ) return fail( 'Update failed', res.error?.message || 'Could not change the forced password change.' );

	forced = expired;
	values.forced = expired ? 'Yes' : 'No';
	toastAdd( {
		title: expired ? 'Password change forced' : 'Forced change cancelled',
		type: 'success',
		text: expired
			? `${username ?? 'The user'} will have to choose a new password at the next login.`
			: `${username ?? 'The user'} is no longer forced to change the password.`,
	} );
	onsaved?.();
};

/** Forcing asks for a confirmation, cancelling does not: it is the harmless direction */
const toggleForced = () => {
	if ( forced ) return setForced( false );

	dialogAdd( {
		title: 'Force password change',
		body: `<p><strong>${username ?? 'The user'}</strong> will have to choose a new password at the next login. Open sessions are not closed.</p>`,
		buttons: [
			{
				label: 'Force change',
				backgroundColor: 'var(--liwe3-error)',
				onclick: async ( dialog ) => {
					dialog?.close();
					await setForced( true );
				},
			},
			{ label: 'Cancel', onclick: ( dialog ) => dialog?.close() },
		],
	} );
};

// The type 'button' plugin (FormButton) has to be registered by the app, like 'text' and 'title'.
// Label and colour of the button follow `forced`, hence $derived.
const fields : FormField[] = $derived( [
	{
		name: 'password_max_age_days',
		label: 'Password expiry (days)',
		type: 'text',
		// 'extra' is what FormTextInput forwards to the <input>: a top level `placeholder` is ignored
		extra: { type: 'number', placeholder: 'Empty: site default - 0: never expires' },
		col: 12,
	},
	{
		name: 'last_change',
		label: 'Last password change',
		type: 'text',
		extra: { disabled: true },
		col: 6,
	},
	{
		name: 'forced',
		label: 'Change forced at next login',
		type: 'text',
		extra: { disabled: true },
		col: 6,
	},
	{
		name: 'force_change',
		label: forced ? 'Cancel forced change' : 'Force change password',
		type: 'button',
		extra: { mode: forced ? 'neutral' : 'error', disabled: busy },
		onclick: toggleForced,
		col: 12,
	},
] );
</script>

<div class="user-edit">
	<FormCreator {fields} bind:values onsubmit={save} submitLabel="Save" showReset={false} />
</div>

<style>
/* The theme has no style for :disabled inputs: dim the read only fields so they do not look editable */
.user-edit :global(input:disabled) {
	opacity: 0.65;
	cursor: default;
}
</style>
