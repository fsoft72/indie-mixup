/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ApiClientOptions {
	skipError? : boolean;
}

export interface ApiClientConfig {
	baseUrl? : string;
	token? : string;
	onError? : ( error : any, url : string ) => void;
}

type FetcherData = Record<string, any>;

/**
 * Singleton ApiClient class for handling HTTP requests with automatic token management,
 * configurable base URL, and customizable error handling
 */
class ApiClient {
	private _baseURL : string = '';
	private _token? : string;
	private _onError? : ( error : any, url : string ) => void;
	private _refreshPromise : Promise<boolean> | null = null;

	get baseURL() : string {
		return this._baseURL;
	}

	get authToken() : string {
		return this._token || '';
	}

	fullURL = ( path : string ) => {
		if ( path.startsWith( 'http://' ) || path.startsWith( 'https://' ) ) return path;

		return `${this._baseURL}/${path.startsWith( '/' ) ? path.slice( 1 ) : path}`;
	};

	/**
	 * Set the base URL for all API requests
	 * @param baseURL - The base URL to use for API requests
	 */
	setBaseURL = ( baseURL : string ) : void => {
		this._baseURL = baseURL.endsWith( '/' ) ? baseURL.slice( 0, -1 ) : baseURL;
	};

	/**
	 * Set the Bearer token for authentication
	 * @param token - The authentication token
	 */
	setToken = ( token : string ) : void => {
		this._token = token;
	};

	/**
	 * Clear the authentication token
	 */
	clearToken = () : void => {
		this._token = undefined;
	};

	/**
	 * Set the error handler callback
	 * @param onError - Callback function to handle errors
	 */
	setErrorHandler = ( onError : ( error : any, url : string ) => void ) : void => {
		this._onError = onError;
	};

	/**
	 * Clear the error handler
	 */
	clearErrorHandler = () : void => {
		this._onError = undefined;
	};

	/**
	 * Configure multiple settings at once
	 * @param config - Configuration object
	 */
	configure = ( config : ApiClientConfig ) : void => {
		if ( config.baseUrl ) this.setBaseURL( config.baseUrl );
		if ( config.token ) this.setToken( config.token );
		if ( config.onError ) this.setErrorHandler( config.onError );
	};

	/**
	 * Build headers for requests
	 * @param customHeaders - Additional headers to include
	 * @returns Headers object
	 */
	private _buildHeaders = ( customHeaders? : Record<string, string> ) : Record<string, string> => {
		const headers : Record<string, string> = {
			'Content-Type': 'application/json;charset=utf-8',
			...customHeaders,
		};

		if ( this._token ) headers.Authorization = `Bearer ${this._token}`;

		return headers;
	};

	/**
	 * Build the full URL for a request
	 * @param url - The endpoint URL
	 * @returns Full URL
	 */
	private _buildUrl = ( url : string ) : string => {
		if ( url.startsWith( 'http://' ) || url.startsWith( 'https://' ) ) {
			return url;
		}

		const cleanUrl = url.startsWith( '/' ) ? url : `/${url}`;
		return `${this._baseURL}${cleanUrl}`;
	};

	/**
	 * Convert data object to URL search parameters
	 * @param data - Data to convert to query parameters
	 * @returns Query string
	 */
	private _buildQueryParams = ( data : FetcherData | null ) : string => {
		if ( !data ) return '';

		const params : Record<string, string> = {};

		for ( const key in data ) {
			const val = data[key];
			if ( val == null ) continue;

			if ( typeof val === 'object' ) {
				params[key] = JSON.stringify( val );
			} else {
				params[key] = val.toString();
			}
		}

		const searchParams = new URLSearchParams( params ).toString();
		return searchParams ? `?${searchParams}` : '';
	};

	/**
	 * Handle errors consistently
	 * @param url - The URL where the error occurred
	 * @param error - The error object
	 * @param skipError - Whether to skip error handling
	 */
	private _handleError = ( url : string, error : any, skipError : boolean ) : void => {
		if ( !skipError && this._onError ) {
			this._onError( error, url );
		}
	};

	/**
	 * Returns true for the auth endpoints that must never trigger a refresh-and-retry
	 * themselves (a 401 there means the credentials/refresh token are actually invalid)
	 */
	private _isAuthEndpoint = ( url : string ) : boolean => {
		return url === '/api/user/token/refresh' || url === '/api/user/login';
	};

	/**
	 * Runs `doFetch`, and on a 401 response (except for the auth endpoints themselves)
	 * transparently tries to refresh the access token and retries once with the new
	 * token. On refresh failure, redirects to /login and throws.
	 *
	 * @param url - The original endpoint URL (used only to skip refresh on auth endpoints)
	 * @param doFetch - Performs the fetch using the client's current headers; called again on retry so the refreshed token is picked up
	 * @returns The (possibly retried) fetch Response
	 */
	private _fetchWithAuthRetry = async (
		url : string,
		doFetch : () => Promise<Response>,
	) : Promise<Response> => {
		const res = await doFetch();

		if ( res.status !== 401 || this._isAuthEndpoint( url ) ) return res;

		const refreshed = await this._tryRefreshToken();
		if ( refreshed ) return doFetch();

		// Refresh failed, redirect to login
		if ( typeof window !== 'undefined' ) {
			window.location.href = '/login';
		}
		throw new Error( 'Session expired. Please login again.' );
	};

	/**
	 * Perform a GET request
	 * @param url - Endpoint URL
	 * @param data - Query parameters
	 * @param options - Request options
	 * @returns Promise with response data
	 */
	get = async ( url : string, data? : FetcherData | null, options? : ApiClientOptions ) : Promise<any> => {
		const fullUrl = this._buildUrl( url );
		const params = this._buildQueryParams( data || null );
		const skipError = options?.skipError ?? false;

		try {
			const res = await this._fetchWithAuthRetry( url, () =>
				fetch( fullUrl + params, {
					method: 'GET',
					headers: this._buildHeaders(),
				} ) );

			const result = await res.json();

			if ( result.error ) {
				this._handleError( url, result.error, skipError );
			}

			return result;
		} catch ( e ) {
			this._handleError( url, e, skipError );
			return { error: e };
		}
	};

	/**
	 * Perform a GET request expecting a binary response (PDF, image, ...).
	 *
	 * Unlike `get`, this never calls `res.json()` on the body: a successful
	 * response is returned as a Blob in `data`. On a non-OK response the JSON
	 * error envelope is parsed (when present) and returned in `error`.
	 *
	 * @param url - Endpoint URL
	 * @param data - Query parameters
	 * @param options - Request options
	 * @returns Promise resolving to a LiWE-style response with `data` as a Blob
	 */
	getBlob = async ( url : string, data? : FetcherData | null, options? : ApiClientOptions ) : Promise<any> => {
		const fullUrl = this._buildUrl( url );
		const params = this._buildQueryParams( data || null );
		const skipError = options?.skipError ?? false;

		try {
			const res = await this._fetchWithAuthRetry( url, () =>
				fetch( fullUrl + params, {
					method: 'GET',
					headers: this._buildHeaders(),
				} ) );

			if ( !res.ok ) {
				let error : any = { message: `Request failed with status ${res.status}`, code: 'HTTP_ERROR' };
				try {
					const parsed = await res.json();
					if ( parsed?.error ) error = parsed.error;
				} catch {
					// Response body was not JSON, keep the generic error above
				}
				this._handleError( url, error, skipError );
				return { ok: false, status: res.status, error };
			}

			const blob = await res.blob();
			return { ok: true, status: res.status, data: blob };
		} catch ( e ) {
			this._handleError( url, e, skipError );
			return { ok: false, status: 0, error: e };
		}
	};

	/**
	 * Perform a request with body (POST, PATCH, DELETE)
	 * @param method - HTTP method
	 * @param url - Endpoint URL
	 * @param data - Request body data
	 * @param options - Request options
	 * @returns Promise with response data
	 */
	private _requestWithBody = async (
		method : string,
		url : string,
		data : FetcherData,
		options? : ApiClientOptions,
	) : Promise<any> => {
		const fullUrl = this._buildUrl( url );
		const body = JSON.stringify( data );
		const skipError = options?.skipError ?? false;

		try {
			const res = await this._fetchWithAuthRetry( url, () =>
				fetch( fullUrl, {
					method,
					body,
					headers: this._buildHeaders(),
				} ) );

			const result = await res.json();

			if ( result.error ) {
				this._handleError( url, result.error, skipError );
			}

			return result;
		} catch ( e ) {
			this._handleError( url, e, skipError );
			return { error: e };
		}
	};

	/**
	 * Perform a POST request
	 * @param url - Endpoint URL
	 * @param data - Request body data
	 * @param options - Request options
	 * @returns Promise with response data
	 */
	post = async ( url : string, data : FetcherData, options? : ApiClientOptions ) : Promise<any> => {
		return this._requestWithBody( 'POST', url, data, options );
	};

	/**
	 * Perform a PATCH request
	 * @param url - Endpoint URL
	 * @param data - Request body data
	 * @param options - Request options
	 * @returns Promise with response data
	 */
	patch = async ( url : string, data : FetcherData, options? : ApiClientOptions ) : Promise<any> => {
		return this._requestWithBody( 'PATCH', url, data, options );
	};

	/**
	 * Perform a PUT request
	 * @param url - Endpoint URL
	 * @param data - Request body data
	 * @param options - Request options
	 * @returns Promise with response data
	 */
	put = async ( url : string, data : FetcherData, options? : ApiClientOptions ) : Promise<any> => {
		return this._requestWithBody( 'PUT', url, data, options );
	};

	/**
	 * Perform a DELETE request
	 * @param url - Endpoint URL
	 * @param data - Request body data
	 * @param options - Request options
	 * @returns Promise with response data
	 */
	delete = async ( url : string, data : FetcherData, options? : ApiClientOptions ) : Promise<any> => {
		return this._requestWithBody( 'DELETE', url, data, options );
	};

	/**
	 * Try to refresh the access token using the refresh token
	 * @returns Promise<boolean> - True if refresh succeeded, false otherwise
	 */
	private _tryRefreshToken = async () : Promise<boolean> => {
		// If a refresh is already in flight, wait on it instead of starting another
		if ( this._refreshPromise ) return this._refreshPromise;

		this._refreshPromise = this._doRefresh();

		try {
			return await this._refreshPromise;
		} finally {
			this._refreshPromise = null;
		}
	};

	private _doRefresh = async () : Promise<boolean> => {
		try {
			// Get refresh token from localStorage
			if ( typeof window === 'undefined' ) return false;

			const userJson = localStorage.getItem( 'user' );
			if ( !userJson ) return false;

			const user = JSON.parse( userJson );
			if ( !user.refresh_token ) return false;

			// Call refresh endpoint
			const response = await fetch( this.fullURL( '/api/user/token/refresh' ), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify( { refresh_token: user.refresh_token } ),
			} );

			if ( !response.ok ) return false;

			const result = await response.json();
			if ( result.error || !result.data ) return false;

			// Update tokens
			const { token, refresh_token } = result.data;
			this.setToken( token );

			// Update localStorage
			user.token = token;
			user.refresh_token = refresh_token;
			localStorage.setItem( 'user', JSON.stringify( user ) );

			return true;
		} catch {
			// Token refresh failed (network error, malformed response, ...).
			// Callers treat a falsy return as "session could not be renewed".
			return false;
		}
	};
}

// Export singleton instance
export const apiClient = new ApiClient();
