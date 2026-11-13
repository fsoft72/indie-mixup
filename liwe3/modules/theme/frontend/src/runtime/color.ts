/**
 * Centralized color utility for the LiWE3 theme system.
 * All color math lives here - no conversion scattered in components.
 */

interface OklchValues {
	l : number;
	c : number;
	h : number;
}

/**
 * Parse an OKLCH string into its components.
 */
function parseOklch( value : string ) : OklchValues {
	const match = value.match( /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/ );
	if ( !match ) throw new Error( `Invalid OKLCH value: ${value}` );
	return { l: parseFloat( match[1] ), c: parseFloat( match[2] ), h: parseFloat( match[3] ) };
}

/**
 * Parse hex color to RGB values (0-255).
 */
function hexToRgb( hex : string ) : { r : number; g : number; b : number } {
	const h = hex.replace( '#', '' );
	const full = h.length === 3
		? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
		: h;
	return {
		r: parseInt( full.substring( 0, 2 ), 16 ),
		g: parseInt( full.substring( 2, 4 ), 16 ),
		b: parseInt( full.substring( 4, 6 ), 16 ),
	};
}

/**
 * Convert linear sRGB component to sRGB.
 */
function linearToSrgb( c : number ) : number {
	return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow( c, 1 / 2.4 ) - 0.055;
}

/**
 * Convert sRGB component to linear.
 */
function srgbToLinear( c : number ) : number {
	c /= 255;
	return c <= 0.04045 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );
}

/**
 * Convert RGB to Oklch.
 */
function rgbToOklch( r : number, g : number, b : number ) : OklchValues {
	const lr = srgbToLinear( r );
	const lg = srgbToLinear( g );
	const lb = srgbToLinear( b );

	// Linear sRGB to LMS
	const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
	const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
	const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

	// LMS to Oklab
	const l_ = Math.cbrt( l );
	const m_ = Math.cbrt( m );
	const s_ = Math.cbrt( s );

	const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
	const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
	const bv = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

	// Oklab to Oklch
	const C = Math.sqrt( a * a + bv * bv );
	let H = Math.atan2( bv, a ) * ( 180 / Math.PI );
	if ( H < 0 ) H += 360;

	return { l: L, c: C, h: H };
}

/**
 * Convert Oklch to linear sRGB (for gamut checking and hex conversion).
 */
function oklchToLinearRgb( oklch : OklchValues ) : { r : number; g : number; b : number } {
	const { l, c, h } = oklch;
	const hRad = h * ( Math.PI / 180 );
	const a = c * Math.cos( hRad );
	const bv = c * Math.sin( hRad );

	// Oklab to LMS
	const l_ = l + 0.3963377774 * a + 0.2158037573 * bv;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * bv;
	const s_ = l - 0.0894841775 * a - 1.2914855480 * bv;

	const l3 = l_ * l_ * l_;
	const m3 = m_ * m_ * m_;
	const s3 = s_ * s_ * s_;

	// LMS to linear sRGB
	const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
	const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
	const b = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

	return { r, g, b };
}

/**
 * Convert any supported color format to OKLCH string.
 * Accepts: hex (#rgb, #rrggbb), rgb(r,g,b), oklch(l c h)
 */
export function toOklch( value : string ) : string {
	if ( value.startsWith( 'oklch' ) ) return value;

	if ( value.startsWith( '#' ) ) {
		const { r, g, b } = hexToRgb( value );
		const oklch = rgbToOklch( r, g, b );
		return `oklch(${oklch.l.toFixed( 3 )} ${oklch.c.toFixed( 3 )} ${oklch.h.toFixed( 0 )})`;
	}

	const rgbMatch = value.match( /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/ );
	if ( rgbMatch ) {
		const oklch = rgbToOklch( +rgbMatch[1], +rgbMatch[2], +rgbMatch[3] );
		return `oklch(${oklch.l.toFixed( 3 )} ${oklch.c.toFixed( 3 )} ${oklch.h.toFixed( 0 )})`;
	}

	throw new Error( `Unsupported color format: ${value}` );
}

/**
 * Convert OKLCH string to hex.
 */
export function fromOklch( value : string ) : string {
	const oklch = parseOklch( value );
	const { r, g, b } = oklchToLinearRgb( oklch );

	const sr = Math.round( linearToSrgb( Math.max( 0, Math.min( 1, r ) ) ) * 255 );
	const sg = Math.round( linearToSrgb( Math.max( 0, Math.min( 1, g ) ) ) * 255 );
	const sb = Math.round( linearToSrgb( Math.max( 0, Math.min( 1, b ) ) ) * 255 );

	return `#${sr.toString( 16 ).padStart( 2, '0' )}${sg.toString( 16 ).padStart( 2, '0' )}${sb.toString( 16 ).padStart( 2, '0' )}`;
}

/**
 * Calculate relative luminance from OKLCH lightness.
 * Approximation: luminance ≈ l^2.2 (good enough for contrast checks)
 */
function relativeLuminance( oklch : OklchValues ) : number {
	return Math.pow( oklch.l, 2.2 );
}

/**
 * Calculate WCAG contrast ratio between two colors.
 * Returns a value between 1 (same) and 21 (black/white).
 */
export function contrastRatio( color1 : string, color2 : string ) : number {
	const c1 = parseOklch( toOklch( color1 ) );
	const c2 = parseOklch( toOklch( color2 ) );

	const l1 = relativeLuminance( c1 );
	const l2 = relativeLuminance( c2 );

	const lighter = Math.max( l1, l2 );
	const darker = Math.min( l1, l2 );

	return ( lighter + 0.05 ) / ( darker + 0.05 );
}

/**
 * Check if an OKLCH color is within the sRGB gamut.
 */
export function isInGamut( value : string ) : boolean {
	const oklch = parseOklch( value );
	const { r, g, b } = oklchToLinearRgb( oklch );

	const e = 0.001;
	return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e;
}
