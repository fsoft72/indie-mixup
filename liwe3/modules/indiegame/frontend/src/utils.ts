import { apiClient } from '@frontend/liwe3';

/** Keeps only the strings of a value that should be a list of urls */
export const asUrls = ( value : unknown ) : string[] => Array.isArray( value ) ? value.filter( ( v ) : v is string => typeof v === 'string' ) : [];

/** Public url of an image: absolute urls stay as they are, paths of the API get the server base url */
export const imageUrl = ( url : string ) : string => /^https?:\/\//i.test( url ) ? url : `${apiClient.baseURL}${url}`;

/** Path that serves an uploaded file (public endpoint of the upload module) */
export const uploadPath = ( key : string ) : string => `/api/upload/get?key=${encodeURIComponent( key )}`;

/** Embed url of a YouTube video, or null when the link is not a YouTube one */
export const youtubeEmbed = ( url : string ) : string | null => {
	const match = url.match( /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/ );

	return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

/** Short readable date */
export const formatDate = ( value : Date | string ) : string => new Date( value ).toLocaleDateString( 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' } );
