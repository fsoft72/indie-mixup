import { LiWEApp } from '@backend/liwe3/src/app';
import { eq } from './methods/utils';
import { system_domains } from './schema';

export const system_create_default_domain = async ( app : LiWEApp ) => {
	const domain = app.cfg.system.domain ?? '_';
	console.log( '    - default domain' );

	const res = await app.db.select( { code: system_domains.code } ).from( system_domains ).where(
		eq( system_domains.code, domain ),
	).get();

	if ( !res ) {
		console.log( `    - creating default domain: ${domain}` );

		const res = await app.db.insert( system_domains ).values( {
			code: domain,
			name: 'Default System Domain',
			total_max_tiers: 0,
			tiers_allocated: 0,
			visible: true,
		} ).run();
	}
};
