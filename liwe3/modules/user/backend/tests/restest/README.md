# User Module RESTest Suite

Comprehensive REST API tests for the User module using RESTest framework.

## Test Files

### Authentication Tests

- **[wrong-login.tests.json](wrong-login.tests.json)** - Tests invalid login attempts
- **[admin-login.tests.json](admin-login.tests.json)** - Admin login and session setup
- **[user-auth.tests.json](user-auth.tests.json)** - Complete authentication flow including:
  - User login/logout
  - Token refresh
  - Session validation
  - Invalid credentials handling
  - Missing parameter validation

### CRUD Operations

- **[user-crud.tests.json](user-crud.tests.json)** - User lifecycle management:
  - Create new users
  - Update existing users
  - List users
  - Delete users
  - Duplicate username/email detection

### Permissions

- **[user-permissions.tests.json](user-permissions.tests.json)** - Permission management:
  - Set user permissions
  - Update permissions
  - Clear permissions
  - Verify permission assignment

### Roles

- **[user-role.tests.json](user-role.tests.json)** - Role management:
  - Create/update a role
  - Reject duplicate role names per domain
  - Assign a role to a user (additive perms union)
  - Additive sync when new perms are added to an existing role
  - List roles for the current domain
  - Delete a role and unlink assigned users

  Note: the delete step only asserts the HTTP response; the actual unlink behavior (`id_role` set to null, `perms` left untouched) is covered by the `user_role_del` unit tests in `tests/user-role.test.ts`, since no endpoint currently exposes a single user's role/perms for end-to-end verification.

### 2FA

- **[user-2fa.tests.json](user-2fa.tests.json)** - Two-factor authentication (TOTP):
  - Start 2FA setup (returns a secret and an otpauth:// URL)
  - Reject enabling 2FA with an invalid code
  - Reject disabling 2FA with the wrong password
  - Disable 2FA with the correct password
  - Reject a 2FA admin-disable from a caller without `user.2fa.manage`
  - Admin force-disables 2FA on another user, and 404s on a non-existent one

  Note: a live TOTP code cannot be computed from restest's static JSON tests (no scripting support), so the full setup -> enable -> login round trip (valid TOTP code, recovery-code fallback and consumption, pending-token expiry) is covered by the vitest suites `tests/user-2fa.test.ts` and `tests/user-login-2fa.test.ts` instead.

### Forced password change

- **[user-password-expired.tests.json](user-password-expired.tests.json)** - Forced password change (`password_expired`):
  - Normal login, then the admin sets the flag: login answers `requires_password_change` + `pending_token` and NO session
  - A wrong password does not reveal the expired state
  - `/user/password/change-expired`: garbage token and session token (401), too short and unchanged password (400), success (full login), replay (400)
  - New password works, old one does not; a plain user cannot set the flag (403); admin clears it; unknown user (404)
  - `/user/set/password_max_age`: set 45, set 0, a missing `days` clears it (null), negative days (400), plain user (403), unknown user (404)

  Passwords come from the environment (`%(system_admin_password)s`, plus a suffix): no fixed credential in the file. The automatic expiry (`cfg.user.passwordMaxAgeDays`) cannot be driven from here (no endpoint backdates `password_changed_at`) and is covered by `tests/user-password-expired.test.ts`.

### Invitations

- **[user-invites.tests.json](user-invites.tests.json)** - User invitation system:
  - Create invitations
  - Multiple invitations per user
  - Invitation code uniqueness

### Pagination

- **[user-pagination.tests.json](user-pagination.tests.json)** - List pagination:
  - Default listing
  - Limit parameter
  - Offset parameter
  - Edge cases (large offsets)

### Validation

- **[user-validation.tests.json](user-validation.tests.json)** - Input validation:
  - Missing required fields
  - Invalid email formats
  - Weak passwords
  - Invalid permissions
  - Non-existent user operations

### Edge Cases

- **[user-edge-cases.tests.json](user-edge-cases.tests.json)** - Special scenarios:
  - Disabled users
  - Special characters in names
  - Empty permission arrays
  - Password-only updates
  - Username case sensitivity

## Running Tests

### Run All Tests

```bash
restest all.json
```

### Run Individual Test Suites

```bash
restest user-auth.tests.json
restest user-crud.tests.json
restest user-permissions.tests.json
# ... etc
```

### Run with Options

```bash
# Don't stop on errors
restest --dont-stop-on-error all.json

# Set base URL
restest --base-url https://api.example.com all.json

# Dry run (don't execute)
restest --dry all.json

# Step-by-step execution
restest --step all.json

# Export to CSV
restest --csv results.csv all.json
```

## Environment Variables

The tests expect the following variables to be available (typically from admin-login.tests.json):

- `system_admin_username` - Admin username
- `system_admin_password` - Admin password
- `token` - Authentication token (set after admin login)

## Test Design Principles

### Database Stability

All tests are designed to maintain database stability:

- Each test creates its own test data
- Test data is cleaned up after each test section
- Tests use unique identifiers with counters to avoid conflicts
- Failed tests won't leave orphaned data

### Token Management

- Tests save and restore authentication tokens
- Original admin token is preserved when testing with other users
- Token switching is explicit and well-documented

### Error Handling

- Expected errors use `"ignore_error": true`
- Tests verify both success and failure scenarios
- Status codes are explicitly checked

### Unique Identifiers

Tests use `${counter}` variable for unique values:

```json
{
	"username": "testuser_${counter}",
	"email": "test_${counter}@example.com"
}
```

### Email Verification

All test users are created with `email_verified: true` since email verification cannot be performed during automated testing:

```json
{
	"username": "testuser",
	"email": "test@example.com",
	"password": "Test123!",
	"email_verified": true
}
```

## Test Coverage

The test suite covers:

✅ **All User Endpoints**

- POST /user/add
- DELETE /user/delete
- GET /user/list
- POST /user/login
- GET /user/logout
- GET /user/me
- POST /user/perms/set
- POST /user/invite/create
- POST /user/token/refresh
- POST /user/role/add
- DELETE /user/role/del
- GET /user/role/list
- POST /user/role/assign
- POST /user/2fa/setup
- POST /user/2fa/enable
- POST /user/2fa/disable
- POST /user/2fa/verify
- POST /user/2fa/admin/disable

✅ **All User Types**

- User
- UserLogin
- UserInvite
- TokenRefreshResponse

✅ **All Permissions**

- user.create
- user.delete
- user.password
- user.list
- user.perms
- user.change_identity

✅ **Edge Cases**

- Disabled users
- Special characters
- Empty values
- Invalid inputs
- Boundary conditions

## Test Statistics

- **Total Test Files**: 10
- **Total Test Sections**: 10
- **Estimated Test Cases**: 65+
- **Endpoints Covered**: 14/16 (excluding change/identity and create/admin)

## Notes

### Not Tested

Some endpoints are intentionally not tested:

- `GET /user/create/admin` - Dangerous admin creation endpoint
- `GET /user/change/identity` - Requires special permission setup

### Prerequisites

Tests assume:

- Server running at `http://localhost:8787`
- Admin user credentials available
- Empty or test database state
- All required permissions for admin user

## Maintenance

When adding new user endpoints:

1. Create a new test file following naming convention
2. Add include statement to [all.json](all.json)
3. Ensure cleanup of test data
4. Update this README

## Troubleshooting

### Tests Failing

- Verify server is running: `http://localhost:8787`
- Check admin credentials are correct
- Ensure database is in clean state
- Review test logs for specific errors

### Database Cleanup

If tests leave orphaned data:

```bash
# Run cleanup script or manually delete test users
# Look for usernames starting with: testuser_, authtest_, permtest_, etc.
```
