// A new domain has been created
export const SYSTEM_EVENT_DOMAIN_CREATE = 'system.domain_create';

// A new subdomain has been created
export const SYSTEM_EVENT_SUBDOMAIN_CREATE = 'system.subdomain_create';

// A domain has been deleted
export const SYSTEM_EVENT_DOMAIN_DELETE = 'system.domain_delete';

// Add a permission to a user  (id_user, perm)
export const SYSTEM_EVENT_USER_PERM_ADD = 'system.user_perm_add';

// Remove a permission to a user (id_user, perm)
export const SYSTEM_EVENT_USER_PERM_DEL = 'system.user_perm_del';

// Ask user module to add a new user to the system (user)
export const SYSTEM_CALL_USER_ADD = 'system.call.user.add';

// Ask the system to create a new domain
export const SYSTEM_CALL_DOMAIN_CREATE = 'system.call.domain.create';

// Ask the system to create a new subdomain
export const SYSTEM_CALL_SUBDOMAIN_CREATE = 'system.call.subdomain.create';

// Set max tiers for given domain
export const SYSTEM_CALL_MAX_TIERS_SET = 'system.call.max_tiers.set';
