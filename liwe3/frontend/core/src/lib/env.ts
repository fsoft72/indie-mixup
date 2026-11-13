import { browser } from '$app/environment';

/**
 * Environment detection and configuration utility
 * Automatically switches between dev and production API endpoints
 */
export class Environment {
	private static _instance : Environment | null = null;
	private _isDev : boolean = false;
	private _apiBaseUrl : string = '';

	private constructor () {
		this._detectEnvironment();
	}

	/**
	 * Get the singleton instance
	 */
	static getInstance () : Environment {
		if ( !Environment._instance ) {
			Environment._instance = new Environment();
		}
		return Environment._instance;
	}

	/**
	 * Detect if we're running in development mode
	 */
	private _detectEnvironment () : void {
		if ( !browser ) {
			// Server-side: assume production
			this._isDev = false;
			this._apiBaseUrl = '';
			return;
		}

		// Client-side detection
		const hostname = window.location.hostname;
		const port = window.location.port;

		// Consider it dev if:
		// - Running on localhost
		// - Running on 127.0.0.1
		// - Has a development port (common dev ports)
		this._isDev = hostname === 'localhost'
			|| hostname === '127.0.0.1'
			|| [ '3000', '5000', '5173', '8080', '8787' ].includes( port );

		// Set API base URL
		if ( this._isDev ) {
			this._apiBaseUrl = 'http://localhost:8787';
		} else {
			// In production, use the same domain as the current page
			this._apiBaseUrl = '';
		}
	}

	/**
	 * Check if running in development mode
	 */
	get isDevelopment() : boolean {
		return this._isDev;
	}

	/**
	 * Check if running in production mode
	 */
	get isProduction() : boolean {
		return !this._isDev;
	}

	/**
	 * Get the API base URL for the current environment
	 */
	get apiBaseUrl() : string {
		return this._apiBaseUrl;
	}

	/**
	 * Build a full API URL by combining base URL with path
	 */
	buildApiUrl ( path : string ) : string {
		// Ensure path starts with /
		if ( !path.startsWith( '/' ) ) {
			path = `/${path}`;
		}

		// Remove leading / from path if base URL is empty (production)
		if ( this._apiBaseUrl === '' && path.startsWith( '/' ) ) {
			return path;
		}

		return `${this._apiBaseUrl}${path}`;
	}

	/**
	 * Force override the environment detection (useful for testing)
	 */
	setEnvironment ( isDev : boolean, apiBaseUrl? : string ) : void {
		this._isDev = isDev;
		this._apiBaseUrl = apiBaseUrl ?? ( isDev ? 'http://localhost:8787' : '' );
	}
}

// Export a convenience function for getting the environment instance
export const env = () => Environment.getInstance();

// Export convenience functions
export const isDevelopment = () => Environment.getInstance().isDevelopment;
export const isProduction = () => Environment.getInstance().isProduction;
export const getApiBaseUrl = () => Environment.getInstance().apiBaseUrl;
export const buildApiUrl = ( path : string ) => Environment.getInstance().buildApiUrl( path );
