import { browser } from '$app/environment';
import type { ThemeName } from '../tokens/themes';
import { getSystemContrast, getSystemVariant, loadTheme, saveTheme } from './persist';
import type { Density, Variant } from './persist';

type Unsubscribe = () => void;

function createThemeStore() {
	const stored = loadTheme();

	let _variant = $state<Variant>( stored?.variant || 'system' );
	let _density = $state<Density>( stored?.density || 'comfortable' );
	let _brand = $state<string | null>( stored?.brand || null );
	let _previewSeeds = $state<Record<string, string> | null>( null );
	let _initialized = $state( false );

	// Resolve system preference
	let _resolvedVariant = $derived<ThemeName>(
		_variant === 'system'
			? ( getSystemContrast() === 'high-contrast' ? 'high-contrast' : getSystemVariant() )
			: _variant,
	);

	// Media query listeners for system preference changes
	let _mediaUnsubscribes : Unsubscribe[] = [];

	function _setupMediaListeners() {
		_teardownMediaListeners();
		if ( _variant !== 'system' ) return;

		const darkQuery = matchMedia( '(prefers-color-scheme: dark)' );
		const contrastQuery = matchMedia( '(prefers-contrast: more)' );

		const handler = () => {
			// Trigger re-evaluation by toggling state
			_variant = 'system';
		};

		darkQuery.addEventListener( 'change', handler );
		contrastQuery.addEventListener( 'change', handler );
		_mediaUnsubscribes = [
			() => darkQuery.removeEventListener( 'change', handler ),
			() => contrastQuery.removeEventListener( 'change', handler ),
		];
	}

	function _teardownMediaListeners() {
		_mediaUnsubscribes.forEach( ( fn ) => fn() );
		_mediaUnsubscribes = [];
	}

	function _applyToDom() {
		if ( !browser ) return;
		const el = document.documentElement;
		el.setAttribute( 'data-theme', _resolvedVariant );
		if ( _density !== 'comfortable' ) {
			el.setAttribute( 'data-density', _density );
		} else {
			el.removeAttribute( 'data-density' );
		}
		if ( _brand ) {
			el.setAttribute( 'data-brand', _brand );
		} else {
			el.removeAttribute( 'data-brand' );
		}
	}

	// Initialize effects - must be called from a component context
	function init() {
		if ( _initialized || !browser ) return;
		_initialized = true;

		$effect.root( () => {
			// Apply attributes to DOM
			$effect( () => {
				_applyToDom();
			} );

			// Listen for system preference changes
			$effect( () => {
				_setupMediaListeners();
				return _teardownMediaListeners;
			} );

			// Persist changes
			$effect( () => {
				saveTheme( { variant: _variant, density: _density, brand: _brand || undefined } );
			} );
		} );

		// Apply immediately
		_applyToDom();
	}

	return {
		get variant() {
			return _variant;
		},
		get resolvedVariant() {
			return _resolvedVariant;
		},
		get brand() {
			return _brand;
		},
		get density() {
			return _density;
		},
		get previewSeeds() {
			return _previewSeeds;
		},
		get initialized() {
			return _initialized;
		},

		init,

		setVariant ( v : Variant ) {
			_variant = v;
			if ( browser ) _applyToDom();
		},

		setDensity ( d : Density ) {
			_density = d;
			if ( browser ) _applyToDom();
		},

		setBrand ( b : string | null ) {
			_brand = b;
			if ( browser ) _applyToDom();
		},

		preview ( seeds : Record<string, string> ) {
			_previewSeeds = seeds;
			if ( !browser ) return;
			for ( const [ name, value ] of Object.entries( seeds ) ) {
				document.documentElement.style.setProperty( `--liwe3-seed-${name}`, value );
			}
		},

		clearPreview () {
			const seeds = _previewSeeds;
			_previewSeeds = null;
			if ( !browser || !seeds ) return;
			// Remove inline overrides - CSS defaults take over
			const el = document.documentElement;
			for ( const name of Object.keys( seeds ) ) {
				el.style.removeProperty( `--liwe3-seed-${name}` );
			}
		},
	};
}

export const themeStore = createThemeStore();
