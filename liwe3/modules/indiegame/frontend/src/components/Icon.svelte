<script module lang="ts">
export type IconName = 'eye' | 'download' | 'remix' | 'flag' | 'github' | 'trophy' | 'plus' | 'arrow-right' | 'search' | 'external' | 'user' | 'gamepad' | 'volume' | 'volume-off';
</script>

<script lang="ts">
interface Props {
	name : IconName;
	size? : number;
	/** Text alternative; leave it out when the icon sits next to a visible text (it is then hidden from screen readers) */
	label? : string;
}

let { name, size = 18, label } : Props = $props();

const filled = $derived( name === 'github' );
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={filled ? 'currentColor' : 'none'}
	stroke={filled ? 'none' : 'currentColor'}
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	{#if name === 'eye'}
		<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
	{:else if name === 'download'}
		<path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
	{:else if name === 'remix'}
		<circle cx="6" cy="5" r="2.2" /><circle cx="18" cy="5" r="2.2" /><circle
			cx="12"
			cy="19"
			r="2.2"
		/><path d="M6 7.2v1.3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7.2" /><path d="M12 11.5v5.3" />
	{:else if name === 'flag'}
		<path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" />
	{:else if name === 'trophy'}
		<path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" />
	{:else if name === 'plus'}
		<path d="M12 5v14" /><path d="M5 12h14" />
	{:else if name === 'arrow-right'}
		<path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
	{:else if name === 'search'}
		<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
	{:else if name === 'external'}
		<path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
	{:else if name === 'user'}
		<circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
	{:else if name === 'gamepad'}
		<rect x="2" y="7" width="20" height="11" rx="4" /><path d="M7 10v5" /><path d="M4.5 12.5h5" /><circle cx="16" cy="11.5" r="1" /><circle cx="18.5" cy="14" r="1" />
	{:else if name === 'volume'}
		<path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
	{:else if name === 'volume-off'}
		<path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m22 9-6 6" /><path d="m16 9 6 6" />
	{:else if name === 'github'}
		<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.921.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
	{/if}
</svg>

<style>
svg {
	flex: none;
	vertical-align: -0.2em;
}
</style>
