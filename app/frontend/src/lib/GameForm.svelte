<script lang="ts">
import { FormCreator, type FormField } from '@frontend/liwe3';
import { type IndieGameCard, type IndieGameDetail, T, asUrls, imageUrl, indiegame_add, indiegame_list, uploadPath } from '@frontend-modules/indiegame';
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

const toUrl = ( key : string ) => uploadPath( key );

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
	<FormCreator {fields} {values} onsubmit={save} submitLabel={editing ? 'Save' : 'Publish'} showReset={false} />

	<section>
		<h3>Screenshots (at least one)</h3>
		<Upload folder="indiegame" validFiletypes={IMAGE_TYPES} maxFileSize={MAX_IMAGE_MB} onfilecomplete={( e ) => ( screenshots = [ ...screenshots, toUrl( e.key ) ] )} />
		<div class="thumbs">
			{#each screenshots as url (url)}
				<figure>
					<img src={imageUrl( url )} alt="Screenshot" />
					<button class="liwe3-btn" onclick={() => ( screenshots = screenshots.filter( ( s ) => s !== url ) )}>Remove</button>
				</figure>
			{/each}
		</div>
	</section>

	<section>
		<h3>Gallery (optional)</h3>
		<Upload folder="indiegame" validFiletypes={IMAGE_TYPES} maxFileSize={MAX_IMAGE_MB} onfilecomplete={( e ) => ( gallery = [ ...gallery, toUrl( e.key ) ] )} />
		<div class="thumbs">
			{#each gallery as url (url)}
				<figure>
					<img src={imageUrl( url )} alt="Gallery" />
					<button class="liwe3-btn" onclick={() => ( gallery = gallery.filter( ( s ) => s !== url ) )}>Remove</button>
				</figure>
			{/each}
		</div>
	</section>

	<section>
		<h3>Remix of</h3>
		{#if remixOf}
			<p>This game is a remix of <strong>{remixName || remixOf}</strong>. <button class="liwe3-btn" onclick={clearRemix}>Clear</button></p>
		{/if}
		<FormCreator fields={searchFields} onchange={search} showButtons={false} padding="0" />
		<ul class="candidates">
			{#each candidates as candidate (candidate.id)}
				<li><button class="liwe3-btn" onclick={() => pick( candidate )}>{candidate.name}</button></li>
			{/each}
		</ul>
	</section>

	{#if saving}<p>Saving...</p>{/if}
</div>

<style>
.form {
	display: grid;
	gap: 1rem;
}
.thumbs {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem;
	margin-top: 0.5rem;
}
figure {
	margin: 0;
}
figure img {
	width: 10rem;
	aspect-ratio: 16 / 9;
	object-fit: cover;
	border-radius: 0.4rem;
	display: block;
}
.candidates {
	list-style: none;
	padding: 0;
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}
</style>
