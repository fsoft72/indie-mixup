/**
 * DataGrid inline editing helpers.
 *
 * Pure value transformations shared by the cell editor and by the grid when it
 * commits an edit. No DOM, no Svelte runes.
 */

import { filterValidChars } from '../../utils/utils';
import type { DataGridField } from './datagrid_types';

/**
 * Applies the field text constraints (`options.validChars`, `options.lower`).
 *
 * @param value - the raw text
 * @param field - the field being edited
 * @returns the sanitized text
 */
export const sanitizeText = ( value : string, field : DataGridField ) : string => {
	let res = value;

	if ( field.options?.lower ) res = res.toLowerCase();
	if ( field.options?.validChars ) res = filterValidChars( res, field.options.validChars );

	return res;
};

/**
 * Clamps a number to the field `options.min` / `options.max` range.
 *
 * @param value - the number to clamp
 * @param field - the field being edited
 * @returns the clamped number, or null when the value is not a number
 */
export const clampNumeric = ( value : number, field : DataGridField ) : number | null => {
	if ( isNaN( value ) ) return null;

	let res = value;

	if ( field.options?.min !== undefined ) res = Math.max( field.options.min, res );
	if ( field.options?.max !== undefined ) res = Math.min( field.options.max, res );

	return res;
};

/**
 * Splices a text into a string, replacing the given selection.
 *
 * @param current - the current text
 * @param inserted - the text to insert
 * @param start - selection start
 * @param end - selection end
 * @returns the resulting text
 */
export const spliceText = (
	current : string,
	inserted : string,
	start : number,
	end : number,
) : string => current.slice( 0, start ) + inserted + current.slice( end );
