/**
 * @fileoverview The config keys that can be overridden at runtime from /sys/config.
 *
 * This list is the only authority on what can be written to the overrides table: the
 * endpoints reject every other key, so a secret (`jwt.secret`, `db.secret`, ...) can
 * never be stored, whatever a client sends. To make a new key editable, add it here.
 */

import { parseTime } from '@backend/liwe3';
import type { AppConfig } from '@backend/liwe3/src/config';

/** The kind of value a key holds: drives validation and the FormCreator field type */
export type SystemConfigFieldType = 'text' | 'number' | 'duration' | 'email' | 'url' | 'boolean';

/** One editable config key */
export type SystemConfigField = {
	/** Dotted path in the config (e.g. `jwt.expiresIn`) */
	key : string;
	/** Label of the group the field is shown in */
	group : string;
	/** Label of the field */
	label : string;
	type : SystemConfigFieldType;
	/** Minimum value, for `number` */
	min? : number;
	/** For `text`: an empty value is valid (it switches the feature the text controls off) */
	allowEmpty? : boolean;
};

/** A field in the shape `FormCreator` consumes (a subset of its `FormField` type) */
export type SystemConfigFormField = {
	name : string;
	type : string;
	label : string;
	default? : unknown;
	extra? : Record<string, unknown>;
};

/** A group of fields, as returned by the config endpoints */
export type SystemConfigGroupData = {
	id : string;
	label : string;
	fields : SystemConfigFormField[];
};

/** Result of `systemConfigValidate` */
export type SystemConfigValidation =
	| { ok : true; values : Record<string, unknown> }
	| { ok : false; error : string };

/** The editable keys, in the order they are shown */
export const SYSTEM_CONFIG_FIELDS : SystemConfigField[] = [
	{ key: 'jwt.expiresIn', group: 'Sessions', label: 'Session duration (e.g. 3h, 30m, 7d)', type: 'duration' },
	{ key: 'jwt.refreshTokenDuration', group: 'Sessions', label: 'Refresh token duration (e.g. 6h, 7d)', type: 'duration' },
	{ key: 'site.name', group: 'Site', label: 'Site name', type: 'text' },
	{ key: 'user.passwordMaxAgeDays', group: 'Users', label: 'Password max age in days (0 = never expires)', type: 'number', min: 0 },
	{ key: 'user.allowRegistration', group: 'Users', label: 'Allow user registration', type: 'boolean' },
	{ key: 'user.createDomain', group: 'Users', label: 'User create domain', type: 'boolean' },
	{ key: 'user.registrationAuthCode', group: 'Users', label: 'Registration auth code (empty = no code asked)', type: 'text', allowEmpty: true },
	{ key: 'ses.region', group: 'Email', label: 'AWS SES region', type: 'text' },
	{ key: 'ses.fromName', group: 'Email', label: 'Sender name', type: 'text' },
	{ key: 'ses.fromEmail', group: 'Email', label: 'Sender email', type: 'email' },
	{ key: 'ses.verificationUrl', group: 'Email', label: 'Email verification base URL', type: 'url' },
];

/** A session shorter than this would lock everybody out */
const MIN_DURATION_SECONDS = 60;

/** A text duration always carries its unit (d, h, m, s) */
const DURATION_WITH_UNIT = /^\d+(\.\d+)?\s*[dhms]$/i;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and normalizes one value against the type of its field.
 *
 * @param field - The editable field the value is for
 * @param value - The value sent by the client (form values may be strings)
 * @returns The normalized value, or an error message
 */
const _fieldValue = ( field : SystemConfigField, value : unknown ) : { value : unknown } | { error : string } => {
	const bad = ( why : string ) => ( { error: `${field.key}: ${why}` } );

	switch ( field.type ) {
		case 'number': {
			const num = typeof value === 'string' && value.trim() !== '' ? Number( value ) : value;
			if ( typeof num !== 'number' || !Number.isFinite( num ) ) return bad( 'must be a number' );
			if ( field.min !== undefined && num < field.min ) return bad( `must be at least ${field.min}` );
			return { value: num };
		}

		case 'duration': {
			const msg = 'must be a duration between 1 minute and 30 days, with a unit like 30m, 3h or 7d';
			if ( typeof value !== 'string' && typeof value !== 'number' ) return bad( msg );
			// A bare number typed in the form would silently mean seconds: ask for the unit
			if ( typeof value === 'string' && !DURATION_WITH_UNIT.test( value.trim() ) ) return bad( msg );

			// parseTime falls back to the given default for anything it cannot read or out of its bounds
			if ( parseTime( value, -1 ) < MIN_DURATION_SECONDS ) return bad( msg );
			return { value };
		}

		case 'boolean': {
			if ( typeof value === 'boolean' ) return { value };
			if ( value === 'true' || value === 'false' ) return { value: value === 'true' };
			return bad( 'must be true or false' );
		}

		case 'email':
		case 'url':
		case 'text': {
			if ( typeof value !== 'string' ) return bad( 'must be a text' );
			if ( value.trim() === '' && field.allowEmpty ) return { value: '' };
			if ( value.trim() === '' ) return bad( 'must be a non empty text' );

			const text = value.trim();
			if ( field.type === 'email' && !EMAIL_PATTERN.test( text ) ) return bad( 'must be an email address' );
			if ( field.type === 'url' && !_isHttpUrl( text ) ) return bad( 'must be an http or https URL' );

			return { value: text };
		}
	}
};

/** True when the text is an absolute http(s) URL */
const _isHttpUrl = ( text : string ) : boolean => {
	try {
		const url = new URL( text );
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
};

/**
 * Validates the values sent to the "set" endpoint. All or nothing: a key that is not in
 * `SYSTEM_CONFIG_FIELDS`, or a value of the wrong type, rejects the whole payload.
 *
 * @param values - Object with dotted config keys as keys
 * @returns The normalized values (numbers converted from form strings), or the first error
 */
export const systemConfigValidate = ( values : Record<string, unknown> ) : SystemConfigValidation => {
	if ( values === null || typeof values !== 'object' || Array.isArray( values ) ) return { ok: false, error: 'values must be an object' };

	const clean : Record<string, unknown> = {};

	for ( const [ key, raw ] of Object.entries( values ) ) {
		const field = SYSTEM_CONFIG_FIELDS.find( ( f ) => f.key === key );
		if ( !field ) return { ok: false, error: `${key}: this key cannot be changed` };

		const res = _fieldValue( field, raw );
		if ( 'error' in res ) return { ok: false, error: res.error };

		clean[key] = res.value;
	}

	return { ok: true, values: clean };
};

/** True when the key is one of the editable ones */
export const systemConfigIsEditable = ( key : string ) : boolean => SYSTEM_CONFIG_FIELDS.some( ( f ) => f.key === key );

/** Reads a dotted path from the config */
const _read = ( cfg : AppConfig, path : string ) : unknown =>
	path.split( '.' ).reduce<any>( ( node, part ) => ( node === null || node === undefined ? undefined : node[part] ), cfg );

/** Formats seconds with the largest exact unit (3600 -> `1h`), the way the user types a duration */
const _formatDuration = ( seconds : number ) : string => {
	if ( seconds % 86400 === 0 ) return `${seconds / 86400}d`;
	if ( seconds % 3600 === 0 ) return `${seconds / 3600}h`;
	if ( seconds % 60 === 0 ) return `${seconds / 60}m`;
	return `${seconds}s`;
};

/** Maps an editable field to the FormCreator field type registered by the app */
const _formType = ( type : SystemConfigFieldType ) : string => {
	if ( type === 'duration' || type === 'url' ) return 'text';
	if ( type === 'boolean' ) return 'checkbox';
	return type;
};

/**
 * Builds the groups of FormCreator fields for the config page.
 *
 * @param effective - The current effective config (`app.cfg`): each field's default is its current value
 * @returns The groups, in the order of `SYSTEM_CONFIG_FIELDS`
 */
export const systemConfigGroups = ( effective : AppConfig ) : SystemConfigGroupData[] => {
	const groups : SystemConfigGroupData[] = [];

	for ( const field of SYSTEM_CONFIG_FIELDS ) {
		let group = groups.find( ( g ) => g.label === field.group );
		if ( !group ) {
			group = { id: field.group.toLowerCase(), label: field.group, fields: [] };
			groups.push( group );
		}

		const form : SystemConfigFormField = {
			name: field.key,
			type: _formType( field.type ),
			label: field.label,
			default: _read( effective, field.key ),
		};
		// A flag or a text that is not configured yet is shown as off / empty, never as undefined
		if ( form.default === undefined && field.type === 'boolean' ) form.default = false;
		if ( form.default === undefined && field.allowEmpty ) form.default = '';
		if ( field.type === 'duration' && typeof form.default === 'number' ) form.default = _formatDuration( form.default );

		group.fields.push( form );
	}

	return groups;
};
