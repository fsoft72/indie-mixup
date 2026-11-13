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

const initial = $derived( ( developer?.author_name ?? '?' ).trim().charAt( 0 ).toUpperCase() );
</script>

<svelte:head><title>{developer?.author_name ?? 'Developer'} - Indie Mixup</title></svelte:head>

{#if error}
	<div class="liwe3-alert--error">{error}</div>
{:else if developer}
	<p class="im-eyebrow">// developer</p>
	<section class="profile im-panel">
		<div class="avatar" aria-hidden="true">{initial}</div>
		<div>
			<h1>{developer.author_name ?? developer.id_user}</h1>
			<p class="counts">
				<span class="im-chip">{developer.originals} original games</span>
				<span class="im-chip im-chip--remix">{developer.remixes} remixes</span>
			</p>
		</div>
	</section>

	<div class="im-section-title"><h2>Games</h2></div>
	<GameGrid games={developer.games ?? []} />
{/if}

<style>
.profile {
	display: flex;
	align-items: center;
	gap: var(--liwe3-space-5);
}
.avatar {
	display: grid;
	place-items: center;
	flex: none;
	width: 4.5rem;
	height: 4.5rem;
	border-radius: var(--liwe3-radius-full);
	border: 2px solid var(--liwe3-primary);
	box-shadow: var(--im-glow-primary);
	font-family: var(--im-font-display);
	font-weight: 900;
	font-size: 1.8rem;
	color: var(--liwe3-primary);
	background: var(--liwe3-primary-subtle);
}
h1 {
	margin-bottom: var(--liwe3-space-2);
}
.counts {
	margin: 0;
	display: flex;
	flex-wrap: wrap;
	gap: var(--liwe3-space-2);
}
</style>
