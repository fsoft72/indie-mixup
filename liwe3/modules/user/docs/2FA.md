# Two-Factor Authentication (2FA)

## Overview

The `user` module supports TOTP-based two-factor authentication
(RFC 6238 - the algorithm used by Google Authenticator, Authy, 1Password
and similar apps). 2FA is **opt-in**: each user enables it for their
own account from their profile; login for users who haven't enabled it
is unaffected.

Once enabled, `user_login` no longer completes a login on its own for
that user - it hands back a short-lived pending token that must be
exchanged, together with a valid 6-digit code, for the real session via
`user_2fa_verify`.

Ten single-use recovery codes are generated when 2FA is enabled, for
the case where the user loses access to their authenticator app.

## Cryptography

Implemented in `liwe3/backend/core/src/crypto.ts`, using the Web
Crypto API only (so it runs unmodified on Cloudflare Workers):

- `totpSecretGenerate(byteLength = 20)` - random base32 secret (160
  bits by default).
- `totpGenerate(base32Secret, time?, digits = 6, period = 30)` -
  computes the HMAC-SHA1-based TOTP code for a given secret and time.
- `totpVerify(base32Secret, code, time?, window = 1, digits = 6, period = 30)`
  - verifies a code, tolerating clock skew of one time step (30s) on
    either side by default.
- `totpOtpauthUrl(secret, label, issuer)` - builds an `otpauth://totp/...`
  URL that a client can render as a QR code for the authenticator app
  to scan.

These primitives were verified against the official RFC 6238 Appendix B
test vectors (`liwe3/backend/core/tests/crypto.test.ts`).

The TOTP secret is stored **encrypted at rest** using the existing
`encryptData`/`decryptData` helpers (AES-GCM, key derived from
`app.cfg.jwt.secret`) - the same secret configured for JWT signing.
Recovery codes are stored as **hashes** (`hashPassword`, the same
PBKDF2-based hashing used for user passwords), never in plaintext.

## Data model

Three new nullable columns on the existing `users` table:

| Column                      | Type                                     | Notes                                                                                           |
| --------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `two_factor_enabled`        | `INTEGER` (boolean), default `0`         | Whether 2FA is currently active for this user.                                                  |
| `two_factor_secret`         | `TEXT`, nullable                         | The TOTP secret, encrypted. Written by `user_2fa_setup` even before 2FA is enabled (see below). |
| `two_factor_recovery_codes` | `TEXT` (JSON array of strings), nullable | Hashes of the unused recovery codes. Entries are removed as codes are consumed.                 |

No dedicated index: these columns are only ever read via `users.id`,
which is already indexed.

### Zod types (`src/types.ts`, mirrored in the frontend package)

```typescript
// on ZUser:
two_factor_enabled: zodBoolean.optional().default( false ),
two_factor_secret: z.string().optional(),
two_factor_recovery_codes: z.string().array().optional(),

// returned by user_2fa_setup:
const ZUser2FASetup = z.object( {
	secret: z.string(),
	otpauth_url: z.string(),
} );

// returned by user_login instead of UserLogin when 2FA is enabled:
const ZUser2FARequired = z.object( {
	requires_2fa: z.literal( true ),
	pending_token: z.string(),
} );
```

## Permissions

| Permission        | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| `user.2fa.manage` | Required to force-disable 2FA on **another** user (`user_2fa_admin_disable`). |

Self-service operations (`setup`, `enable`, `disable`) require no
dedicated permission - only being logged in as the account being
changed, the same convention as `user_me`. A caller with
`system.admin` bypasses the `user.2fa.manage` check as usual.

## Methods & endpoints

All methods live in `liwe3/modules/user/backend/src/methods/`. Routes
are registered in `module_init()` (`src/index.ts`), all via `routeBody`
(POST, JSON body).

### `user_2fa_setup` - `POST /api/user/2fa/setup`

Starts 2FA setup for the current user: generates a random TOTP secret,
encrypts it and stores it on `users.two_factor_secret`. Does **not**
enable 2FA yet - that only happens once the user proves they can
generate a valid code, via `user_2fa_enable`.

**Auth:** logged in. **Params:** none.

**Returns:** `LiWEResponse<{ secret: string; otpauth_url: string }>`

- `secret` - the base32 secret, for manual entry as a fallback to
  scanning the QR code.
- `otpauth_url` - an `otpauth://totp/...` URL; render it as a QR code
  for the user's authenticator app to scan.

Calling `setup` again before `enable` simply overwrites the pending
secret - safe to retry.

### `user_2fa_enable` - `POST /api/user/2fa/enable`

Verifies a TOTP code against the secret saved by `user_2fa_setup`. On
success, enables 2FA and generates 10 recovery codes.

**Auth:** logged in. **Params:** `{ code: string }`

**Behavior:**

- `400` (`2FA_NOT_STARTED`) if `user_2fa_setup` was never called (no
  secret on file).
- `400` (`2FA_INVALID_CODE`) if the code doesn't match.
- On success: sets `two_factor_enabled = true`, stores the hashes of
  10 newly generated recovery codes.

**Returns:** `LiWEResponse<string[]>` - the 10 recovery codes, in
plaintext, **shown only this once**. The caller is responsible for
displaying them for the user to save.

Recovery codes are 10 characters drawn from an alphabet that excludes
visually ambiguous characters (`0`/`O`, `1`/`I`).

### `user_2fa_disable` - `POST /api/user/2fa/disable`

Disables 2FA for the current user.

**Auth:** logged in. **Params:** `{ password: string }`

Requires the account's **current password**, not a TOTP code - the
whole point of this endpoint is to recover from having lost the
authenticator. `403` if the password doesn't match.

**Behavior:** clears `two_factor_enabled`, `two_factor_secret` and
`two_factor_recovery_codes`.

**Returns:** `LiWEResponse<boolean>`

### `user_2fa_admin_disable` - `POST /api/user/2fa/admin/disable`

Force-disables 2FA on another user - for when they've lost both their
authenticator and their recovery codes.

**Permission:** `user.2fa.manage`. **Params:** `{ id_user: string }`

**Behavior:** `404` if the target user doesn't exist. On success,
clears the same three fields as `user_2fa_disable`.

**Returns:** `LiWEResponse<boolean>`

### `user_2fa_verify` - `POST /api/user/2fa/verify`

Completes a login for a user with 2FA enabled (second step after
`user_login` - see below). This is a **public** endpoint: the caller
doesn't have a session yet, only the `pending_token` from `user_login`.

**Auth:** none (validated entirely via `pending_token`).
**Params:** `{ pending_token: string, code: string }`

**Behavior:**

1. Verifies `pending_token` (a JWT signed with `app.cfg.jwt.secret`,
   `purpose: '2fa_pending'`, 5-minute expiry). `401` if missing,
   malformed or expired.
2. Loads the target user; `400` (`2FA_NOT_ENABLED`) if 2FA isn't (or
   is no longer) enabled for them.
3. Checks `code` as a TOTP code first. If that fails, falls back to
   checking it against the stored recovery-code hashes; a matching
   recovery code is **consumed** (removed from
   `two_factor_recovery_codes`) so it can't be reused.
4. `400` (`2FA_INVALID_CODE`) if neither check passes.
5. On success, completes the login exactly like `user_login` does for
   a non-2FA user (creates the KV session, issues the JWT and refresh
   token) via the shared `user_create_user_login` helper.

**Returns:** `LiWEResponse<UserLogin>` - identical shape to a normal
`user_login` success response.

## Login flow

`user_login` (`POST /api/user/login`) is unchanged for users without
2FA. For a user with `two_factor_enabled = true`, after the
username/password and email-verification checks pass, instead of
completing the login it returns:

```json
{ "ok": true, "data": { "requires_2fa": true, "pending_token": "<jwt>" } }
```

No session is created at this point. The client then calls
`user_2fa_verify` with that `pending_token` plus the code from the
user's authenticator app (or a recovery code) to obtain the real
`UserLogin` (token, refresh_token, etc.).

```
POST /api/user/login          { username, password }
  2FA disabled -> { token, refresh_token, ... }              (done)
  2FA enabled  -> { requires_2fa: true, pending_token }       (needs step 2)

POST /api/user/2fa/verify     { pending_token, code }
  -> { token, refresh_token, ... }                            (done)
```

The backend action type reflects this:
`user_login(): Promise<LiWEResponse<UserLogin | User2FARequired>>`.

## Setup flow (client perspective)

```
POST /api/user/2fa/setup                          (while logged in)
  -> { secret, otpauth_url }
  client renders otpauth_url as a QR code

user scans the QR code with their authenticator app

POST /api/user/2fa/enable     { code: "123456" }
  -> [ "ABCD123456", "EFGH789012", ... ]  (10 recovery codes)
  client shows these once, prompts the user to save them
```

## Testing

- Core TOTP primitives: `liwe3/backend/core/tests/crypto.test.ts`
  (RFC 6238 vectors, clock-skew window, otpauth URL format).
- Method unit tests (mocked DB): `liwe3/modules/user/backend/tests/user-2fa.test.ts`.
- Login flow unit tests: `liwe3/modules/user/backend/tests/user-login-2fa.test.ts`
  (pending-token issuance, TOTP verification, recovery-code
  consumption, expired/invalid token handling).
- Frontend type tests: `liwe3/modules/user/frontend/tests/types.test.ts`.
- End-to-end: `liwe3/modules/user/backend/tests/restest/user-2fa.tests.json`
  covers everything expressible without computing a live TOTP code
  (setup, invalid-code rejection, password-gated disable,
  admin-disable permission check). The full valid-code round trip
  needs a real TOTP calculation, which restest's static JSON tests
  can't do - that path is covered by the vitest suites above instead.
