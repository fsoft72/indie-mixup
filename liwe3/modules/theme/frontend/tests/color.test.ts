import { describe, expect, it } from 'vitest';
import { contrastRatio, fromOklch, isInGamut, toOklch } from '../src/runtime/color';

describe('color utilities', () => {
	describe('toOklch', () => {
		it('converts hex to oklch', () => {
			const result = toOklch( '#ff0000' );
			expect( result ).toMatch( /^oklch\([\d.]+ [\d.]+ [\d.]+\)$/ );
		});

		it('passes through oklch values', () => {
			const input = 'oklch(0.628 0.225 29)';
			expect( toOklch( input ) ).toBe( input );
		});

		it('converts rgb to oklch', () => {
			const result = toOklch( 'rgb(255, 0, 0)' );
			expect( result ).toMatch( /^oklch\(/ );
		});
	});

	describe('fromOklch', () => {
		it('converts oklch to hex', () => {
			const result = fromOklch( 'oklch(0.628 0.225 29)' );
			expect( result ).toMatch( /^#[0-9a-f]{6}$/i );
		});
	});

	describe('contrastRatio', () => {
		it('returns 21 for black on white', () => {
			const ratio = contrastRatio( 'oklch(0 0 0)', 'oklch(1 0 0)' );
			expect( ratio ).toBeCloseTo( 21, 0 );
		});

		it('returns 1 for same color', () => {
			const ratio = contrastRatio( 'oklch(0.5 0.1 200)', 'oklch(0.5 0.1 200)' );
			expect( ratio ).toBeCloseTo( 1, 0 );
		});
	});

	describe('isInGamut', () => {
		it('returns true for sRGB colors', () => {
			expect( isInGamut( 'oklch(0.5 0.05 200)' ) ).toBe( true );
		});

		it('returns false for out-of-gamut colors', () => {
			expect( isInGamut( 'oklch(0.5 0.5 200)' ) ).toBe( false );
		});
	});
});
