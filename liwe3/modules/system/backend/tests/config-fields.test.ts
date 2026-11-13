import { describe, expect, it } from 'vitest';
import { SYSTEM_CONFIG_FIELDS, systemConfigGroups, systemConfigValidate } from '../src/config-fields';

describe('SYSTEM_CONFIG_FIELDS', () => {
	it('lists exactly the agreed keys', () => {
		expect( SYSTEM_CONFIG_FIELDS.map( ( f ) => f.key ) ).toEqual( [
			'jwt.expiresIn',
			'jwt.refreshTokenDuration',
			'site.name',
			'user.passwordMaxAgeDays',
			'user.allowRegistration',
			'user.createDomain',
			'user.registrationAuthCode',
			'ses.region',
			'ses.fromName',
			'ses.fromEmail',
			'ses.verificationUrl',
		] );
	});

	it('never lists a secret', () => {
		const secrets = SYSTEM_CONFIG_FIELDS.filter( ( f ) => /secret|key$|access|debug|admin/i.test( f.key ) );

		expect( secrets ).toEqual( [] );
	});
});

describe('systemConfigValidate', () => {
	it('rejects a key that is not in the list, even a secret one', () => {
		const r = systemConfigValidate( { 'jwt.secret': 'x' } );

		expect( r.ok ).toBe( false );
	});

	it('is all or nothing: one bad key rejects the valid ones too', () => {
		const r = systemConfigValidate( { 'site.name': 'Fatto', 'jwt.secret': 'x' } );

		expect( r ).toMatchObject( { ok: false } );
	});

	it('rejects a non numeric value for a number field and a negative one below min', () => {
		expect( systemConfigValidate( { 'user.passwordMaxAgeDays': 'abc' } ).ok ).toBe( false );
		expect( systemConfigValidate( { 'user.passwordMaxAgeDays': -1 } ).ok ).toBe( false );
	});

	it('converts a numeric string coming from a form', () => {
		const r = systemConfigValidate( { 'user.passwordMaxAgeDays': '90' } );

		expect( r ).toEqual( { ok: true, values: { 'user.passwordMaxAgeDays': 90 } } );
	});

	it('accepts booleans, also as the strings a form may send, and rejects anything else', () => {
		expect( systemConfigValidate( { 'user.allowRegistration': true } ) ).toEqual( { ok: true, values: { 'user.allowRegistration': true } } );
		expect( systemConfigValidate( { 'user.createDomain': 'false' } ) ).toEqual( { ok: true, values: { 'user.createDomain': false } } );
		expect( systemConfigValidate( { 'user.allowRegistration': 'yes' } ).ok ).toBe( false );
		expect( systemConfigValidate( { 'user.allowRegistration': 1 } ).ok ).toBe( false );
	});

	it('lets the registration auth code be emptied, but no other text', () => {
		expect( systemConfigValidate( { 'user.registrationAuthCode': '' } ) ).toEqual( { ok: true, values: { 'user.registrationAuthCode': '' } } );
		expect( systemConfigValidate( { 'user.registrationAuthCode': ' abc ' } ) ).toEqual( { ok: true, values: { 'user.registrationAuthCode': 'abc' } } );
		expect( systemConfigValidate( { 'user.registrationAuthCode': 5 } ).ok ).toBe( false );
		expect( systemConfigValidate( { 'site.name': '' } ).ok ).toBe( false );
	});

	it('does not let the log settings be changed', () => {
		expect( systemConfigValidate( { 'log.level': 'debug' } ).ok ).toBe( false );
		expect( systemConfigValidate( { 'log.includeStack': true } ).ok ).toBe( false );
	});

	it('accepts the duration formats parseTime understands and rejects the others', () => {
		expect( systemConfigValidate( { 'jwt.expiresIn': '7d' } ).ok ).toBe( true );
		expect( systemConfigValidate( { 'jwt.expiresIn': 3600 } ).ok ).toBe( true );
		expect( systemConfigValidate( { 'jwt.expiresIn': 'soon' } ).ok ).toBe( false );
		expect( systemConfigValidate( { 'jwt.expiresIn': '90d' } ).ok ).toBe( false );
	});

	it('requires a unit on a duration given as text, and at least one minute', () => {
		expect( systemConfigValidate( { 'jwt.expiresIn': '7' } ).ok ).toBe( false );
		expect( systemConfigValidate( { 'jwt.expiresIn': '30s' } ).ok ).toBe( false );
		expect( systemConfigValidate( { 'jwt.expiresIn': '1m' } ).ok ).toBe( true );
		expect( systemConfigValidate( { 'jwt.expiresIn': 30 } ).ok ).toBe( false );
	});

	it('rejects an empty name, a malformed email and a non http url', () => {
		expect( systemConfigValidate( { 'site.name': '  ' } ).ok ).toBe( false );
		expect( systemConfigValidate( { 'ses.fromEmail': 'nope' } ).ok ).toBe( false );
		expect( systemConfigValidate( { 'ses.verificationUrl': 'javascript:alert(1)' } ).ok ).toBe( false );
		expect( systemConfigValidate( { 'ses.verificationUrl': 'https://app.example.com' } ).ok ).toBe( true );
	});

	it('rejects a payload that is not an object', () => {
		expect( systemConfigValidate( null as any ).ok ).toBe( false );
		expect( systemConfigValidate( [] as any ).ok ).toBe( false );
	});
});

describe('systemConfigGroups', () => {
	const CFG : any = {
		jwt: { expiresIn: 3600, refreshTokenDuration: 21600 },
		site: { name: 'Fatto' },
	};

	it('returns the groups in order with FormCreator fields named by dotted key', () => {
		const groups = systemConfigGroups( CFG );

		expect( groups.map( ( g ) => g.label ) ).toEqual( [ 'Sessions', 'Site', 'Users', 'Email' ] );
		expect( groups[0].fields.map( ( f : any ) => f.name ) ).toEqual( [ 'jwt.expiresIn', 'jwt.refreshTokenDuration' ] );
	});

	it('uses the current effective value as default, and the matching field types', () => {
		const fields = systemConfigGroups( CFG ).flatMap( ( g ) => g.fields as any[] );
		const by = ( name : string ) => fields.find( ( f ) => f.name === name );

		expect( by( 'site.name' ) ).toMatchObject( { type: 'text', label: 'Site name', default: 'Fatto' } );
		expect( by( 'ses.fromEmail' ).type ).toBe( 'email' );
		expect( by( 'user.passwordMaxAgeDays' ).type ).toBe( 'number' );
	});

	it('shows the registration settings as checkboxes and a text, off and empty when not configured', () => {
		const fields = systemConfigGroups( CFG ).flatMap( ( g ) => g.fields as any[] );
		const by = ( name : string ) => fields.find( ( f ) => f.name === name );

		expect( by( 'user.allowRegistration' ) ).toMatchObject( { type: 'checkbox', label: 'Allow user registration', default: false } );
		expect( by( 'user.createDomain' ) ).toMatchObject( { type: 'checkbox', default: false } );
		expect( by( 'user.registrationAuthCode' ) ).toMatchObject( { type: 'text', default: '' } );

		const set : any = { ...CFG, user: { allowRegistration: true, registrationAuthCode: 'abc' } };
		const on = systemConfigGroups( set ).flatMap( ( g ) => g.fields as any[] );
		expect( on.find( ( f ) => f.name === 'user.allowRegistration' ).default ).toBe( true );
		expect( on.find( ( f ) => f.name === 'user.registrationAuthCode' ).default ).toBe( 'abc' );
	});

	it('shows a duration with the largest exact unit, as the user would type it', () => {
		const cfg : any = { jwt: { expiresIn: 3600, refreshTokenDuration: 604800 } };
		const fields = systemConfigGroups( cfg ).flatMap( ( g ) => g.fields as any[] );

		expect( fields.find( ( f ) => f.name === 'jwt.expiresIn' ).default ).toBe( '1h' );
		expect( fields.find( ( f ) => f.name === 'jwt.refreshTokenDuration' ).default ).toBe( '7d' );
		expect( systemConfigGroups( { jwt: { expiresIn: 90 } } as any )[0].fields[0].default ).toBe( '90s' );
	});

	it('leaves the default undefined for a key missing from the config', () => {
		const fields = systemConfigGroups( CFG ).flatMap( ( g ) => g.fields as any[] );

		expect( fields.find( ( f ) => f.name === 'user.passwordMaxAgeDays' ).default ).toBeUndefined();
	});
});
