<script lang="ts">
import QRCodeLib from 'qrcode';

interface Props {
	value : string;
	size? : number;
	cssClass? : string;
	onerror? : ( message : string ) => void;
}

let { value, size = 192, cssClass = '', onerror } : Props = $props();

let dataUrl = $state( '' );
let errorMessage = $state( '' );

$effect( () => {
	if ( !value ) {
		dataUrl = '';
		return;
	}

	QRCodeLib.toDataURL( value, { width: size, margin: 1 } )
		.then( ( url : string ) => {
			dataUrl = url;
			errorMessage = '';
		} )
		.catch( ( err : Error ) => {
			errorMessage = err?.message || 'Failed to generate QR code';
			dataUrl = '';
			if ( onerror ) onerror( errorMessage );
		} );
} );
</script>

<div class="liwe3-qrcode {cssClass}">
	{#if dataUrl}
		<img src={dataUrl} alt="QR code" width={size} height={size} />
	{:else if errorMessage && !onerror}
		<p class="liwe3-qrcode__error">{errorMessage}</p>
	{/if}
</div>

<style>
.liwe3-qrcode {
	display: flex;
	justify-content: center;
	align-items: center;
}

.liwe3-qrcode img {
	display: block;
	border-radius: var(--liwe3-radius-sm);
}

.liwe3-qrcode__error {
	color: var(--liwe3-error);
	font-size: var(--liwe3-text-sm);
	margin: 0;
}
</style>
