/**
 * Configuration management system with template variable resolution
 *
 * Loads JSON configuration files and resolves template variables in the format {{VARIABLE_NAME}}
 * from environment variables or Cloudflare Workers environment.
 */

import { parseTime } from './date';
import { logger } from './logger';

/**
 * Application configuration type definitions
 */

export interface JWTConfig {
	/** JWT secret key for signing tokens (resolved from {{JWT_SECRET}}) */
	secret : string;
	/**
	 * Refresh token expiry duration in seconds.
	 * Also accepts string formats: "7d" (days), "24h" (hours), "30m" (minutes), "3600s" (seconds).
	 * Defaults to 21600 seconds (6 hours).
	 * Maximum: 604800 seconds (7 days).
	 */
	refreshTokenDuration : number;
	/**
	 * Token and session expiry duration in seconds.
	 * Also accepts string formats: "7d" (days), "24h" (hours), "30m" (minutes), "3600s" (seconds).
	 * Defaults to 10800 seconds (3 hours) if invalid or missing.
	 * Maximum: 2592000 seconds (30 days).
	 */
	expiresIn : number;
}

export interface SiteConfig {
	/** Site name */
	name : string;

	/** Secret key for operations (resolved from {{SITE_SECRET}}) */
	secret : string;

	/** Debug key for accessing debug endpoints (resolved from {{DEBUG_KEY}}) */
	debugKey : string;

	/** Secret admin key (resolved from {{ADMIN_KEY}}) */
	adminKey : string;
}

export interface SystemAdminConfig {
	/** username */
	username? : string;

	/** password */
	password? : string;

	/** domain */
	domain? : string;
}

export interface SESConfig {
	/** AWS SES access key */
	access_key : string;

	/** AWS SES secret key */
	secret_key : string;

	/** AWS SES region (e.g., us-east-1, eu-west-1) */
	region : string;

	/** From email address for outgoing emails */
	fromEmail : string;

	/** From name for outgoing emails */
	fromName : string;

	/** Base URL for email verification links (e.g., https://app.example.com) */
	verificationUrl : string;
}

export interface LogConfig {
	/** Minimum log level to output (debug, info, warn, error, fatal) */
	level? : 'debug' | 'info' | 'warn' | 'error' | 'fatal';

	/** Whether to include stack traces in error logs */
	includeStack? : boolean;

	/** Whether to use pretty-printed output (for development) */
	prettyPrint? : boolean;
}

export interface DBConfig {
	/** Secret key for encrypting/obfuscating data at rest (resolved from {{DB_SECRET}}) */
	secret : string;
}

export interface UserConfig {
	/**
	 * Maximum age of a password, in days. Once a password is older than this the
	 * user must choose a new one at the next login.
	 * `0` (or missing) disables the automatic expiry.
	 */
	passwordMaxAgeDays? : number;
	/** When true, anybody can sign up with `POST /user/register`. Default: false */
	allowRegistration? : boolean;
	/** When true, a registration creates a new domain owned by the new user; otherwise the user joins the system domain. Default: false */
	createDomain? : boolean;
	/** Code the registering user has to know. Empty or missing: no code is asked */
	registrationAuthCode? : string;
}

export interface AppConfig {
	/** Configuration for JWT handling */
	jwt : JWTConfig;

	/** Configuration for the user module */
	user? : UserConfig;

	/** Configuration for site settings */
	site : SiteConfig;

	/** Default admin user */
	system : SystemAdminConfig;

	/** AWS SES email configuration */
	ses : SESConfig;

	/** Logger configuration */
	log? : LogConfig;

	/** Database configuration */
	db? : DBConfig;

	/** Add more module configurations as needed */
	[key : string] : any;
}

export interface ConfigTemplateOptions {
	/** Environment object containing variables (e.g., env from Cloudflare Workers) */
	env? : Record<string, any>;
	/**
	 * Kept for backward compatibility. A missing `{{VAR}}` never throws any more:
	 * it falls back to the literal string `"VAR"` and is reported in
	 * `ConfigLoadResult.missingVariables` (with a `logger.warn`). This avoids a
	 * single missing `.dev.vars` / secret taking the whole Worker down.
	 */
	strict? : boolean;
	/** Default values for template variables */
	defaults? : Record<string, string>;
}

export interface ConfigLoadResult<T = any> {
	/** The resolved configuration object */
	config : T;
	/** List of template variables that were resolved */
	resolvedVariables : string[];
	/** List of template variables that could not be resolved */
	missingVariables : string[];
}

/**
 * Template variable pattern: {{VARIABLE_NAME}}
 */
const TEMPLATE_PATTERN = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;

/**
 * Converts string values to appropriate types (boolean, number, or keeps as string)
 *
 * @param value - The value to convert (can be any type)
 * @returns The value converted to the appropriate type
 */
const convertStringToType = ( value : any ) : any => {
	// If it's not a string, return as-is
	if ( typeof value !== 'string' ) {
		return value;
	}

	// Convert boolean strings
	if ( value.toLowerCase() === 'true' ) return true;
	if ( value.toLowerCase() === 'false' ) return false;

	// Convert number strings (integers and floats)
	if ( /^-?\d+$/.test( value ) ) {
		return parseInt( value, 10 );
	}
	if ( /^-?\d*\.\d+$/.test( value ) ) {
		return parseFloat( value );
	}

	// Return as string if no conversion applies
	return value;
};

/**
 * Resolves template variables in a string value
 *
 * @param value - String that may contain template variables
 * @param options - Resolution options
 * @returns Object with resolved value and metadata
 */
const resolveTemplateString = (
	value : string,
	options : ConfigTemplateOptions = {},
) : {
	resolved : any;
	foundVariables : string[];
	missingVariables : string[];
} => {
	const { env = {}, defaults = {} } = options;
	const foundVariables : string[] = [];
	const missingVariables : string[] = [];

	// Check if the entire string is a single template variable
	const singleTemplateMatch = value.match( /^{{([A-Z_][A-Z0-9_]*)}}$/ );

	if ( singleTemplateMatch ) {
		const variableName = singleTemplateMatch[1];
		const envValue = env[variableName];
		const defaultValue = defaults[variableName];

		if ( envValue !== undefined ) {
			foundVariables.push( variableName );
			// Convert string values to appropriate types
			const typedValue = convertStringToType( envValue );
			return { resolved: typedValue, foundVariables, missingVariables };
		}

		if ( defaultValue !== undefined ) {
			foundVariables.push( variableName );
			// Convert default value to appropriate type
			const typedValue = convertStringToType( defaultValue );
			return { resolved: typedValue, foundVariables, missingVariables };
		}

		// Missing: fall back to the variable name itself (never throw). The caller
		// turns `missingVariables` into a warning.
		missingVariables.push( variableName );
		return { resolved: variableName, foundVariables, missingVariables };
	}

	// Handle multiple template variables in the same string (convert to string)
	const resolved = value.replace( TEMPLATE_PATTERN, ( _match, variableName ) => {
		// Check environment first, then defaults
		const envValue = env[variableName];
		const defaultValue = defaults[variableName];

		if ( envValue !== undefined ) {
			foundVariables.push( variableName );
			return String( envValue );
		}

		if ( defaultValue !== undefined ) {
			foundVariables.push( variableName );
			return defaultValue;
		}

		// Missing: substitute the variable name itself (never throw).
		missingVariables.push( variableName );
		return variableName;
	} );

	return { resolved, foundVariables, missingVariables };
};

/**
 * Recursively processes an object to resolve template variables
 *
 * @param obj - Object that may contain template variables in string values
 * @param options - Resolution options
 * @returns Object with resolved configuration and metadata
 */
const resolveTemplateObject = (
	obj : any,
	options : ConfigTemplateOptions = {},
) : {
	resolved : any;
	foundVariables : string[];
	missingVariables : string[];
} => {
	const allFoundVariables : string[] = [];
	const allMissingVariables : string[] = [];

	const resolveValue = ( value : any ) : any => {
		if ( typeof value === 'string' ) {
			const result = resolveTemplateString( value, options );
			allFoundVariables.push( ...result.foundVariables );
			allMissingVariables.push( ...result.missingVariables );
			return result.resolved;
		}

		if ( Array.isArray( value ) ) return value.map( resolveValue );

		if ( value !== null && typeof value === 'object' ) {
			const resolved : any = {};
			for ( const [ key, val ] of Object.entries( value ) ) {
				resolved[key] = resolveValue( val );
			}
			return resolved;
		}

		return value;
	};

	const resolved = resolveValue( obj );

	return {
		resolved,
		foundVariables: [ ...new Set( allFoundVariables ) ],
		missingVariables: [ ...new Set( allMissingVariables ) ],
	};
};

/** Path segments that would reach the object prototype: overrides containing them are ignored */
const UNSAFE_PATH_PARTS = [ '__proto__', 'constructor', 'prototype' ];

/**
 * Normalizes the JWT durations of a config in place: both become numbers of seconds,
 * and `refreshTokenDuration` is never shorter than `expiresIn`.
 *
 * @param cfg - Resolved configuration (a missing `jwt` section is left alone)
 */
const _configNormalizeJwt = ( cfg : any ) : void => {
	if ( !cfg || !cfg.jwt ) return;

	cfg.jwt.expiresIn = parseTime( cfg.jwt.expiresIn );
	cfg.jwt.refreshTokenDuration = parseTime( cfg.jwt.refreshTokenDuration );

	// if refreshTokenDuration is less than expiresIn, adjust it
	if ( cfg.jwt.refreshTokenDuration < cfg.jwt.expiresIn ) {
		cfg.jwt.refreshTokenDuration = cfg.jwt.expiresIn + 3600; // add 1 hour buffer
	}
};

/**
 * Loads and processes a configuration object with template variable resolution
 *
 * @param configData - Raw configuration object (parsed from JSON)
 * @param options - Template resolution options
 * @returns Configuration load result with resolved config and metadata
 */
export const configLoad = <T = any>(
	configData : any,
	options : ConfigTemplateOptions = {},
) : ConfigLoadResult<T> => {
	if ( !configData || typeof configData !== 'object' ) {
		throw new Error( 'Configuration data must be a valid object' );
	}

	const result = resolveTemplateObject( configData, options );

	// A missing {{VAR}} is not fatal: it was replaced with the literal "VAR".
	// Warn once per variable so the operator notices the gap (e.g. a key not set
	// in .dev.vars, or a wrangler secret not provisioned).
	for ( const variable of result.missingVariables ) {
		logger.warn( `Config variable {{${variable}}} not set - using "${variable}" as a placeholder value`, {
			module: 'core',
			method: 'configLoad',
			variable,
		} );
	}

	_configNormalizeJwt( result.resolved );

	return {
		config: result.resolved as T,
		resolvedVariables: result.foundVariables,
		missingVariables: result.missingVariables,
	};
};

/**
 * Layers overrides on top of an already resolved configuration.
 *
 * Keys are dotted paths (`jwt.expiresIn`); a missing parent object is created.
 * The base is never mutated, and the JWT normalization of `configLoad` runs again
 * on the result, so an override like `"7d"` works the same as in `config.json`.
 *
 * @param base - Resolved configuration (the output of `configLoad`)
 * @param overrides - Dotted path to value
 * @returns A new configuration with the overrides applied
 */
export const configApplyOverrides = <T extends AppConfig = AppConfig>(
	base : T,
	overrides : Record<string, unknown>,
) : T => {
	const cfg : any = structuredClone( base );

	for ( const [ path, value ] of Object.entries( overrides ) ) {
		const parts = path.split( '.' );
		if ( parts.some( ( part ) => UNSAFE_PATH_PARTS.includes( part ) ) ) continue;

		const last = parts.pop() as string;
		let node = cfg;

		for ( const part of parts ) {
			if ( node[part] === null || typeof node[part] !== 'object' ) node[part] = {};
			node = node[part];
		}

		node[last] = value;
	}

	_configNormalizeJwt( cfg );

	return cfg as T;
};

/**
 * Loads configuration from a JSON string with template variable resolution
 *
 * @param jsonString - JSON string containing configuration
 * @param options - Template resolution options
 * @returns Configuration load result with resolved config and metadata
 */
export const configLoadFromJSON = <T = any>(
	jsonString : string,
	options : ConfigTemplateOptions = {},
) : ConfigLoadResult<T> => {
	try {
		const configData = JSON.parse( jsonString );
		return configLoad<T>( configData, options );
	} catch ( error ) {
		throw new Error( `Failed to parse configuration JSON: ${error instanceof Error ? error.message : 'Unknown error'}` );
	}
};

/**
 * Validates that all required template variables are available
 *
 * @param configData - Configuration object to validate
 * @param env - Environment variables
 * @param defaults - Default values
 * @returns Array of missing variables (empty if all resolved)
 */
export const templateValidation = (
	configData : any,
	env : Record<string, any> = {},
	defaults : Record<string, string> = {},
) : string[] => {
	const result = resolveTemplateObject( configData, {
		env,
		defaults,
		strict: false,
	} );

	return result.missingVariables;
};

/**
 * Extracts all template variables from a configuration object
 *
 * @param configData - Configuration object to analyze
 * @returns Array of all template variable names found
 */
export const templateExtractVars = ( configData : any ) : string[] => {
	const variables : string[] = [];

	const extractFromValue = ( value : any ) : void => {
		if ( typeof value === 'string' ) {
			const matches = value.matchAll( TEMPLATE_PATTERN );
			for ( const match of matches ) {
				variables.push( match[1] );
			}
		} else if ( Array.isArray( value ) ) {
			value.forEach( extractFromValue );
		} else if ( value !== null && typeof value === 'object' ) {
			Object.values( value ).forEach( extractFromValue );
		}
	};

	extractFromValue( configData );
	return [ ...new Set( variables ) ];
};

/**
 * Type helper for defining configuration schemas
 */
export type ConfigSchema<T> = T;

/**
 * Helper function to create typed configuration loaders
 *
 * @param schema - TypeScript type for the configuration (compile-time only)
 * @returns Function to load configuration with the specified type
 */
export const createConfigLoader = <T>() => {
	return {
		loadConfig: ( configData : any, options? : ConfigTemplateOptions ) : ConfigLoadResult<T> => {
			return configLoad<T>( configData, options );
		},
		loadConfigFromJSON: ( jsonString : string, options? : ConfigTemplateOptions ) : ConfigLoadResult<T> => {
			return configLoadFromJSON<T>( jsonString, options );
		},
	};
};
