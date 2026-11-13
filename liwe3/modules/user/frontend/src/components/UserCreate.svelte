<script lang="ts">
import { FormCreator, type FormField, type LiWEResponse } from '@frontend/liwe3';
import { type User } from '../types';

import storeUserAdmin from '../store-admin.svelte';

interface Props {
	onusercreated? : ( resp : LiWEResponse<User> ) => Promise<void>;
	onsubmit? : ( data : Record<string, any> ) => Promise<boolean>;
}

let { onusercreated, onsubmit } : Props = $props();

const fields = [
	{
		name: 'username',
		label: 'username',
		required: true,
		type: 'text',
		col: 6,
	},
	{
		name: 'email',
		label: 'email',
		required: true,
		type: 'email',
		col: 6,
	},
	{
		name: 'password',
		label: 'password',
		required: true,
		type: 'password',
		col: 12,
	},
	{
		name: 'name',
		label: 'name',
		required: true,
		type: 'text',
		col: 6,
	},
	{
		name: 'lastname',
		label: 'lastname',
		required: true,
		type: 'text',
		col: 6,
	},
];

const my_onsubmit = async ( data : Record<string, any> ) => {
	const block = onsubmit ? await onsubmit( data ) : false;
	if ( block ) return;

	const res = await storeUserAdmin.add( data as any );

	onusercreated && await onusercreated( res as any );

	return true;
};
</script>

<FormCreator {fields} onsubmit={my_onsubmit} />
