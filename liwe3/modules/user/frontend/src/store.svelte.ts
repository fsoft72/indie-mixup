import { browser } from '$app/environment';
import type { UserAuth } from '@frontend/liwe3';
import { apiClient } from '@frontend/liwe3';
import { user_2fa_verify, user_change_identity, user_login, user_logout, user_me, user_password_change_expired } from './actions';

// create a writable store for the LiWEUser
const user : UserAuth = $state(
	{
		id: '',
		name: '',
		username: '',
		email: '',
		avatar: '',
		perms: [],
		token: '',
		refresh_token: '',
		domain: '',
	},
);

const store = {
	get user() {
		return user;
	},

	get isLoggedIn() {
		return !!user.token;
	},

	// login
	async login ( username : string, password : string, domain? : string ) {
		const res = await user_login( { username, password, domain } );
		if ( res.error ) return res;
		if ( res.data?.requires_domain_choice ) return res; // no session yet: the caller must ask which domain to use
		if ( res.data?.requires_2fa ) return res;
		if ( res.data?.requires_password_change ) return res; // no session yet: the caller must ask for a new password

		this.updateUser( res.data! );
		this.save();

		apiClient.setToken( res.data!.token );

		return res;
	},

	// complete a login for a 2FA-enabled user (step 2)
	async verify2fa ( pending_token : string, code : string ) {
		const res = await user_2fa_verify( { pending_token, code } );
		if ( res.error ) return res;
		if ( res.data?.requires_password_change ) return res; // 2FA passed, but the password must be changed first

		this.updateUser( res.data! );
		this.save();

		apiClient.setToken( res.data!.token );

		return res;
	},

	// complete a login blocked by an expired password (forced by an admin or too old)
	async changeExpiredPassword ( pending_token : string, password : string ) {
		const res = await user_password_change_expired( { pending_token, password } );
		if ( res.error ) return res;

		this.updateUser( res.data! );
		this.save();

		apiClient.setToken( res.data!.token ?? '' );

		return res;
	},

	async changeIdentity ( id_user : string ) {
		const res = await user_change_identity( { id_user } );
		if ( res.error ) return res;

		this.updateUser( res.data! );
		this.save();

		apiClient.setToken( res.data!.token );

		return res.data;
	},

	async logout () {
		// Clear localStorage first
		if ( browser ) localStorage.removeItem( 'user' );

		// Clear token from API client
		apiClient.setToken( '' );

		// Call backend logout (may fail but we're already logged out locally)
		try {
			await user_logout();
		} catch ( error ) {
			console.error( 'Logout API call failed:', error );
		}

		this.clearUser();
	},

	async me () {
		const res = await user_me();

		return res;
	},

	async check () {
		const res = await user_me();

		if ( !res.ok ) {
			this.clearUser();
			if ( browser ) localStorage.removeItem( 'user' );
			return false;
		}

		return true;
	},

	clearUser () {
		this.updateUser( {
			id: '',
			name: '',
			username: '',
			email: '',
			avatar: '',
			perms: [],
			token: '',
			refresh_token: '',
			domain: '',
		} );

		apiClient.setToken( '' );
	},

	updateUser ( data : Partial<UserAuth> ) {
		user.id = data.id ?? '';
		user.name = data.name;
		user.username = data.username;
		user.email = data.email;
		user.avatar = data.avatar;
		user.perms = data.perms;
		user.token = data.token;
		user.refresh_token = data.refresh_token;
		user.domain = data.domain;
	},

	save () {
		if ( browser ) localStorage.setItem( 'user', JSON.stringify( user ) );
	},

	load () {
		if ( !browser ) return;

		const data = localStorage.getItem( 'user' );
		if ( !data ) return;

		try {
			const parsed = JSON.parse( data );
			Object.assign( user, parsed );
			apiClient.setToken( user.token ?? 'no-token' );
		} catch ( e ) {
			console.error( 'Failed to parse user data from localStorage', e );
		}
	},
};

export default store;
