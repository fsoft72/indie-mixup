import { apiClient } from '@frontend/liwe3';
import { SystemDomain } from './types';
import { system_admin_domain_add, system_admin_domain_create_root, system_admin_domain_del, system_admin_domains_list } from './actions';

interface SystemAdminDomainsStore {
	domains : Record<string, SystemDomain>;
}

// create a writable store for the LiWEUser
const system = $state<SystemAdminDomainsStore>( {
	domains: {},
} );

const store = {
	get domains() {
		return system.domains;
	},

	// returns only the root domains (those without : in their code)
	get roots() {
		return Object.values( system.domains ).filter( ( d ) => !d.code.includes( ':' ) );
	},

	async createRoot ( data : SystemDomain ) {
		const res = await system_admin_domain_create_root( data );
		if ( !res.ok ) return;

		await this.list();
	},

	async list () {
		const res = await system_admin_domains_list();

		system.domains = {};

		for ( const domain of res.data ?? [] ) {
			system.domains[domain.code] = domain;
		}
	},

	async del ( code : string ) {
		const res = await system_admin_domain_del( { code } );

		if ( res.ok ) delete system.domains[code];

		return res;
	},
};

export default store;
