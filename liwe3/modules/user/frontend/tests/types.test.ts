import { describe, expect, it } from 'vitest';
import { ZUser, ZUser2FARequired, ZUser2FASetup, ZUserRole } from '../src/types';

describe('ZUserRole (frontend)', () => {
	it('accepts a valid role', () => {
		const result = ZUserRole.safeParse( { id: 'urol_1', domain: 'acme', name: 'editor', perms: [ 'content.edit' ] } );

		expect( result.success ).toBe( true );
	});
});

describe('ZUser id_role field (frontend)', () => {
	it('accepts an optional id_role', () => {
		const result = ZUser.safeParse( { username: 'jdoe', id_role: 'urol_123' } );

		expect( result.success ).toBe( true );
	});
});

describe('ZUser2FASetup (frontend)', () => {
	it('accepts a secret and otpauth_url', () => {
		const result = ZUser2FASetup.safeParse( { secret: 'GEZDGNBVGY3TQOJQ', otpauth_url: 'otpauth://totp/LiWE3:jdoe' } );

		expect( result.success ).toBe( true );
	});
});

describe('ZUser2FARequired (frontend)', () => {
	it('accepts requires_2fa + pending_token', () => {
		const result = ZUser2FARequired.safeParse( { requires_2fa: true, pending_token: 'abc.def.ghi' } );

		expect( result.success ).toBe( true );
	});

	it('rejects requires_2fa: false', () => {
		const result = ZUser2FARequired.safeParse( { requires_2fa: false, pending_token: 'abc.def.ghi' } );

		expect( result.success ).toBe( false );
	});
});
