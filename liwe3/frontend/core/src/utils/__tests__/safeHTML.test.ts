import { describe, expect, it } from 'vitest';
import { safeHTML } from '../utils';

/**
 * safeHTML() must sanitize ATTRIBUTES, not just visible text: an allowlisted tag
 * can still carry `onerror=`, a `javascript:` href, or a scheme obfuscated with
 * embedded control chars. It also must keep sanitizing content that was promoted
 * out of an unwrapped non-allowlisted parent.
 */
describe('safeHTML', () => {
	it('keeps allowlisted prose markup untouched', () => {
		expect( safeHTML( 'hello <b>world</b>' ) ).toBe( 'hello <b>world</b>' );
	});

	it('drops <script>/<style> elements and their raw source', () => {
		expect( safeHTML( '<script>alert(1)</script>hi' ) ).toBe( 'hi' );
		expect( safeHTML( '<style>*{x:y}</style>ok' ) ).toBe( 'ok' );
	});

	it('strips on* event-handler attributes from allowlisted tags', () => {
		const out = safeHTML( '<img src="/ok.png" onerror="alert(1)">' );
		expect( out ).toContain( 'src="/ok.png"' );
		expect( out.toLowerCase() ).not.toContain( 'onerror' );
		expect( out.toLowerCase() ).not.toContain( 'alert' );
	});

	it('removes javascript: and data: URLs from href/src', () => {
		expect( safeHTML( '<a href="javascript:alert(1)">x</a>' ).toLowerCase() ).not.toContain( 'javascript:' );
		expect( safeHTML( '<a href="javascript:alert(1)">x</a>' ).toLowerCase() ).not.toContain( 'href' );
		expect( safeHTML( '<img src="data:text/html,<b>x">' ).toLowerCase() ).not.toContain( 'data:' );
	});

	it('rejects a scheme obfuscated with embedded tab/newline/NUL', () => {
		for ( const sep of [ '\t', '\n', '\r', '\0', ' ' ] ) {
			const out = safeHTML( `<a href="java${sep}script:alert(1)">x</a>` ).toLowerCase();
			expect( out ).not.toContain( 'script:' );
			expect( out ).not.toContain( 'href' );
		}
	});

	it('rejects protocol-relative //host URLs', () => {
		const out = safeHTML( '<a href="//evil.example/x">x</a>' ).toLowerCase();
		expect( out ).not.toContain( 'href' );
		expect( out ).not.toContain( 'evil.example' );
	});

	it('re-sanitizes content promoted out of an unwrapped parent', () => {
		const out = safeHTML( '<foo><img src=x onerror=alert(1)></foo>' ).toLowerCase();
		expect( out ).not.toContain( 'onerror' );
		expect( out ).not.toContain( 'alert' );
	});

	it('re-sanitizes deeply nested promoted content', () => {
		const out = safeHTML(
			'<unknown><span><bad><img src=x onerror=alert(1)></bad></span></unknown>',
		).toLowerCase();
		expect( out ).toContain( '<span>' );
		expect( out ).not.toContain( 'onerror' );
	});

	it('drops <script> nested inside a non-allowlisted (svg) wrapper', () => {
		expect( safeHTML( '<svg><script>alert(1)</script></svg>' ).toLowerCase() ).not.toContain( 'alert(1)' );
	});

	it('lets the serializer escape a quote-breakout attempt in an attribute value', () => {
		const out = safeHTML( '<img src="/a.png" alt="&quot; onerror=&quot;alert(1)">' );
		expect( out ).toContain( 'alt=' );
		// the literal quote is entity-escaped, so no real onerror attribute is produced
		expect( out ).not.toMatch( /onerror\s*=\s*"?alert/i );
	});

	it('keeps a safe absolute link and forces rel=noopener', () => {
		const out = safeHTML( '<a href="https://ok.example/x">x</a>' );
		expect( out ).toContain( 'href="https://ok.example/x"' );
		expect( out ).toContain( 'rel="noopener noreferrer"' );
	});

	it('keeps scheme-less relative and anchor URLs', () => {
		expect( safeHTML( '<a href="/page">x</a>' ) ).toContain( 'href="/page"' );
		expect( safeHTML( '<a href="#top">x</a>' ) ).toContain( 'href="#top"' );
	});

	it('removes comment nodes', () => {
		expect( safeHTML( 'a<!-- secret -->b' ) ).toBe( 'ab' );
	});

	it('returns an empty string for nullish input', () => {
		expect( safeHTML( '' ) ).toBe( '' );
		expect( safeHTML( null ) ).toBe( '' );
		expect( safeHTML( undefined ) ).toBe( '' );
	});
});
