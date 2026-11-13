<script lang="ts">
import { FormCreator, type FormField } from '@frontend/liwe3';
import { toastAdd } from '@liwe3/webcomponents-svelte';
import { indiegame_report } from '../actions';
import { T } from '../texts';

interface Props {
	idGame : string;
	onsent? : () => void;
}

let { idGame, onsent } : Props = $props();

const fields : FormField[] = [
	{ name: 'reason', label: T.reportReason, type: 'textarea', required: true, col: 12 },
];

const send = async ( values : Record<string, unknown> ) => {
	const res = await indiegame_report( { id_game: idGame, reason: String( values.reason ?? '' ) } );

	if ( !res.ok ) {
		toastAdd( { title: T.error, type: 'error', text: res.error?.message ?? T.error } );
		return;
	}

	toastAdd( { title: T.reportSent, type: 'success', text: '' } );
	onsent?.();
};
</script>

<FormCreator {fields} onsubmit={send} submitLabel={T.reportSend} showReset={false} />
