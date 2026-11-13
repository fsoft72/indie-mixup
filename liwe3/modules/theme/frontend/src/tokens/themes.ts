import { SEED_COLORS } from './colors';
import type { SeedColorName } from './colors';

export type ThemeName = 'light' | 'dark' | 'high-contrast';
export type ThemeVariant = Record<SeedColorName, string>;

export interface ThemeDefinition {
	name : ThemeName;
	extends? : ThemeName;
	seeds : Partial<ThemeVariant>;
}

export const THEMES : Record<ThemeName, ThemeDefinition> = {
	light: {
		name: 'light',
		seeds: SEED_COLORS.light,
	},
	dark: {
		name: 'dark',
		seeds: SEED_COLORS.dark,
	},
	'high-contrast': {
		name: 'high-contrast',
		seeds: SEED_COLORS['high-contrast'],
	},
};
