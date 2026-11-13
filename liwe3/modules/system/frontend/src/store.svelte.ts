import { system_admin_permissions_list } from './actions';

interface SystemStore {
	perms : Record<string, any[]>;
}

// create a writable store for the LiWEUser
const system = $state<SystemStore>( {
	perms: {},
} );

const store = {
	get perms() {
		return system.perms;
	},

	async load () {
		const res = await system_admin_permissions_list();

		if ( res.error ) {
			console.error( res.error );
			return;
		}

		system.perms = res.data;
	},
};

export default store;
