import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import QRCode from '../QRCode.svelte';

describe('QRCode', () => {
	it('renders nothing when value is empty', () => {
		const { container } = render( QRCode, { props: { value: '' } } );

		expect( container.querySelector( 'img' ) ).toBeNull();
	});

	it('renders an image once the QR code is generated', async () => {
		const { container, findByRole } = render( QRCode, { props: { value: 'hello world' } } );

		const img = await findByRole( 'img' );
		expect( img ).toBeInTheDocument();
		expect( img ).toHaveAttribute( 'alt', 'QR code' );
		expect( container.querySelector( '.liwe3-qrcode' ) ).toContainElement( img as HTMLElement );
	});

	it('sets the image width and height from the size prop', async () => {
		const { findByRole } = render( QRCode, { props: { value: 'sized', size: 256 } } );

		const img = await findByRole( 'img' );
		expect( img ).toHaveAttribute( 'width', '256' );
		expect( img ).toHaveAttribute( 'height', '256' );
	});

	it('applies the cssClass prop to the wrapper', () => {
		const { container } = render( QRCode, { props: { value: 'styled', cssClass: 'custom-qr' } } );

		expect( container.querySelector( '.liwe3-qrcode' ) ).toHaveClass( 'custom-qr' );
	});

	it('calls onerror when QR code generation fails', async () => {
		const onerror = vi.fn();
		// An extremely long value exceeds the QR code capacity and triggers an error from the qrcode library.
		const longValue = 'x'.repeat( 5000 );

		render( QRCode, { props: { value: longValue, onerror } } );

		await vi.waitFor( () => {
			expect( onerror ).toHaveBeenCalled();
		} );
	});
});
