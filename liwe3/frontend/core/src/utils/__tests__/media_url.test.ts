import { beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../ApiClient';
import { media_url } from '../utils';

describe('media_url', () => {
	beforeEach( () => {
		apiClient.setBaseURL( 'https://example.com' );
	} );

	it('returns an empty string without an id', () => {
		expect( media_url( '' ) ).toBe( '' );
	});

	it('builds the url of a media file', () => {
		expect( media_url( 'abc.png' ) ).toBe( 'https://example.com/static/public/uploads/png/abc.png' );
	});

	it('builds the url of a thumbnail', () => {
		expect( media_url( 'abc.png', '', true ) ).toBe(
			'https://example.com/static/public/uploads/png/thumbs/abc.png.jpg',
		);
	});

	it('uses the given filename when one is passed', () => {
		expect( media_url( 'abc.png', 'photo.png' ) ).toBe(
			'https://example.com/static/public/uploads/png/photo.png',
		);
	});
});
