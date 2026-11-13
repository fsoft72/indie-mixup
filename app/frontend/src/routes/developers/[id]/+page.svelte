<script lang="ts">
import { page } from '$app/state';
import { GameGrid, type IndieDeveloper, T, indiegame_developer_get } from '@frontend-modules/indiegame';

let developer = $state<IndieDeveloper | null>( null );
let error = $state( '' );

const load = async ( id : string ) => {
	const res = await indiegame_developer_get( { id_user: id } );

	if ( !res.ok || !res.data ) {
		developer = null;
		error = res.error?.message ?? T.error;
		return;
	}

	developer = res.data;
	error = '';
};

$effect( () => {
	void load( page.params.id ?? '' );
} );
</script>

<svelte:head><title>{developer?.author_name ?? 'Developer'} - Indie Mixup</title></svelte:head>

{#if error}
	<p class="liwe3-alert--error">{error}</p>
{:else if developer}
	<h1>{developer.author_name ?? developer.id_user}</h1>
	<p>{developer.originals} original games · {developer.remixes} remixes</p>
	<GameGrid games={developer.games ?? []} />
{/if}
