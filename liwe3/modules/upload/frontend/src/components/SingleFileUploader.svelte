<script lang="ts">
import { apiClient } from '@frontend/liwe3';
import type { SingleFileUploadError, SingleFileUploadResult, SingleFileUploadState } from '../types';

interface Props {
	/** Unique identifier for this uploader instance */
	id? : string;

	/** Folder path for uploaded files (e.g., "characters", "ref-images") */
	folder? : string;

	/** Accepted file types (e.g., ['image/*', '.png', '.jpg']) */
	accept? : string[];

	/** Maximum file size in MB (default: 10) */
	maxFileSize? : number;

	/** Upload chunk size in MB (min: 5, default: 5) */
	chunkSize? : number;

	/** Placeholder text when no file selected */
	placeholder? : string;

	/** Whether to show image preview (default: true) */
	showPreview? : boolean;

	/** Aspect ratio for preview container (e.g., "1/1", "16/9", "4/3") */
	aspectRatio? : string;

	/** Whether the uploader is disabled */
	disabled? : boolean;

	/** Initial image URL to display (for edit mode) */
	initialImageUrl? : string;

	/** Callback when upload completes successfully */
	onSuccess? : ( result : SingleFileUploadResult ) => void;

	/** Callback when upload fails */
	onError? : ( error : SingleFileUploadError ) => void;

	/** Callback when upload progress changes */
	onProgress? : ( progress : number ) => void;

	/** Callback when file is selected (before upload starts) */
	onFileSelected? : ( file : File ) => void;

	/** Callback when file/preview is cleared */
	onClear? : () => void;
}

let {
	id,
	folder = 'uploads',
	accept,
	maxFileSize = 10,
	chunkSize = 5,
	placeholder = 'Click to upload',
	showPreview = true,
	aspectRatio = '1/1',
	disabled = false,
	initialImageUrl,
	onSuccess,
	onError,
	onProgress,
	onFileSelected,
	onClear,
} : Props = $props();

// Internal state
let state = $state<SingleFileUploadState>( 'idle' );
let selectedFile = $state<File | null>( null );
let previewUrl = $state<string | null>( null );
let uploadProgress = $state<number>( 0 );
let uploadError = $state<SingleFileUploadError | null>( null );

// References
let fileInputRef = $state<HTMLInputElement | null>( null );

// Multipart upload tracking
let currentUploadId = $state<string | null>( null );
let currentUploadKey = $state<string | null>( null );
let abortController = $state<AbortController | null>( null );

// Derived state
let isUploading = $derived.by( () => state === 'uploading' );
let hasFile = $derived.by( () => selectedFile !== null || ( initialImageUrl !== undefined && initialImageUrl !== '' ) );
let displayUrl = $derived.by( () => previewUrl || initialImageUrl || null );

/**
 * Check if a file is an image
 */
const isImageFile = ( file : File ) : boolean => {
	return file.type.startsWith( 'image/' );
};

/**
 * Validate file type against accept list
 */
const validateFileType = ( file : File ) : boolean => {
	if ( !accept || accept.length === 0 ) return true;

	return accept.some( ( type ) => {
		if ( type.startsWith( '.' ) ) {
			return file.name.toLowerCase().endsWith( type.toLowerCase() );
		}
		if ( type.endsWith( '/*' ) ) {
			return file.type.startsWith( type.replace( '/*', '/' ) );
		}
		return file.type === type;
	} );
};

/**
 * Handle file selection from input
 */
const handleFileSelect = ( event : Event ) => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];

	if ( !file ) return;

	// Validate file type
	if ( !validateFileType( file ) ) {
		const error : SingleFileUploadError = {
			code: 'INVALID_FILE_TYPE',
			message: `File type not allowed. Accepted: ${accept?.join( ', ' ) || 'all'}`,
		};
		uploadError = error;
		state = 'error';
		onError?.( error );
		return;
	}

	// Validate file size
	const maxBytes = maxFileSize * 1024 * 1024;
	if ( file.size > maxBytes ) {
		const error : SingleFileUploadError = {
			code: 'FILE_TOO_LARGE',
			message: `File too large. Maximum: ${maxFileSize}MB`,
		};
		uploadError = error;
		state = 'error';
		onError?.( error );
		return;
	}

	selectedFile = file;
	state = 'selected';
	uploadError = null;

	// Generate preview for images
	if ( showPreview && isImageFile( file ) ) {
		const reader = new FileReader();
		reader.onload = ( e ) => {
			previewUrl = e.target?.result as string;
		};
		reader.readAsDataURL( file );
	}

	onFileSelected?.( file );

	// Reset file input so same file can be selected again
	input.value = '';
};

/**
 * Upload the selected file
 */
const uploadFile = async () : Promise<SingleFileUploadResult | null> => {
	if ( !selectedFile ) return null;

	state = 'uploading';
	uploadProgress = 0;
	uploadError = null;
	abortController = new AbortController();

	try {
		// 1. Initiate multipart upload
		const initRes = await fetch( `${apiClient.baseURL}/api/upload/initiate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiClient.authToken}`,
			},
			body: JSON.stringify( {
				fileName: selectedFile.name,
				fileType: selectedFile.type,
				folder: folder,
			} ),
			signal: abortController.signal,
		} );

		const initData = await initRes.json();
		if ( !initData.ok || !initData.data ) {
			const errorMsg = typeof initData.error === 'string' ? initData.error : ( initData.error?.message || 'Failed to initiate upload' );
			throw new Error( errorMsg );
		}

		currentUploadId = initData.data.uploadId;
		currentUploadKey = initData.data.key;

		// 2. Upload file in chunks
		const CHUNK_SIZE = Math.max( chunkSize, 5 ) * 1024 * 1024; // Min 5MB
		const totalChunks = Math.ceil( selectedFile.size / CHUNK_SIZE );
		const parts : { partNumber : number; etag : string }[] = [];

		for ( let i = 0; i < totalChunks; i++ ) {
			// Check for abort
			if ( abortController.signal.aborted ) {
				throw new Error( 'Upload aborted' );
			}

			const start = i * CHUNK_SIZE;
			const end = Math.min( start + CHUNK_SIZE, selectedFile.size );
			const chunk = selectedFile.slice( start, end );

			const partRes = await fetch( `${apiClient.baseURL}/api/upload/part`, {
				method: 'POST',
				headers: {
					'X-Upload-Id': currentUploadId!,
					'X-Key': currentUploadKey!,
					'X-Part-Number': String( i + 1 ),
					Authorization: `Bearer ${apiClient.authToken}`,
				},
				body: chunk,
				signal: abortController.signal,
			} );

			const partData = await partRes.json();
			if ( !partData.ok || !partData.data ) {
				const errorMsg = typeof partData.error === 'string' ? partData.error : ( partData.error?.message || 'Failed to upload chunk' );
				throw new Error( errorMsg );
			}

			parts.push( {
				partNumber: partData.data.partNumber,
				etag: partData.data.etag,
			} );

			// Update progress
			uploadProgress = Math.round( ( ( i + 1 ) / totalChunks ) * 100 );
			onProgress?.( uploadProgress );
		}

		// 3. Complete multipart upload
		const completeRes = await fetch( `${apiClient.baseURL}/api/upload/complete`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiClient.authToken}`,
			},
			body: JSON.stringify( {
				uploadId: currentUploadId,
				key: currentUploadKey,
				parts,
			} ),
			signal: abortController.signal,
		} );

		const completeData = await completeRes.json();
		if ( !completeData.ok || !completeData.data ) {
			const errorMsg = typeof completeData.error === 'string' ? completeData.error : ( completeData.error?.message || 'Failed to complete upload' );
			throw new Error( errorMsg );
		}

		// 4. Build result
		const result : SingleFileUploadResult = {
			key: completeData.data.key,
			originalFileName: selectedFile.name,
			size: completeData.data.size,
			mimeType: selectedFile.type,
			etag: completeData.data.etag,
			url: `${apiClient.baseURL}/api/upload/get?key=${encodeURIComponent( completeData.data.key )}`,
			thumbnailUrl: isImageFile( selectedFile )
				? `${apiClient.baseURL}/api/upload/get?key=${encodeURIComponent( completeData.data.key )}&variant=thumb`
				: undefined,
		};

		state = 'completed';
		abortController = null;
		onSuccess?.( result );
		return result;
	} catch ( error ) {
		if ( abortController?.signal.aborted ) {
			const abortErr : SingleFileUploadError = {
				code: 'ABORTED',
				message: 'Upload cancelled',
			};
			state = 'error';
			uploadError = abortErr;
			onError?.( abortErr );
		} else {
			const uploadErr : SingleFileUploadError = {
				code: error instanceof TypeError ? 'NETWORK_ERROR' : 'UPLOAD_FAILED',
				message: error instanceof Error ? error.message : 'Upload failed',
				originalError: error instanceof Error ? error : undefined,
			};
			state = 'error';
			uploadError = uploadErr;
			onError?.( uploadErr );
		}

		// Try to abort the upload on server if we have an upload ID
		if ( currentUploadId && currentUploadKey ) {
			try {
				await fetch( `${apiClient.baseURL}/api/upload/abort`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiClient.authToken}`,
					},
					body: JSON.stringify( {
						uploadId: currentUploadId,
						key: currentUploadKey,
					} ),
				} );
			} catch {
				// Ignore abort errors
			}
		}

		abortController = null;
		return null;
	}
};

/**
 * Clear the selected file and preview
 */
const handleClear = ( event? : Event ) => {
	event?.stopPropagation();

	// Cancel any ongoing upload
	if ( abortController ) {
		abortController.abort();
	}

	selectedFile = null;
	previewUrl = null;
	uploadProgress = 0;
	uploadError = null;
	currentUploadId = null;
	currentUploadKey = null;
	state = 'idle';

	onClear?.();
};

/**
 * Handle click on upload area
 */
const handleAreaClick = () => {
	if ( disabled || isUploading ) return;
	fileInputRef?.click();
};

/**
 * Handle keyboard interaction
 */
const handleKeyDown = ( event : KeyboardEvent ) => {
	if ( event.key === 'Enter' || event.key === ' ' ) {
		event.preventDefault();
		handleAreaClick();
	}
};

// --- Exposed Methods ---

/**
 * Programmatically open the file picker dialog
 */
export const openFilePicker = () => {
	if ( disabled || isUploading ) return;
	fileInputRef?.click();
};

/**
 * Start uploading the selected file
 */
export const startUpload = async () : Promise<SingleFileUploadResult | null> => {
	return uploadFile();
};

/**
 * Cancel ongoing upload
 */
export const cancelUpload = () => {
	if ( abortController ) {
		abortController.abort();
	}
};

/**
 * Clear the selected file and preview
 */
export const clear = () => {
	handleClear();
};

/**
 * Get current upload state
 */
export const getState = () : SingleFileUploadState => {
	return state;
};

/**
 * Get the selected file (if any)
 */
export const getSelectedFile = () : File | null => {
	return selectedFile;
};

/**
 * Set a file programmatically
 */
export const setFile = ( file : File ) => {
	// Validate file type
	if ( !validateFileType( file ) ) {
		const error : SingleFileUploadError = {
			code: 'INVALID_FILE_TYPE',
			message: `File type not allowed. Accepted: ${accept?.join( ', ' ) || 'all'}`,
		};
		uploadError = error;
		state = 'error';
		onError?.( error );
		return;
	}

	// Validate file size
	const maxBytes = maxFileSize * 1024 * 1024;
	if ( file.size > maxBytes ) {
		const error : SingleFileUploadError = {
			code: 'FILE_TOO_LARGE',
			message: `File too large. Maximum: ${maxFileSize}MB`,
		};
		uploadError = error;
		state = 'error';
		onError?.( error );
		return;
	}

	selectedFile = file;
	state = 'selected';
	uploadError = null;

	// Generate preview for images
	if ( showPreview && isImageFile( file ) ) {
		const reader = new FileReader();
		reader.onload = ( e ) => {
			previewUrl = e.target?.result as string;
		};
		reader.readAsDataURL( file );
	}

	onFileSelected?.( file );
};
</script>

<div
	class="single-file-uploader"
	class:disabled
	class:uploading={isUploading}
	class:has-error={uploadError !== null}
	{id}
>
	<!-- Hidden file input -->
	<input
		bind:this={fileInputRef}
		type="file"
		accept={accept?.join( ',' )}
		onchange={handleFileSelect}
		{disabled}
		class="file-input"
	/>

	<!-- Preview/Upload area -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="upload-area"
		style:aspect-ratio={aspectRatio}
		onclick={handleAreaClick}
		onkeydown={handleKeyDown}
		role="button"
		tabindex={disabled ? -1 : 0}
		aria-label={placeholder}
		aria-disabled={disabled}
	>
		{#if displayUrl && showPreview}
			<!-- Image preview -->
			<div class="preview-container">
				<img src={displayUrl} alt="Preview" class="preview-image" />

				{#if isUploading}
					<div class="upload-overlay">
						<div class="progress-container">
							<div class="progress-bar" style:width="{uploadProgress}%"></div>
						</div>
						<span class="progress-text">{uploadProgress}%</span>
					</div>
				{/if}

				{#if !isUploading && !disabled}
					<div class="preview-actions">
						<button
							class="clear-btn"
							onclick={handleClear}
							type="button"
							title="Remove"
							aria-label="Remove file"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
								<path
									fill-rule="evenodd"
									d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Empty state / placeholder -->
			<div class="placeholder">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="placeholder-icon">
					<path
						fill-rule="evenodd"
						d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="placeholder-text">{placeholder}</span>
				{#if selectedFile && !showPreview}
					<span class="file-name">{selectedFile.name}</span>
				{/if}
			</div>
		{/if}
	</div>

	{#if uploadError}
		<div class="error-message">{uploadError.message}</div>
	{/if}
</div>

<style>
.single-file-uploader {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	width: 100%;
}

.file-input {
	display: none;
}

.upload-area {
	position: relative;
	width: 100%;
	border: 2px dashed var(--liwe3-border);
	border-radius: var(--liwe3-radius-md);
	background-color: var(--liwe3-surface);
	cursor: pointer;
	overflow: hidden;
	transition: all 0.2s ease;
	display: flex;
	align-items: center;
	justify-content: center;
}

.upload-area:hover:not(.disabled .upload-area):not(.uploading .upload-area) {
	border-color: var(--liwe3-primary-500);
	background-color: var(--liwe3-primary-50);
}

.upload-area:focus {
	outline: none;
	border-color: var(--liwe3-primary-500);
	box-shadow: 0 0 0 3px oklch(from var(--liwe3-primary) l c h / 0.3);
}

.disabled .upload-area {
	cursor: not-allowed;
	opacity: 0.6;
}

.uploading .upload-area {
	cursor: wait;
}

/* Preview */
.preview-container {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.preview-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.preview-actions {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	opacity: 0;
	transition: opacity 0.2s ease;
}

.upload-area:hover .preview-actions,
.upload-area:focus .preview-actions {
	opacity: 1;
}

.clear-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: none;
	border-radius: 9999px;
	background-color: var(--liwe3-error);
	color: white;
	cursor: pointer;
	transition: all 0.2s ease;
	box-shadow: 0 2px 4px var(--liwe3-shadow-color);
}

.clear-btn:hover {
	background-color: var(--liwe3-error-hover);
	transform: scale(1.1);
}

/* Upload overlay */
.upload-overlay {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	background-color: var(--liwe3-scrim);
}

.progress-container {
	width: 80%;
	height: 8px;
	background-color: color-mix(in oklch, white 30%, transparent);
	border-radius: 4px;
	overflow: hidden;
}

.progress-bar {
	height: 100%;
	background-color: var(--liwe3-primary-500);
	transition: width 0.3s ease;
}

.progress-text {
	color: white;
	font-size: 0.875rem;
	font-weight: 600;
}

/* Placeholder */
.placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 1rem;
	text-align: center;
}

.placeholder-icon {
	width: 2.5rem;
	height: 2.5rem;
	color: var(--liwe3-text-subtle);
}

.placeholder-text {
	font-size: 0.875rem;
	color: var(--liwe3-text-muted);
}

.file-name {
	font-size: 0.75rem;
	color: var(--liwe3-text);
	font-weight: 500;
	max-width: 90%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Error */
.has-error .upload-area {
	border-color: var(--liwe3-error);
}

.error-message {
	font-size: 0.75rem;
	color: var(--liwe3-error);
	padding: 0.25rem 0;
}
</style>
