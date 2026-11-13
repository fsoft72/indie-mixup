# USER-NEW.md

Changes made to the `user` module for the `indiegame` module (2026-11-13).

## New call event: `user.call.user.oauth_link`

Returns the OAuth identity of a user for one provider. `indiegame` uses it to read the numeric GitHub id of the person who publishes a game, so it can check that the repo belongs to them.

- **Module JSON:** `work/modules/user.json`, new event `evt.igm00001.oal1` named `user.call.user.oauth_link`.
- **Generated:** `liwe3/modules/user/backend/src/events.ts` now exports `USER_CALL_USER_OAUTH_LINK` (output of `flow2code`).
- **Listener:** `liwe3/modules/user/backend/src/listeners.ts` registers the handler.
  - Payload: `{ id_user : string, provider : string, domain? : string }`. The domain defaults to the caller domain, then `_`.
  - Success: `{ id_user, provider, provider_user_id }`. The email stored in the link is never returned.
  - Errors: `400` (`ERROR_NO_USER_IDENTIFIER`, `ERROR_NO_PROVIDER`) when a field is missing, `404` (`ERROR_OAUTH_LINK_NOT_FOUND`) when the user has no link for the provider.
- **Tests:** `liwe3/modules/user/backend/tests/user-oauth-link-event.test.ts` (3 tests). The whole `user` suite passes (195 tests).

## New endpoint: `user_oauth_provider_enable` (2026-11-13)

Enables or disables an OAuth provider without touching its credentials. The secret is never returned by the API, so `user_oauth_provider_add` could not be used to flip the flag.

- **Module JSON:** `work/modules/user.json`, new endpoint `endp.mt1oauth.en4b`, `POST /user/oauth/provider/enable`, permission `user.oauth.manage`.
- **Generated:** `methods/user-oauth-provider-enable.ts`, route in `index.ts`, export in `methods/index.ts`, action `user_oauth_provider_enable` in the frontend `actions.ts` (output of `flow2code`).
- **Logic:** inside the `f2c` block of `user-oauth-provider-enable.ts`. Params `{ id : string, enabled : boolean }`. The provider is looked up in the caller domain: `404` (`OAUTH_PROVIDER_NOT_FOUND`) if missing. Returns the provider with `client_secret` set to `null`.
- **Tests:** `liwe3/modules/user/backend/tests/user-oauth-provider-enable.test.ts` (4 tests). The whole `user` suite passes (199 tests).
- **Frontend:** new component `OAuthProvidersAdmin` (list, add / edit credentials, enable / disable, delete), exported from `@frontend-modules/user` and used by the app page `/admin/providers`.

## Fix needed after regenerating `user`

`flow2code` now adds `isNull` to the generated import of `./utils`. `liwe3/modules/user/backend/src/methods/user-email-resend.ts` imported `isNull` by hand inside its `f2c` header block, which made the file fail to compile (`Identifier isNull has already been declared`). The duplicate was removed from the `f2c` block: `import { email_normalize } from './utils';`.

## What did not change

- No new permissions or tables in `user` (the only new endpoint is `user_oauth_provider_enable`, described above).
- The GitHub login still asks only for `read:user user:email` and does not store the access token.
- The regeneration of `user` rewrote the generated files from the current template. The repository had no commits at that point, so there was no baseline to diff against: review the first commit of `liwe3/modules/user` if you want to check for other template drift.
