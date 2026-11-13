// A new user has been created
export const USER_EVENT_CREATE = 'user.create';

// A user has been deleted
export const USER_EVENT_DELETE = 'user.delete';

// Create a new user in the system
export const USER_CALL_USER_ADD = 'user.call.user.add';

// Delete a user from the system
export const USER_CALL_USER_DEL = 'user.call.user.del';

// Returns the invite belonging to the code
export const USER_CALL_INVITE_GET = 'user.call.invite.get';

// User logged in
export const USER_EVENT_LOGIN = 'user.login';

// Return a single user by id or email or username
export const USER_CALL_USER_GET = 'user.call.user.get';

// Return the OAuth link (provider and provider_user_id) of a user for a given provider
export const USER_CALL_USER_OAUTH_LINK = 'user.call.user.oauth_link';

// Set the user permissions
export const USER_CALL_USER_PERMS = 'user.call.user.perms';

// Self-service registration call. Payload: username, email, password, domain, name, lastname. Rejects if `domain` already exists in the system. On success creates the user in the new domain with email_verified=false, grants it every user.* permission (it becomes the owner/admin of its own domain), sends an email verification link (same token flow as /user/email/resend, valid 7 days), and returns the created User.
export const USER_CALL_USER_REGISTER = 'user.call.user.register';

// Return the list of users of the caller's domain, with only username, name, lastname, email and perms. Payload: domain (optional, defaults to the caller's domain or '_').
export const USER_CALL_USER_LIST = 'user.call.user.list';

// Change name, lastname and/or email of a user. Payload: id, domain, name?, lastname?, email?. Trusted server code only: the user must belong to `domain` (403 otherwise) and the email must be free in the domain (409). A username equal to the old email follows the new email.
export const USER_CALL_USER_UPDATE = 'user.call.user.update';

// Enable or disable (suspend) a user. Payload: id, domain, enabled. Trusted server code only: the user must belong to `domain`.
export const USER_CALL_USER_SET_ENABLED = 'user.call.user.set_enabled';

// A new domain has been registered by its first user. Payload: id_user, domain
export const USER_EVENT_REGISTERED = 'user.registered';

// Set the password of a user. Payload: id, domain, password (8 characters at least). Trusted server code only: the user must belong to `domain`.
export const USER_CALL_USER_SET_PASSWORD = 'user.call.user.set_password';
