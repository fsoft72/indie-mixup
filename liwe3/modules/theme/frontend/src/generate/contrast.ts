import { contrastRatio } from '../runtime/color';

/**
 * `info`  - the pair is resolved at runtime (the text-on-* auto-contrast tokens),
 *           so a low ratio here is not necessarily what the user will see.
 * `error` - a semantic background that carries --liwe3-text verbatim. A low ratio
 *           is a real defect and must fail the build.
 */
export type ContrastSeverity = 'info' | 'error';

export interface ContrastWarning {
	token : string;
	background : string;
	ratio : number;
	minimum : number;
	severity : ContrastSeverity;
}

/**
 * Check contrast ratio and return warning if below WCAG AA (4.5:1 for normal text).
 */
export function checkContrast(
	textToken : string,
	textColor : string,
	bgToken : string,
	bgColor : string,
	minimum = 4.5,
	severity : ContrastSeverity = 'error',
) : ContrastWarning | null {
	const ratio = contrastRatio( textColor, bgColor );
	if ( ratio < minimum ) {
		return { token: `${textToken} on ${bgToken}`, background: bgColor, ratio, minimum, severity };
	}
	return null;
}
