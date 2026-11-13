import { user_add, user_delete, user_list, user_load, user_perms_set, user_set_password_expired, user_set_password_max_age } from './actions';
import { maxAgeParams } from './password-max-age';
import { User, ZUser } from './types';

let users : User[] = $state( [] );

const store = {
	get users() {
		return users;
	},

	domainUsers ( domain? : string ) {
		if ( !domain || domain.length === 0 ) return users;
		return users.filter( ( u ) => u.domain === domain );
	},

	async add ( user : User ) {
		const res = ZUser.safeDecode( user );

		if ( res.error ) {
			console.log( '=== USER ADD ERROR: ', res.error );
			return res;
		}

		const u : User = res.data;
		u.enabled = true;

		const resp = await user_add( u );

		if ( !resp.ok ) return resp;

		const u2 : User = { ...resp.data } as any;

		u2.domain = users[0].domain ?? '';
		users.push( u2 );

		return resp;
	},

	// load users using pagination
	// if start and limit are not provided, load all users
	async load ( offset? : number, limit? : number ) {
		// if offset is provided, check in `users` if we have already loaded users from start to start+limit
		if ( offset !== undefined && limit !== undefined ) {
			const end = offset + limit;
			const alreadyLoaded = users.slice( offset, end ).length === limit;
			if ( alreadyLoaded ) {
				return; // already loaded
			}
		}

		const res = await user_list( { offset, limit } );

		if ( res.error ) return;

		// replace or add users
		if ( offset !== undefined && limit !== undefined ) {
			const end = offset + limit;
			users = [
				...users.slice( 0, offset ),
				...res.data,
				...users.slice( end ),
			];
		} else {
			users = res.data;
		}
	},

	async delUser ( id : string ) {
		const res = await user_delete( { id } );

		if ( res.error ) return res;
		users = users.filter( ( u ) => u.id !== id );
		return res;
	},

	/**
	 * Sets (or clears) the number of days after which the user must change the password.
	 *
	 * @param userId - The user id
	 * @param days - 0: never expires, N: expires after N days, undefined: use the global default
	 */
	async setPasswordMaxAge ( userId : string, days? : number ) {
		const res = await user_set_password_max_age( maxAgeParams( userId, days ) );

		if ( !res.ok ) return res;

		users = users.map( ( u ) => ( u.id === userId ? { ...u, password_max_age_days: days } : u ) );

		return res;
	},

	/**
	 * Forces (or cancels) the password change at the next login.
	 *
	 * @param userId - The user id
	 * @param expired - true to force the change, false to cancel it
	 */
	async setPasswordExpired ( userId : string, expired : boolean ) {
		const res = await user_set_password_expired( { id: userId, password_expired: expired } );

		if ( !res.ok ) return res;

		users = users.map( ( u ) => ( u.id === userId ? { ...u, password_expired: expired } : u ) );

		return res;
	},

	async setUserPerms ( userId : string, perms : string[] ) {
		const res = await user_perms_set( { id_user: userId, perms } );

		if ( !res.ok ) return res;

		// update user in users
		users = users.map( ( u ) => {
			if ( u.id === userId ) return { ...u, perms };
			return u;
		} );

		return res;
	},
};

export default store;
