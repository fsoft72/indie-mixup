import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, liwe_event_emit, liwe_event_register, responseError, responseSuccess } from '@backend/liwe3';
import { user_add, user_delete, user_invite_create, user_perms_set, user_set_enabled, user_set_password } from './methods';
import { and, email_normalize, eq, like, ne, or } from './methods/utils';
import { user_invites, user_oauth_links, users } from './schema';
import { User, UserInvite } from './types';
import {
	USER_CALL_INVITE_GET,
	USER_CALL_USER_ADD,
	USER_CALL_USER_DEL,
	USER_CALL_USER_GET,
	USER_CALL_USER_LIST,
	USER_CALL_USER_OAUTH_LINK,
	USER_CALL_USER_PERMS,
	USER_CALL_USER_REGISTER,
	USER_CALL_USER_SET_ENABLED,
	USER_CALL_USER_SET_PASSWORD,
	USER_CALL_USER_UPDATE,
	USER_EVENT_REGISTERED,
} from './events';
import {
	USER_PERM_2FA_MANAGE,
	USER_PERM_CHANGE_IDENTITY,
	USER_PERM_CREATE,
	USER_PERM_DELETE,
	USER_PERM_ENABLE,
	USER_PERM_LIST,
	USER_PERM_OAUTH_MANAGE,
	USER_PERM_PASSWORD,
	USER_PERM_PERMS,
	USER_PERM_ROLE_MANAGE,
	USER_PERM_VERIFY,
} from './perms';

// Every user.* permission, granted to whoever self-registers a brand-new domain
// so they can manage that domain from the start.
const USER_REGISTER_OWNER_PERMS = [
	USER_PERM_CREATE,
	USER_PERM_DELETE,
	USER_PERM_PASSWORD,
	USER_PERM_LIST,
	USER_PERM_PERMS,
	USER_PERM_CHANGE_IDENTITY,
	USER_PERM_ROLE_MANAGE,
	USER_PERM_2FA_MANAGE,
	USER_PERM_OAUTH_MANAGE,
	USER_PERM_ENABLE,
	USER_PERM_VERIFY,
];

export const listeners_init = ( app : LiWEApp ) => {
	console.log( '    - listeners' );

	liwe_event_register( USER_CALL_USER_ADD, async ( ctx : LiWECtx, event_data : any ) => {
		const sys : LiWESysParams = {
			skip_permissions_check: true,
			domain: event_data.user.domain,
		};

		const res = await user_add( ctx, event_data.user, sys );

		return res;
	} );

	liwe_event_register( USER_CALL_USER_PERMS, async ( ctx : LiWECtx, event_data : any ) => {
		const sys : LiWESysParams = {
			skip_permissions_check: true,
		};

		const res = await user_perms_set( ctx, event_data, sys );

		return res;
	} );

	liwe_event_register( USER_CALL_USER_GET, async ( ctx : LiWECtx, event_data : any ) => {
		const userIdOrEmail = event_data.id || event_data.email || event_data.username;
		if ( !userIdOrEmail ) return responseError( 'No user identifier provided', 400, 'ERROR_NO_USER_IDENTIFIER' );

		// Emails are stored lowercase: the value is normalised and compared directly (index on users.email); id and username stay exact
		const email = email_normalize( String( userIdOrEmail ) );

		const user = await ctx.app.db.select().from( users ).where(
			or(
				eq( users.id, userIdOrEmail ),
				eq( users.email, email ),
				eq( users.username, userIdOrEmail ),
			),
		).get();

		if ( !user ) return responseError( 'User not found', 404, 'ERROR_USER_NOT_FOUND' );

		return responseSuccess( user );
	} );

	// OAuth identity of a user for one provider (e.g. the numeric GitHub id): only the provider user id is
	// returned, never the email stored in the link. The lookup stays inside the caller domain (or the payload one).
	liwe_event_register( USER_CALL_USER_OAUTH_LINK, async ( ctx : LiWECtx, event_data : any ) => {
		const id_user = event_data?.id_user;
		const provider = event_data?.provider;
		if ( typeof id_user !== 'string' || !id_user ) return responseError( 'id_user is required', 400, 'ERROR_NO_USER_IDENTIFIER' );
		if ( typeof provider !== 'string' || !provider ) return responseError( 'provider is required', 400, 'ERROR_NO_PROVIDER' );

		const caller = await ctx.user();
		const domain = event_data?.domain ?? caller?.domain ?? '_';

		const link = await ctx.app.db.select().from( user_oauth_links ).where(
			and(
				eq( user_oauth_links.id_user, id_user ),
				eq( user_oauth_links.provider, provider ),
				eq( user_oauth_links.domain, domain ),
			),
		).get();

		if ( !link ) return responseError( 'OAuth link not found', 404, 'ERROR_OAUTH_LINK_NOT_FOUND' );

		return responseSuccess( { id_user: link.id_user, provider: link.provider, provider_user_id: link.provider_user_id } );
	} );

	// Reduced list of the users of a domain: only id, public identity fields, perms and the enabled flag are returned.
	liwe_event_register( USER_CALL_USER_LIST, async ( ctx : LiWECtx, event_data : any ) => {
		const caller = await ctx.user();
		const domain = event_data?.domain ?? caller?.domain ?? '_';

		const rows = await ctx.app.db.select( {
			id: users.id,
			username: users.username,
			name: users.name,
			lastname: users.lastname,
			email: users.email,
			perms: users.perms,
			enabled: users.enabled,
		} ).from( users ).where( eq( users.domain, domain ) ).all();

		return responseSuccess( rows.map( ( row ) => ( { ...row, perms: row.perms ?? [] } ) ) );
	} );

	// Reads a user and checks it belongs to `domain`: the account events below are for trusted server
	// code that already authorized the caller, but they still never cross a domain boundary.
	const _userOfDomain = async ( ctx : LiWECtx, id : unknown, domain : unknown ) : Promise<{ user? : User; error? : LiWEResponse }> => {
		if ( typeof id !== 'string' || !id ) return { error: responseError( 'id is required', 400, 'ERROR_NO_USER_IDENTIFIER' ) };
		if ( typeof domain !== 'string' || !domain ) return { error: responseError( 'domain is required', 400, 'ERROR_NO_DOMAIN' ) };

		const user = await ctx.app.db.select().from( users ).where( eq( users.id, id ) ).get();
		if ( !user ) return { error: responseError( 'User not found', 404, 'ERROR_USER_NOT_FOUND' ) };
		if ( ( user.domain ?? null ) !== domain ) return { error: responseError( 'User outside the given domain', 403, 'ERROR_USER_OTHER_DOMAIN' ) };

		return { user: user as User };
	};

	liwe_event_register( USER_CALL_USER_UPDATE, async ( ctx : LiWECtx, event_data : any ) => {
		const { user, error } = await _userOfDomain( ctx, event_data?.id, event_data?.domain );
		if ( error ) return error;

		const fields : Record<string, string> = {};
		for ( const key of [ 'name', 'lastname', 'email' ] )
			if ( typeof event_data[key] === 'string' )
				fields[key] = key === 'email'
					? email_normalize( event_data[key] )
					: event_data[key];

		if ( fields.email !== undefined && fields.email !== user!.email ) {
			const clash = await ctx.app.db.select( { id: users.id } ).from( users )
				.where( and( eq( users.domain, event_data.domain ), eq( users.email, fields.email ), ne( users.id, event_data.id ) ) )
				.get();
			if ( clash ) return responseError( 'Email already used by another user of the domain', 409, 'ERROR_EMAIL_EXISTS' );
		}

		// An account created with its email as username keeps following it: the user logs in with the new email
		if ( fields.email !== undefined && fields.email !== user!.email && ( user!.username ?? '' ).toLowerCase() === ( user!.email ?? '' ).toLowerCase() ) {
			const taken = await ctx.app.db.select( { id: users.id } ).from( users )
				.where( and( eq( users.domain, event_data.domain ), eq( users.username, fields.email ), ne( users.id, event_data.id ) ) )
				.get();
			if ( taken ) return responseError( 'Username already used by another user of the domain', 409, 'ERROR_USERNAME_EXISTS' );

			fields.username = fields.email;
		}

		if ( Object.keys( fields ).length > 0 ) await ctx.app.db.update( users ).set( fields as any ).where( eq( users.id, event_data.id ) ).run();

		const updated = await ctx.app.db.select().from( users ).where( eq( users.id, event_data.id ) ).get();
		if ( !updated ) return responseError( 'Failed to retrieve updated user', 500 );

		// Never hand out the hash or the domain
		return responseSuccess( { ...updated, password: null, domain: null } );
	} );

	liwe_event_register( USER_CALL_USER_SET_ENABLED, async ( ctx : LiWECtx, event_data : any ) => {
		const { error } = await _userOfDomain( ctx, event_data?.id, event_data?.domain );
		if ( error ) return error;
		if ( typeof event_data.enabled !== 'boolean' ) return responseError( 'enabled must be a boolean', 400, 'VALIDATION_ERROR' );

		return user_set_enabled( ctx, { id: event_data.id, enabled: event_data.enabled }, { skip_permissions_check: true } );
	} );

	liwe_event_register( USER_CALL_USER_SET_PASSWORD, async ( ctx : LiWECtx, event_data : any ) => {
		const { error } = await _userOfDomain( ctx, event_data?.id, event_data?.domain );
		if ( error ) return error;
		if ( typeof event_data.password !== 'string' ) return responseError( 'password is required', 400, 'VALIDATION_ERROR' );

		return user_set_password( ctx, { id: event_data.id, password: event_data.password }, { skip_permissions_check: true } );
	} );

	liwe_event_register( USER_CALL_USER_REGISTER, async ( ctx : LiWECtx, event_data : any ) => {
		const { username, email, password, domain, name, lastname } = event_data;

		if ( !domain ) return responseError( 'No domain provided', 400, 'ERROR_NO_DOMAIN' );

		// registration always creates a brand-new domain: reject if it already exists
		const domainExists = await ctx.app.db.select( { id: users.id } ).from( users ).where(
			eq( users.domain, domain ),
		).get();

		if ( domainExists ) return responseError( 'Domain already exists', 400, 'ERROR_DOMAIN_ALREADY_EXISTS' );

		const sys : LiWESysParams = {
			skip_permissions_check: true,
			domain,
		};

		// the registering user owns the new domain: grant every user.* permission
		const res = await user_add( ctx, {
			username,
			email,
			password,
			name,
			lastname,
			perms: USER_REGISTER_OWNER_PERMS,
		}, sys );

		// Let the other modules set up the new domain (e.g. kanban creates its Default workspace)
		if ( res.ok && res.data?.id ) await liwe_event_emit( ctx, USER_EVENT_REGISTERED, { id_user: res.data.id, domain } );

		return res;
	} );

	liwe_event_register( USER_CALL_INVITE_GET, async ( ctx : LiWECtx, event_data : any ) => {
		const inv : UserInvite | undefined = await ctx.app.db.select().from( user_invites ).where(
			eq( user_invites.code, event_data.code ),
		).get();

		if ( !inv ) return responseError( 'Invite not found' );

		return responseSuccess( inv );
	} );

	liwe_event_register( 'system.domain_delete', async ( ctx : LiWECtx, event_data : any ) => {
		const { code } = event_data;

		if ( !code ) return responseError( 'no domain code provided', 400, 'ERROR_NO_DOMAIN_CODE' );
		if ( code.includes( '%' ) ) return responseError( 'invalid domain code format', 501, 'ERROR_DOMAIN_CODE' );

		// list all user that have the domain starting with the `code` provided
		const userList : any[] = await ctx.app.db.select().from( users ).where(
			or(
				eq( users.domain, code ),
				like( users.domain, `${code}:%` ),
			),
		).all();

		const _sys : LiWESysParams = {
			skip_permissions_check: true,
		};

		// cycle all userList and delete users, by calling `user_delete`
		await Promise.all(
			userList.map( ( user : any ) => user_delete( ctx, { id: user.id }, _sys ) ),
		);

		return responseSuccess( true );
	} );
};
