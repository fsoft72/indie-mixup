# Password expiry and forced password change

## Overview

A user can be forced to choose a new password before getting a session.
There are two triggers:

| Reason | Trigger                                                                  |
| ------ | ------------------------------------------------------------------------ |
| `flag` | An admin sets `password_expired = true` on the user                      |
| `age`  | the max age is > 0 and the password is older than that limit (see below) |

`flag` wins when both apply.

## Configuration

In the app `config.json`:

```json
{
	"user": {
		"passwordMaxAgeDays": 90
	}
}
```

- `0`, a missing `user` section, a negative or a non numeric value: the automatic expiry is **off**.
- This is the **default for everybody**. Each user can override it (next section). The flag is per user.
- Edit the `config.json` of the app (`app/backend/config.json`, `playground/backend/config.json`) and restart / redeploy.

### Per user max age

`users.password_max_age_days` wins over the global value:

| On the user | Effect                                            |
| ----------- | ------------------------------------------------- |
| `null`      | the global `passwordMaxAgeDays` applies (default) |
| `0`         | this user never expires, even if the global is on |
| `N > 0`     | this user expires after N days                    |

It is set with `POST /api/user/set/password_max_age` `{ id, days }`. A **missing** `days`, or
`days: null`, clears it (back to `null`, the global default). `0` is a real value: never expires.
Integers from 0 to 3650, otherwise 400 `INVALID_PASSWORD_MAX_AGE`. (The generated schema coerces
`null` to 0; the method reads the raw value to avoid that.) Gate
`user.password`, same multi-tenant rules as `set/password`.

- The age is computed at login time from `users.password_changed_at` (unix ms). Nothing runs in
  the background and nothing is written until the user changes the password.
- A user whose `password_changed_at` is `null` (created before the column existed) never expires by
  age. The date is recorded the first time the password is changed (`user_set_password`,
  `user_password_change_expired`) or when the user is created (`user_add`, `user_create_admin`).
  Turning the feature on therefore never locks out existing users all at once.

## Login flow

```
POST /api/user/login  { username, password }
  wrong password, disabled, email not verified  -> same errors as always
  2FA enabled                                   -> { requires_2fa, pending_token }
                                                   POST /api/user/2fa/verify { pending_token, code }
  password must be changed                      -> { requires_password_change: true,
                                                     password_change_reason: 'flag' | 'age',
                                                     pending_token }          (NO session, NO token)
  otherwise                                     -> full login

POST /api/user/password/change-expired  { pending_token, password }
  -> full login (token, refresh_token, ...)
```

The check runs **after** the password and the 2FA code are verified, so the pending token is only
handed to someone who already proved who they are. `user_2fa_verify` returns the same
`requires_password_change` answer when the 2FA code is right but the password must be changed.

### `POST /api/user/password/change-expired` (public, rate limited with `RL_AUTH`)

- `pending_token` must have `purpose: 'password_change_pending'` (5 minutes). A `2fa_pending`
  token is rejected: the two are not interchangeable.
- The password must be at least 8 characters (`PASSWORD_TOO_SHORT`) and different from the
  current one (`PASSWORD_UNCHANGED`).
- The token is not single use by itself. Replays are stopped by re-checking that a change is
  still required (`PASSWORD_CHANGE_NOT_REQUIRED`): after the change the reason is gone.
- On success: new hash saved, `password_expired = false`, `password_changed_at = now`,
  `token_version + 1` (sessions opened with the old password on other devices stop working),
  then a normal login is created.

## Admin endpoint

`POST /api/user/set/password_expired` with `{ id, password_expired }`. Gate: `user.password`
(same permission and same multi-tenant rules as `/user/set/password`). Setting the flag does not
close the sessions the user already has: it takes effect at the next login.

## `user_set_password`

It records `password_changed_at`. When the **owner** changes their own password the flag is
cleared. When an admin resets somebody else's password the flag is left as it is: the user must
still choose a password only they know.

## Frontend

`UsersList` has an **Edit** row action (permission `user.password`) that opens `UserEdit.svelte`.
The whole dialog is one `FormCreator`: the "Password expiry (days)" field (0 = never, empty =
default), two read only fields with their own label (last password change, change forced at next
login) and the **Force change password** button, which is a field of `type: 'button'` with an
`onclick` (plugin `FormButton`). It asks for confirmation; when the change is already forced the
button becomes **Cancel forced change**. **Save** is the form submit and saves the days only. Data
goes through `storeUserAdmin.setPasswordMaxAge()` and `setPasswordExpired()`, which also update the
list. An empty field is `undefined` (never `null`, never `''`, never 0) and the request leaves the
`days` key out: see `src/password-max-age.ts` (`parseMaxAgeDays`, `maxAgeParams`).

FormCreator notes learned building it:

- The `button` plugin has to be registered by the app, like `text` and `title`:
  `formCreatorPluginRegister( 'button', FormButton )` (done in `playground/frontend/src/routes/+layout.svelte`).
  Without it the button silently does not render.
- `FormTextInput` forwards only `extra` to the `<input>`: `placeholder`, `disabled`, `type: 'number'`
  go in `extra`. A top level `placeholder` is ignored.
- The `title` type is a big centered heading (`.form-container .title`): fine for sections, not for
  "label: value" lines. A disabled text field shows a label plus a value.
- The theme does not style `:disabled`; `UserEdit` dims those inputs with a scoped rule.

`Login.svelte` has a third step, `change_password`, after `login` and `2fa`. It shows a message
according to the reason, asks for the new password twice and calls
`store.changeExpiredPassword( pending_token, password )`, which saves the session like a normal
login. If the token expired (401) the component goes back to the login step.

## Database

Three columns on `users`: `password_expired` (boolean, default false), `password_changed_at`
(integer, unix ms) and `password_max_age_days` (integer, nullable). For an existing D1 database apply
`playground/backend/drizzle/0006_password_expiry.sql` and `0007_password_max_age.sql`.

`wrangler d1 migrations apply playground-test` cannot be used to catch up the test database:
`/system/admin/test/enter` wipes its `d1_migrations` table, so it would start from `0000` again.
Run the new file with `wrangler d1 execute playground-test --local --file drizzle/0007_password_max_age.sql`,
then restart `wrangler dev`: a worker whose test DB seed failed stays in test mode.
