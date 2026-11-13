<script lang="ts">
import { FormCreator, type FormField } from '@frontend/liwe3';
import { Icon, type IndieGameCard, type IndieGameDetail, T, asUrls, imageUrl, indiegame_add, indiegame_list, uploadPath } from '@frontend-modules/indiegame';
import { Upload } from '@frontend-modules/upload';
import { toastAdd } from '@liwe3/webcomponents-svelte';
import { untrack } from 'svelte';

interface Props {
	/** The game to edit; omitted to publish a new one */
	game? : IndieGameDetail;
	onsaved? : ( game : IndieGameDetail ) => void;
}

let { game, onsaved } : Props = $props();

const IMAGE_TYPES = [ 'jpg', 'jpeg', 'png', 'webp', 'gif' ];
const MAX_IMAGE_MB = 5;
const SEARCH_RESULTS = 8;

// The form starts from the game and then lives on its own, so the first value is read once on purpose
const start = untrack( () => game );
const editing = !!start;

let screenshots : string[] = $state( asUrls( start?.screenshots ) );
let gallery : string[] = $state( asUrls( start?.gallery ) );
let remixOf : string = $state( start?.id_remix_of ?? '' );
let remixName : string = $state( '' );
let candidates : IndieGameCard[] = $state( [] );
let saving = $state( false );
let form : { handleSubmit : ( e? : Event ) => Promise<void> } | undefined = $state();

const values : Record<string, unknown> = $state( {
	name: start?.name ?? '',
	description: start?.description ?? '',
	repo_url: start?.repo_url ?? '',
	video_urls: asUrls( start?.video_urls ).join( '\n' ),
} );

const fields : FormField[] = [
	{ name: 'name', label: 'Name', type: 'text', required: true, col: 12 },
	{ name: 'description', label: 'Description', type: 'textarea', required: true, col: 12 },
	{
		name: 'repo_url',
		label: 'Public GitHub repo (it must be your own personal repo)',
		type: 'text',
		required: true,
		col: 12,
		extra: editing ? { disabled: true } : {},
	},
	{ name: 'video_urls', label: 'Gameplay videos (one link per line, optional)', type: 'textarea', col: 12 },
];

const searchFields : FormField[] = [
	{ name: 'q', label: 'Is it a remix? Search the original game by name (leave empty for an original game)', type: 'text', col: 12 },
];

const search = async ( name : string, value : unknown ) => {
	if ( name !== 'q' ) return;

	const text = String( value ?? '' ).trim();
	if ( !text ) {
		candidates = [];
		return;
	}

	const res = await indiegame_list( { q: text, page: 1, limit: SEARCH_RESULTS } );
	candidates = ( res.data ?? [] ).filter( ( g ) => g.id !== game?.id );
};

const pick = ( candidate : IndieGameCard ) => {
	remixOf = candidate.id;
	remixName = candidate.name;
	candidates = [];
};

const clearRemix = () => {
	remixOf = '';
	remixName = '';
};

const save = async ( data : Record<string, unknown> ) => {
	if ( !screenshots.length ) {
		toastAdd( { title: 'A screenshot is required', type: 'error', text: 'Upload at least one screenshot.' } );
		return;
	}

	saving = true;

	const videos = String( data.video_urls ?? '' ).split( /[\n,]/ ).map( ( v ) => v.trim() ).filter( Boolean );
	const res = await indiegame_add( {
		id: game?.id,
		name: String( data.name ?? '' ),
		description: String( data.description ?? '' ),
		repo_url: editing ? undefined : String( data.repo_url ?? '' ),
		screenshots,
		gallery,
		video_urls: videos,
		id_remix_of: remixOf,
	} );

	saving = false;

	if ( !res.ok || !res.data ) {
		toastAdd( { title: T.error, type: 'error', text: res.error?.message ?? T.error } );
		return;
	}

	toastAdd( { title: editing ? 'Game updated' : 'Game published', type: 'success', text: '' } );
	onsaved?.( res.data );
};
</script>

<div class="form">
	<section class="im-panel">
		<h2><span class="step">01</span> Details</h2>
		<FormCreator bind:this={form} {fields} {values} onsubmit={save} showButtons={false} padding="0" />
	</section>

	<section class="im-panel">
		<h2><span class="step">02</span> Screenshots <small>at least one</small></h2>
		<Upload folder="indiegame" validFiletypes={IMAGE_TYPES} maxFileSize={MAX_IMAGE_MB} onfilecomplete={( e ) => ( screenshots = [ ...screenshots, uploadPath( e.key ) ] )} />
		{#if screenshots.length}
			<ul class="thumbs">
				{#each screenshots as url (url)}
					<li>
						<img src={imageUrl( url )} alt="Screenshot" />
						<button class="liwe3-btn" onclick={() => ( screenshots = screenshots.filter( ( s ) => s !== url ) )}>Remove</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="im-panel">
		<h2><span class="step">03</span> Gallery <small>optional</small></h2>
		<Upload folder="indiegame" validFiletypes={IMAGE_TYPES} maxFileSize={MAX_IMAGE_MB} onfilecomplete={( e ) => ( gallery = [ ...gallery, uploadPath( e.key ) ] )} />
		{#if gallery.length}
			<ul class="thumbs">
				{#each gallery as url (url)}
					<li>
						<img src={imageUrl( url )} alt="Gallery" />
						<button class="liwe3-btn" onclick={() => ( gallery = gallery.filter( ( s ) => s !== url ) )}>Remove</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="im-panel">
		<h2><span class="step">04</span> Remix of <small>optional</small></h2>
		{#if remixOf}
			<p class="picked">
				<span class="im-chip im-chip--remix"><Icon name="remix" size={12} /> {remixName || remixOf}</span> <button class="liwe3-btn liwe3-btn--ghost" onclick={clearRemix}>
					Clear
				</button>
			</p>
		{/if}
		<FormCreator fields={searchFields} onchange={search} showButtons={false} padding="0" />
		<ul class="candidates">
			{#each candidates as candidate (candidate.id)}
				<li><button class="liwe3-btn" onclick={() => pick( candidate )}>{candidate.name}</button></li>
			{/each}
		</ul>
	</section>

	<div class="publish">
		<button class="liwe3-btn liwe3-btn--primary" disabled={saving} onclick={() => form?.handleSubmit()}>
			<Icon name={editing ? 'arrow-right' : 'plus'} size={18} /> {saving ? 'Saving...' : editing ? 'Save changes' : 'Publish game'}
		</button>
	</div>
</div>

<style>
.form {
	display: grid;
	gap: var(--liwe3-space-5);
	max-width: 52rem;
}
h2 {
	display: flex;
	align-items: baseline;
	gap: var(--liwe3-space-3);
	margin-bottom: var(--liwe3-space-4);
}
.step {
	font-family: var(--im-font-mono);
	color: var(--liwe3-secondary);
	font-size: var(--liwe3-text-sm);
}
small {
	font-family: var(--liwe3-font-sans);
	font-size: var(--liwe3-text-xs);
	letter-spacing: 0.1em;
	color: var(--liwe3-text-muted);
	text-transform: uppercase;
	font-weight: var(--liwe3-weight-normal);
}
.thumbs {
	list-style: none;
	margin: var(--liwe3-space-4) 0 0;
	padding: 0;
	display: flex;
	flex-wrap: wrap;
	gap: var(--liwe3-space-3);
}
.thumbs li {
	display: grid;
	gap: var(--liwe3-space-2);
}
.thumbs img {
	width: 11rem;
	aspect-ratio: 16 / 9;
	object-fit: cover;
	border: 1px solid var(--im-panel-border);
	border-radius: var(--liwe3-radius-sm);
}
.picked {
	display: flex;
	align-items: center;
	gap: var(--liwe3-space-3);
	margin: 0 0 var(--liwe3-space-3);
}
.candidates {
	list-style: none;
	padding: 0;
	margin: var(--liwe3-space-3) 0 0;
	display: flex;
	flex-wrap: wrap;
	gap: var(--liwe3-space-2);
}
.publish {
	display: flex;
	justify-content: flex-end;
}
.publish :global(.liwe3-btn) {
	min-height: 3rem;
	padding-inline: var(--liwe3-space-6);
	box-shadow: var(--im-glow-primary);
}
</style>
