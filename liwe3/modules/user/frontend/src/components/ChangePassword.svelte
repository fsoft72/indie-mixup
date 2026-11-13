<script lang="ts">
import { FormCreator, type FormField, type LiWEResponse } from '@frontend/liwe3';
import { toastAdd } from '@liwe3/webcomponents-svelte';
import { user_set_password } from '../actions';
import { type User } from '../types';

interface Props {
	userId : string;
	username? : string;
	onchanged? : () => void;
}

let { userId, username, onchanged } : Props = $props();

const fields : FormField[] = [
	{
		name: 'password',
		label: 'New Password',
		type: 'password',
		required: true,
		col: 12,
	},
	{
		name: 'password_confirm',
		label: 'Confirm New Password',
		type: 'password',
		required: true,
		col: 12,
	},
];

const my_onsubmit = async ( data : Record<string, any> ) => {
	if ( data.password !== data.password_confirm ) {
		toastAdd( {
			title: 'Passwords do not match',
			type: 'error',
			text: 'The two passwords you entered are not the same.',
		} );
		return;
	}

	const res : LiWEResponse<User> = await user_set_password( { id: userId, password: data.password } );

	if ( !res.ok ) {
		toastAdd( {
			title: 'Could not change password',
			type: 'error',
			text: res.error?.message || `Could not change the password for ${username ?? 'this user'}.`,
		} );
		return;
	}

	toastAdd( {
		title: 'Password changed',
		type: 'success',
		text: `Password for ${username ?? 'the user'} has been updated.`,
	} );

	onchanged?.();
};
</script>

<FormCreator {fields} onsubmit={my_onsubmit} submitLabel="Change Password" showReset={false} />
