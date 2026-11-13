import { LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, liwe_event_register, responseSuccess } from '@backend/liwe3';
import { eq, like, or } from './methods/utils';
import { system_admin_domain_create_root } from './methods/system-admin-domain-create_root';
import { SYSTEM_CALL_DOMAIN_CREATE, SYSTEM_CALL_MAX_TIERS_SET, SYSTEM_CALL_SUBDOMAIN_CREATE } from './events';
import { SystemDomainSubdomainCreateParams, system_domain_subdomain_create } from './methods';
import { system_domains } from './schema';
import { SystemDomain } from './types';

export const listeners_init = ( app : LiWEApp ) => {
	console.log( '    - listeners' );

	liwe_event_register( SYSTEM_CALL_DOMAIN_CREATE, async ( ctx : LiWECtx, event_data : any ) : Promise<LiWEResponse> => {
		const sys : LiWESysParams = {
			skip_permissions_check: true,
			params: {
				returnExistingDomain: true,
			},
		};

		const res : LiWEResponse = await system_admin_domain_create_root(
			ctx,
			{
				name: event_data.name,
				code: event_data.code,
				total_max_tiers: event_data.total_tiers || 0,
			},
			sys,
		);

		return res;
	} );

	liwe_event_register( SYSTEM_CALL_SUBDOMAIN_CREATE, async ( ctx : LiWECtx, event_data : any ) : Promise<LiWEResponse> => {
		const sys : LiWESysParams = {
			skip_permissions_check: true,
			domain: event_data.domain,
		};

		console.log( '\n\n\n=== SUBDOMAIN CREATE', event_data );

		const params : SystemDomainSubdomainCreateParams = {
			name: event_data.app,
			tiers_allocated: 1,
		};

		const res = await system_domain_subdomain_create( ctx, params, sys );

		console.log( '=== RES: ', res );

		return res;
	} );

	liwe_event_register(
		SYSTEM_CALL_MAX_TIERS_SET,
		async ( ctx : LiWECtx, event_data : any ) : Promise<LiWEResponse<SystemDomain>> => {
			const sys : LiWESysParams = {
				skip_permissions_check: true,
				domain: event_data.domain,
			};

			await ctx.app.db.update( system_domains )
				.set( {
					total_max_tiers: event_data.max_tiers,
				} )
				.where( eq( system_domains.code, event_data.domain ) );

			const domains : SystemDomain[] = await ctx.app.db.select().from( system_domains ).where( eq( system_domains.code, event_data.domain ) );

			return responseSuccess( domains[0] );
		},
	);
};
