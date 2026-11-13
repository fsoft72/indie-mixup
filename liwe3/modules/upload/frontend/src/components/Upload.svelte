<script lang="ts">
import { type ChunkFileEvent, ChunkUploader } from '@liwe3/webcomponents-svelte';
import { apiClient } from '@frontend/liwe3';

interface Props {
	/** The label for "Drop files here" message */
	labelDropFiles? : string;
	/** The label for "Browse files" message */
	labelBrowse? : string;
	/** Upload chunk size in MB (min is 5mb) */
	chunkSize? : number;
	/** An optional array of valid filetypes (eg. [ 'jpg', 'jpeg', 'webp' ] */
	validFiletypes? : string[];
	/** Max file size in MB */
	maxFileSize? : number;

	/** Folder */
	folder? : string;

	onfilecomplete? : ( event : ChunkFileEvent ) => void;
	onuploadcomplete? : ( events : ChunkFileEvent[] ) => void;
	onuploadaborted? : ( events : ChunkFileEvent[] ) => void;
}

let { labelDropFiles, labelBrowse, chunkSize = 5, validFiletypes, maxFileSize, onfilecomplete, onuploadaborted, onuploadcomplete, folder = $bindable() } : Props = $props();

const parseResponse = ( response : any, endpoint : 'initiate' | 'part' | 'complete' ) => {
	return response.data;
};
</script>

<ChunkUploader
	serverURL={apiClient.baseURL}
	authToken={apiClient.authToken}
	{parseResponse}
	{folder}
	{labelDropFiles}
	{labelBrowse}
	{chunkSize}
	{validFiletypes}
	{maxFileSize}
	{onfilecomplete}
	{onuploadcomplete}
	{onuploadaborted}
/>
