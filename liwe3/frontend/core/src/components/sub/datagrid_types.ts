/**
 * DataGrid shared types.
 *
 * Single source of truth for every `DataGrid*` interface: the DataGrid
 * component and all its sub components import from here.
 * `DataGrid.svelte` re-exports them for backward compatibility.
 */

import type { IconSource } from 'svelte-hero-icons';
import type { Color, Variant } from '../../types/types';
import type { filterModes } from '../../utils/match_filter';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface DataGridFieldExtra {
	options? : { label : string; value : string }[];
	dateFormat? : string;
}

export interface DataGridField {
	name : string;
	type : string;
	label? : string;
	sortable? : boolean;
	filterable? : boolean;
	searchMode? : filterModes;
	editable? : boolean;
	deletable? : boolean;
	hidden? : boolean;
	align? : string;
	width? : string;
	nowrap? : boolean;
	pre? : string;
	extra? : DataGridFieldExtra;
	options? : {
		filterSelect? : { value : string; label : string }[];
		filterSelectShowSelect? : boolean; // Show a select option in the filter
		select? : { value : string; label : string }[];
		validChars? : string;
		lower? : boolean;
		min? : number;
		max? : number;
	};

	filter? : ( value : any, row : any ) => any;

	render? : ( value : any, row : any ) => any;

	onclick? : ( row : any ) => void;
}

export interface DataGridRow {
	id : string;
	[key : string] : any;
}

export interface DataGridAction {
	id? : string;
	label? : string;
	icon? : IconSource;
	mode? : Color;
	variant? : Variant;
	// `hide` can be a static boolean or a per-row predicate: when it is a
	// function the DataGrid calls it with the row and hides the action when it
	// returns a truthy value.
	hide? : boolean | (( row : DataGridRow ) => boolean);

	onclick? : ( row : DataGridRow ) => void;
}

export interface DataGridButton {
	id? : string;
	label? : string;
	icon? : IconSource;
	mode? : Color;
	variant? : Variant;
	onclick : ( checked? : boolean ) => void;
	type? : 'button' | 'checkbox'; // New property
	checked? : boolean; // New property for checkbox state
	hidden? : boolean; // Hide the button
}
