# OAuth Login

## Overview

The `user` module supports login via external OAuth providers (Google
and GitHub for now), on top of the existing username/password login.
It converges on the exact same session machinery as `user_login`: a
successful OAuth login produces the same `UserLogin` shape (token,
refresh_token, ...), goes through the same 2FA gate if the resolved
account has it enabled, and reuses the shared `user_create_user_login`
helper to create the KV session and issue the JWT.

Provider integrations live behind a small adapter interface
(`liwe3/modules/user/backend/src/oauth/`), so adding a new provider
(Apple, Meta, ...) means adding one adapter file and one registry
entry - no changes to the authorize/callback flow itself.

Provider credentials (`client_id`/`client_secret`) are configured
**per domain** in the database, not via environment secrets: this is a
multi-tenant system and each tenant can register its own OAuth app.

## Provider adapters

`liwe3/modules/user/backend/src/oauth/types.ts` defines the contract:

```typescript
interface OAuthProvider {
	id : string;
	getAuthorizeUrl : ( clientId : string, redirectUri : string, state : string ) => string;
	exchangeCode : ( clientId : string, clientSecret : string, code : string, redirectUri : string ) => Promise<{ accessToken : string }>;
	fetchProfile : ( accessToken : string ) => Promise<{
		providerUserId : string;
		email : string | null;
		emailVerified : boolean;
		name? : string;
	}>;
}
```

- `oauth/google.ts` - OIDC-based (`accounts.google.com` authorize,
  `oauth2.googleapis.com/token`, `openidconnect.googleapis.com/v1/userinfo`).
- `oauth/github.ts` - plain OAuth2, no OIDC: profile comes from
  `GET /user`, verified primary email from a separate
  `GET /user/emails` call (GitHub can hide the email on the main
  profile endpoint).
- `oauth/index.ts` - registry mapping a provider id (`"google"`,
  `"github"`) to its adapter, via `getOAuthProvider(id)`.

## Data model

### Table `user_oauth_providers`

Per-domain provider configuration.

| Column          | Type                             | Notes                                                                                                                                                            |
| --------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `TEXT(64)`, PK                   |                                                                                                                                                                  |
| `domain`        | `TEXT(64)`, not null             | Tenant this config belongs to.                                                                                                                                   |
| `provider`      | `TEXT(32)`, not null             | Provider id, e.g. `"google"`.                                                                                                                                    |
| `client_id`     | `TEXT`, not null                 |                                                                                                                                                                  |
| `client_secret` | `TEXT`, not null                 | **Encrypted at rest** (same `encryptData`/`decryptData` helpers used for the 2FA TOTP secret, key derived from `app.cfg.jwt.secret`). Never returned by the API. |
| `enabled`       | `INTEGER` (boolean), default `0` |                                                                                                                                                                  |

No DB-level unique constraint on `(domain, provider)` (consistent with
`user_roles.name` and the rest of the module); duplicates are rejected
at the application level in `user_oauth_provider_add`.

### Table `user_oauth_links`

Maps a provider identity to a local user.

| Column             | Type                                               | Notes                                                                                   |
| ------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `id`               | `TEXT(64)`, PK                                     |                                                                                         |
| `domain`           | `TEXT(64)`, not null                               |                                                                                         |
| `id_user`          | `TEXT(64)`, not null                               |                                                                                         |
| `provider`         | `TEXT(32)`, not null                               |                                                                                         |
| `provider_user_id` | `TEXT(64)`, not null                               | Opaque, stable id from the provider (Google `sub`, GitHub numeric user id as a string). |
| `email`            | `TEXT(128)`, nullable                              | Snapshot of the email at link time.                                                     |
| `created`          | `INTEGER` (timestamp), default `CURRENT_TIMESTAMP` |                                                                                         |

`(provider, provider_user_id)` is the durable identity used to resolve
a returning OAuth user - see [User resolution](#user-resolution) below.

## `UserLogin` type (shared with password login)

OAuth login and password login return the same type. Since the code
generator doesn't support a method returning a union of two different
types, `UserLogin` and the old `User2FARequired` were merged into one:

```typescript
const ZUserLogin = z.object( {
	id: z.string().optional(),
	username: z.string().optional(),
	email: z.string().optional(),
	perms: z.string().array().optional(),
	token: z.string().optional(),
	domain: z.string().optional(),
	refresh_token: z.string().optional(),
	requires_2fa: zodBoolean.optional().default( false ),
	pending_token: z.string().optional(),
} );
```

`requires_2fa` is the discriminant: `false` with the full-login fields
populated, or `true` with only `pending_token` set (complete the login
via `user_2fa_verify`, unchanged from the password-login 2FA flow).

## Permissions

| Permission          | Description                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `user.oauth.manage` | Required for `user_oauth_provider_add`, `user_oauth_provider_list`, `user_oauth_provider_del`. |

`user_oauth_authorize` and `user_oauth_callback` require no
permission - they're the pre-login entry points, same as `user_login`.

## Domain resolution (no `domain` param, ever)

The tenant `domain` is **never sent by the client**, on either the
provider-config endpoints or the login endpoints:

- `user_oauth_provider_add`/`_list`/`_del` take the domain from the
  caller's session (`sys?.domain || (await app.user)?.domain`), same
  pattern as `user_role_add`/`_list`/`_del`.
- `user_oauth_authorize` resolves the domain **server-side from the
  request's `Host` header**, via `resolveDomainFromHost()` in
  `methods/utils.ts`:
  - `acme.sito.com` -> `acme`
  - apex (`sito.com`) or `www.sito.com` -> the system domain
    (`app.cfg.system.domain`, defaulting to `"system"`)

This assumes the frontend is served on the same host as the API for
each tenant (`acme.sito.com` serves both), so the `Host` header on the
API call itself already carries the tenant. `user_oauth_callback`
doesn't need to resolve the domain again - it reads it back from the
state saved during `authorize` (see below).

## Methods & endpoints

All methods live in `liwe3/modules/user/backend/src/methods/`. Routes
are registered in `module_init()` (`src/index.ts`).

### `user_oauth_provider_add` - `POST /api/user/oauth/provider/add`

Creates or updates a provider config for the caller's domain.

**Permission:** `user.oauth.manage`.
**Params:** `{ id?: string, provider: string, client_id: string, client_secret: string, enabled?: boolean }`

**Behavior:**

- `id` omitted -> create; `id` present -> update (looked up within the
  caller's domain; `404` `OAUTH_PROVIDER_NOT_FOUND` if it doesn't
  belong to them).
- `400` `OAUTH_PROVIDER_UNSUPPORTED` if `provider` isn't a registered
  adapter id.
- `400` `OAUTH_PROVIDER_DUPLICATE` if another config already exists
  for `(domain, provider)`.
- `client_secret` is encrypted before being stored.

**Returns:** `LiWEResponse<UserOAUTHProvider>` - `client_secret` is
stripped from the response.

### `user_oauth_provider_list` - `GET /api/user/oauth/provider/list`

Lists provider configs for the caller's domain.

**Permission:** `user.oauth.manage`. **Params:** `{ offset?, limit? }`

**Returns:** `LiWEResponse<UserOAUTHProvider[]>` - `client_secret`
stripped from every row.

### `user_oauth_provider_del` - `DELETE /api/user/oauth/provider/del`

**Permission:** `user.oauth.manage`. **Params:** `{ id: string }`

`404` `OAUTH_PROVIDER_NOT_FOUND` if it doesn't exist or belongs to
another domain. **Returns:** `LiWEResponse<boolean>`.

### `user_oauth_provider_enable` - `POST /api/user/oauth/provider/enable`

Switches a provider on or off without touching its credentials (the
secret is never returned by the API, so `provider_add` cannot be used to
flip the flag).

**Permission:** `user.oauth.manage`. **Params:** `{ id: string, enabled: boolean }`

`404` `OAUTH_PROVIDER_NOT_FOUND` if it doesn't exist or belongs to
another domain. **Returns:** `LiWEResponse<UserOAUTHProvider>` -
`client_secret` stripped.

### `user_oauth_authorize` - `GET /api/user/oauth/authorize`

Starts the OAuth flow. **Auth:** none. **Params:** `{ provider: string, redirect_url: string }`

**Behavior:**

1. `400` `OAUTH_PROVIDER_UNSUPPORTED` if `provider` has no registered
   adapter.
2. Resolves `domain` from the `Host` header.
3. Looks up the enabled `(domain, provider)` config; `400`
   `OAUTH_PROVIDER_NOT_CONFIGURED` if none.
4. Generates a random single-use `state`, stores
   `{ domain, provider, redirect_url }` in KV under
   `oauth_state:<state>`, 5-minute TTL (same convention as the 2FA
   `pending_token`).
5. Returns the provider's authorize URL (built from `client_id`,
   `redirect_url`, `state` - never the secret).

**Returns:** `LiWEResponse<string>` - the authorize URL. The client
redirects the browser there.

### `user_oauth_callback` - `GET /api/user/oauth/callback`

Completes the OAuth flow after the provider redirects back. **Auth:**
none (validated entirely via `state`). **Params:** `{ state: string, code: string }`

**Behavior:**

1. Reads and deletes (single-use) `oauth_state:<state>` from KV; `400`
   `OAUTH_STATE_INVALID` if missing/expired.
2. Exchanges `code` for an access token via the adapter; `502`
   `OAUTH_EXCHANGE_FAILED` on failure.
3. Fetches the profile via the adapter; same error on failure.
4. `400` `OAUTH_EMAIL_UNVERIFIED` if the provider didn't return a
   verified email - required for safe account resolution.
5. Resolves the local user - see below.
6. If `two_factor_enabled` on the resolved user: returns
   `{ requires_2fa: true, pending_token }`, exactly like `user_login`.
7. Otherwise: creates the session via `user_create_user_login` and
   returns the full `UserLogin`.

**Returns:** `LiWEResponse<UserLogin>` (2FA-pending or complete, per
the `requires_2fa` discriminant).

## User resolution

On every callback, in order:

1. **Existing link** - a `user_oauth_links` row for
   `(provider, provider_user_id)` wins outright; the provider identity
   is the durable source of truth, even if the email changed since.
2. **Auto-link by email** - no link yet, but a `users` row exists for
   `(domain, email)` with the provider's (verified) email: link that
   account (insert the `user_oauth_links` row) and log in as them.
3. **New user** - neither found: create a new user with
   `enabled: true`, `email_verified: true` (the provider already
   vouches for it), `username` set to the email, empty `perms`, a
   random unusable password hash, `two_factor_enabled: false`. Insert
   the corresponding `user_oauth_links` row.

Provider access/refresh tokens are used only to fetch the profile
during this flow and are never persisted.

## Login flow

```
GET /api/user/oauth/authorize?provider=google&redirect_url=...
  -> { authorize_url }
  client redirects the browser to authorize_url

user authenticates with the provider, provider redirects back to
redirect_url with ?code=...&state=...

GET /api/user/oauth/callback?state=...&code=...
  no 2FA -> { requires_2fa: false, token, refresh_token, ... }        (done)
  2FA    -> { requires_2fa: true, pending_token }                     (needs step 2)

POST /api/user/2fa/verify     { pending_token, code }
  -> { requires_2fa: false, token, refresh_token, ... }               (done)
```

## Out of scope (for now)

- Letting a logged-in user list/unlink their own connected providers
  (`user_oauth_list`/`user_oauth_unlink`) - login/signup only today.
- Persisting provider access/refresh tokens for later API calls on the
  user's behalf.
- Apple/Meta adapters - the registry supports adding them, but they
  aren't implemented yet.

## Testing

Not yet covered by automated tests. `tsc --noEmit` is clean for the
whole module; manual verification against real Google/GitHub apps and
restest/vitest coverage (mocking `exchangeCode`/`fetchProfile` per
provider, the same way the 2FA suite mocks TOTP) are still needed
before this ships to production.
