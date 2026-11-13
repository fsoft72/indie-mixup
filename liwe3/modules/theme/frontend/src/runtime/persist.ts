import { browser } from '$app/environment';
import { PUBLIC_PROJECT_KEY } from '$env/static/public';
import type { ThemeName } from '../tokens/themes';

export type Density = 'comfortable' | 'compact';
export type Variant = ThemeName | 'system';

interface PersistedTheme {
	variant : Variant;
	density : Density;
	brand? : string;
}

const LS_KEY = `${PUBLIC_PROJECT_KEY || 'liwe3'}-theme`;

export function loadTheme() : PersistedTheme | null {
	if ( !browser ) return null;
	try {
		const raw = localStorage.getItem( LS_KEY );
		return raw ? JSON.parse( raw ) : null;
	} catch {
		return null;
	}
}

export function saveTheme( data : PersistedTheme ) : void {
	if ( !browser ) return;
	try {
		localStorage.setItem( LS_KEY, JSON.stringify( data ) );
	} catch {
		// localStorage full or unavailable
	}
}

export function getSystemVariant() : 'light' | 'dark' {
	if ( !browser ) return 'light';
	return matchMedia( '(prefers-color-scheme: dark)' ).matches ? 'dark' : 'light';
}

export function getSystemContrast() : 'normal' | 'high-contrast' {
	if ( !browser ) return 'normal';
	return matchMedia( '(prefers-contrast: more)' ).matches ? 'high-contrast' : 'normal';
}
