import { describe, expect, it, vi } from 'vitest';
import { configApplyOverrides, configLoad, configLoadFromJSON } from '../src/config';

describe('configLoad - template resolution', () => {
	it('resolves a single-template value from env, with type coercion', () => {
		const r = configLoad( { a: '{{A_STR}}', b: '{{A_NUM}}', c: '{{A_BOOL}}' }, {
			env: { A_STR: 'hello', A_NUM: '42', A_BOOL: 'true' },
		} );

		expect( r.config ).toEqual( { a: 'hello', b: 42, c: true } );
		expect( r.missingVariables ).toEqual( [] );
	});

	it('falls back to the variable name when a var is missing (never throws)', () => {
		const warn = vi.spyOn( console, 'warn' ).mockImplementation( () => {} );

		const r = configLoad( { site: { secret: '{{SITE_SECRET}}' } }, { env: {} } );

		expect( r.config.site.secret ).toBe( 'SITE_SECRET' );
		expect( r.missingVariables ).toEqual( [ 'SITE_SECRET' ] );

		warn.mockRestore();
	});

	it('substitutes the name for a missing var embedded in a larger string', () => {
		const r = configLoad( { url: 'https://{{HOST}}/api' }, { env: {} } );

		expect( r.config.url ).toBe( 'https://HOST/api' );
		expect( r.missingVariables ).toEqual( [ 'HOST' ] );
	});

	it('prefers env over defaults, and defaults over the fallback', () => {
		const r = configLoad( { x: '{{X}}', y: '{{Y}}', z: '{{Z}}' }, {
			env: { X: 'from-env' },
			defaults: { Y: 'from-default' },
		} );

		expect( r.config ).toEqual( { x: 'from-env', y: 'from-default', z: 'Z' } );
		expect( r.missingVariables ).toEqual( [ 'Z' ] );
	});

	it('reports each missing variable once even when used several times', () => {
		const r = configLoad( { a: '{{DUP}}', b: '{{DUP}}', c: 'x-{{DUP}}' }, { env: {} } );

		expect( r.missingVariables ).toEqual( [ 'DUP' ] );
	});
});

describe('configLoadFromJSON', () => {
	it('still throws on genuinely malformed JSON', () => {
		expect( () => configLoadFromJSON( '{ not json' ) ).toThrow( /Failed to parse configuration JSON/ );
	});

	it('does not throw when a secret is missing', () => {
		expect( () => configLoadFromJSON( JSON.stringify( { db: { secret: '{{DB_SECRET}}' } } ), { env: {} } ) ).not.toThrow();
	});
});

describe('configApplyOverrides', () => {
	const BASE : any = {
		jwt: { secret: 's', expiresIn: 3600, refreshTokenDuration: 21600 },
		site: { name: 'My App', secret: 'x' },
		log: { level: 'info', includeStack: true },
	};

	it('overrides a nested key and leaves the rest untouched', () => {
		const r = configApplyOverrides( BASE, { 'site.name': 'Fatto' } );

		expect( r.site.name ).toBe( 'Fatto' );
		expect( r.site.secret ).toBe( 'x' );
		expect( r.log ).toEqual( BASE.log );
	});

	it('creates the missing parent object for a key absent from the base', () => {
		const r = configApplyOverrides( BASE, { 'user.passwordMaxAgeDays': 90 } );

		expect( r.user ).toEqual( { passwordMaxAgeDays: 90 } );
	});

	it('never mutates the base config', () => {
		const copy = structuredClone( BASE );

		configApplyOverrides( BASE, { 'site.name': 'Fatto', 'user.passwordMaxAgeDays': 1 } );

		expect( BASE ).toEqual( copy );
	});

	it('returns an equal config when there are no overrides', () => {
		expect( configApplyOverrides( BASE, {} ) ).toEqual( BASE );
	});

	it('keeps booleans and numbers typed', () => {
		const r = configApplyOverrides( BASE, { 'log.includeStack': false, 'user.passwordMaxAgeDays': 30 } );

		expect( r.log.includeStack ).toBe( false );
		expect( r.user.passwordMaxAgeDays ).toBe( 30 );
	});

	it('normalizes an overridden jwt.expiresIn like configLoad does', () => {
		const r = configApplyOverrides( BASE, { 'jwt.expiresIn': '7d' } );

		expect( r.jwt.expiresIn ).toBe( 604800 );
		// refreshTokenDuration (21600) is now below expiresIn: bumped by one hour
		expect( r.jwt.refreshTokenDuration ).toBe( 604800 + 3600 );
	});

	it('ignores keys that would reach the object prototype', () => {
		configApplyOverrides( BASE, { '__proto__.polluted': true, 'constructor.prototype.polluted': true } );

		expect( ( {} as any ).polluted ).toBeUndefined();
	});
});
