/**
 * DataGrid client side filtering.
 *
 * Pure functions, no DOM and no Svelte runes: the DataGrid uses them inside a
 * `$derived` to build the visible rows, and the filter row uses them to build
 * the filter object it sends back up.
 */

import { filterModes } from '../../utils/match_filter';
import type { DataGridField, DataGridRow } from './datagrid_types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A single active filter, keyed in the filters object by (bare) field name. */
export interface DataGridFilter {
	mode : filterModes;
	value : any;
	type? : string;
}

export type DataGridFilters = Record<string, DataGridFilter>;

/**
 * Tells if a single value satisfies one filter.
 *
 * Filter modes not listed here do not filter anything out (same as before the
 * extraction: the original `switch` had no `default` branch).
 *
 * @param value - the row value to test
 * @param filter - the filter to apply
 * @returns true if the value passes the filter
 */
const _matchOne = ( value : any, filter : DataGridFilter ) : boolean => {
	switch ( filter.mode ) {
		case filterModes.EQUAL:
		case 'exact' as filterModes:
			return `${value}`.toLowerCase() === `${filter.value}`.toLowerCase();

		case filterModes.CONTAINS:
			return `${value}`.toLowerCase().indexOf( `${filter.value}`.toLowerCase() ) != -1;

		case filterModes.LESS_THAN_OR_EQUAL:
			if ( filter.type == 'date' ) return new Date( value ) <= new Date( filter.value );
			if ( filter.type == 'number' ) return parseFloat( value ) <= parseFloat( filter.value );
			return value <= filter.value;

		case filterModes.GREATER_THAN_OR_EQUAL:
			if ( filter.type == 'date' ) return new Date( value ) >= new Date( filter.value );
			if ( filter.type == 'number' ) return parseFloat( value ) >= parseFloat( filter.value );
			return value >= filter.value;

		case filterModes.BETWEEN: {
			const [ start, end ] = `${filter.value}`.split( '|' );

			if ( filter.type == 'date' ) {
				return new Date( value ) >= new Date( start ) && new Date( value ) <= new Date( end );
			}
			if ( filter.type == 'number' ) {
				return parseFloat( value ) >= parseFloat( start ) && parseFloat( value ) <= parseFloat( end );
			}
			return value >= start && value <= end;
		}
	}

	return true;
};

/**
 * Tells if a row satisfies every active filter.
 *
 * NOTE: a row with a falsy value on a filtered field is excluded unless a custom
 * field filter function returns a valid non-empty value.
 *
 * @param row - the row to test
 * @param filters - the active filters, keyed by field name
 * @param fields - the field definitions or a Map of field name to DataGridField
 * @returns true if the row passes all filters
 */
export const rowMatchesFilters = (
	row : DataGridRow,
	filters : DataGridFilters,
	fields? : Map<string, DataGridField> | DataGridField[] | null,
) : boolean => {
	const fieldsMap = fields instanceof Map
		? fields
		: fields
		? new Map( fields.map( ( f ) => [ f.name, f ] ) )
		: null;

	for ( const field in filters ) {
		const fieldDef = fieldsMap?.get( field );
		let val = row[field];

		if ( fieldDef?.filter ) {
			val = fieldDef.filter( val, row );
		}

		if ( val === undefined || val === null || val === '' ) return false;
		if ( !_matchOne( val, filters[field] ) ) return false;
	}

	return true;
};

/**
 * Filters a list of rows.
 *
 * @param data - the rows to filter
 * @param filters - the active filters, keyed by field name
 * @param fields - field definitions to support custom field filter functions
 * @returns the rows passing all filters (the same array instance when there is nothing to filter)
 */
export const applyFilters = (
	data : DataGridRow[],
	filters? : DataGridFilters,
	fields? : DataGridField[],
) : DataGridRow[] => {
	if ( !filters || Object.keys( filters ).length == 0 ) return data;

	const fieldsMap = fields ? new Map( fields.map( ( f ) => [ f.name, f ] ) ) : null;

	return data.filter( ( row ) => rowMatchesFilters( row, filters, fieldsMap ) );
};

/**
 * Builds a new filters object with one filter added or replaced.
 *
 * Filters with an empty value are dropped, so setting a filter to `''` removes it.
 *
 * @param filters - the current filters
 * @param name - field name the filter applies to
 * @param filter - the filter to set for that field
 * @returns a new filters object (the input is never mutated)
 */
export const buildFilters = (
	filters : DataGridFilters,
	name : string,
	filter : DataGridFilter,
) : DataGridFilters => {
	const res : DataGridFilters = { ...filters, [name]: filter };

	// drop the filters that have an empty value
	for ( const key in res ) {
		if ( !res[key].value ) delete res[key];
	}

	return res;
};

/**
 * Builds a new filters object with one filter removed.
 *
 * @param filters - the current filters
 * @param name - field name to remove
 * @returns a new filters object (the input is never mutated)
 */
export const removeFilter = ( filters : DataGridFilters, name : string ) : DataGridFilters => {
	const res = { ...filters };
	delete res[name];

	return res;
};
