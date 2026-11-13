import { LiWEApp, ctxSystem } from '@backend/liwe3';
import { users } from './schema';
import { LiWESysParams, and, eq } from './methods/utils';
import { User } from './types';
import { user_add } from './methods';

export const user_create_default_users = async ( app : LiWEApp ) => {
	// let's check if the default user is already been created
	const username = app.cfg.system.username;
	const pwd = app.cfg.system.password;
	const domain = app.cfg.system.domain ?? 'system';

	console.log( '    - default users' );

	if ( !username ) {
		console.log( '      warning: no default users defined in cfg file' );
		return;
	}

	const res = await app.db.select( { id: users.id } ).from( users ).where( and(
		eq( users.username, username ),
		eq( users.domain, domain ),
	) ).get();

	if ( !res ) {
		console.log( `    - creating default admin (${username} - domain: ${domain})` );
		const sys : LiWESysParams = {
			skip_permissions_check: true,
			domain,
		};

		const u : User = {
			name: 'johnny',
			lastname: 'admin',
			username: username,
			password: pwd,
			email: `${username}!@example.com`,
			enabled: true,
			level: 100,
			perms: [ 'system.admin' ],
			email_verified: true,
			domain: domain,
			verified_at: new Date().getTime(),
			two_factor_enabled: false,
			password_expired: false,
		};

		await user_add( ctxSystem( app ), u, sys );
	} else {
		// update existing user to ensure email_verified is true
		await app.db.update( users ).set( {
			email_verified: true,
			verified_at: new Date().getTime(),
			domain: domain,
		} ).where( and(
			eq( users.username, username ),
			eq( users.domain, domain ),
		) ).run();
	}
};
