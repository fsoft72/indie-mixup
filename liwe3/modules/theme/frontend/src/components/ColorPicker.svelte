<!-- liwe3/modules/theme/frontend/src/components/ColorPicker.svelte -->
<script lang="ts">
import { fromOklch, isInGamut, toOklch } from '../runtime/color';

interface Props {
	/** Current color value (hex or oklch) */
	value? : string;
	/** Callback when color changes (commits value) */
	onChange? : ( value : string ) => void;
	/** Callback during live preview (on input) */
	onPreview? : ( value : string ) => void;
	/** Label for the picker */
	label? : string;
}

let { value = '#4f46e5', onChange, onPreview, label } : Props = $props();

let l = $state( 0.62 );
let c = $state( 0.14 );
let h = $state( 255 );
let hexInput = $state( '' );

// Parse initial value
$effect( () => {
	try {
		const oklch = toOklch( value );
		const match = oklch.match( /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/ );
		if ( match ) {
			l = parseFloat( match[1] );
			c = parseFloat( match[2] );
			h = parseFloat( match[3] );
			hexInput = fromOklch( oklch );
		}
	} catch {
		// Invalid value, keep current sliders
	}
} );

const oklchValue = $derived( `oklch(${l.toFixed( 3 )} ${c.toFixed( 3 )} ${h.toFixed( 0 )})` );
const inGamut = $derived( isInGamut( oklchValue ) );

function handleSliderChange() {
	onPreview?.( oklchValue );
}

function handleCommit() {
	onChange?.( oklchValue );
}

function handleHexInput( e : Event ) {
	const target = e.target as HTMLInputElement;
	hexInput = target.value;
	try {
		const oklch = toOklch( hexInput );
		const match = oklch.match( /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/ );
		if ( match ) {
			l = parseFloat( match[1] );
			c = parseFloat( match[2] );
			h = parseFloat( match[3] );
			onPreview?.( oklch );
		}
	} catch {
		// Invalid hex, ignore
	}
}

function handleHexCommit() {
	try {
		const oklch = toOklch( hexInput );
		onChange?.( oklch );
	} catch {
		// Invalid hex
	}
}
</script>

<div class="color-picker">
	{#if label}
		<span class="color-picker__label">{label}</span>
	{/if}

	<div class="color-picker__preview" style:background={oklchValue}></div>

	<div class="color-picker__sliders">
		<label>
			Lightness: {l.toFixed( 2 )}
			<input type="range" min="0" max="1" step="0.01" bind:value={l} oninput={handleSliderChange} onchange={handleCommit} />
		</label>
		<label>
			Chroma: {c.toFixed( 3 )}
			<input type="range" min="0" max="0.35" step="0.001" bind:value={c} oninput={handleSliderChange} onchange={handleCommit} />
		</label>
		<label>
			Hue: {h.toFixed( 0 )}
			<input type="range" min="0" max="360" step="1" bind:value={h} oninput={handleSliderChange} onchange={handleCommit} />
		</label>
	</div>

	<div class="color-picker__hex">
		<input
			type="text"
			value={hexInput}
			oninput={handleHexInput}
			onchange={handleHexCommit}
			placeholder="#000000"
			pattern="#[0-9a-fA-F]{6}"
		/>
	</div>

	{#if !inGamut}
		<span class="color-picker__warning">Color is outside sRGB gamut</span>
	{/if}
</div>

<style>
.color-picker {
	display: flex;
	flex-direction: column;
	gap: var(--liwe3-space-3, 12px);
}

.color-picker__label {
	font-size: var(--liwe3-text-sm, 14px);
	font-weight: var(--liwe3-weight-medium, 500);
	color: var(--liwe3-text, inherit);
}

.color-picker__preview {
	width: 100%;
	height: 48px;
	border-radius: var(--liwe3-radius-md, 6px);
	border: 1px solid var(--liwe3-border, #ccc);
}

.color-picker__sliders label {
	display: flex;
	align-items: center;
	gap: var(--liwe3-space-2, 8px);
	font-size: var(--liwe3-text-sm, 14px);
}

.color-picker__sliders input[type="range"] {
	flex: 1;
}

.color-picker__hex input {
	width: 100%;
	padding: var(--liwe3-space-2, 8px);
	border: 1px solid var(--liwe3-border, #ccc);
	border-radius: var(--liwe3-radius-md, 6px);
	font-family: var(--liwe3-font-mono, monospace);
}

.color-picker__warning {
	color: var(--liwe3-warning, #eab308);
	font-size: var(--liwe3-text-xs, 12px);
}
</style>
