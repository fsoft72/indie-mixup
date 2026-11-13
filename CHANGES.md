# CHANGES

## 2026-11-13

### indiegame module (catalog, remixes, reports, rankings)

- New module definition `work/modules/indiegame.json` (17 endpoints, 12 types, permission `indiegame.moderate`, 3 events) and generated scaffolding in `liwe3/modules/indiegame/{backend,frontend}`.
- Generated method functions: `indiegame_list`, `indiegame_get`, `indiegame_track`, `indiegame_ranking_games`, `indiegame_ranking_developers`, `indiegame_developer_get`, `indiegame_add`, `indiegame_del`, `indiegame_mine`, `indiegame_report`, `indiegame_remix_report`, `indiegame_remix_inbox`, `indiegame_remix_answer`, `indiegame_admin_reports`, `indiegame_admin_hide`, `indiegame_admin_remix_decide`, `indiegame_admin_report_close`.
- Module wired into `app/backend/src/index.ts` (after `tags`) and into `app/backend/package.json`, `app/frontend/package.json`, `tsconfig.backend.json` via `work/scripts/sync_modules.py --frontend`.
- Logic of all 17 endpoints, in `liwe3/modules/indiegame/backend/src/lib/` (called from the `f2c` blocks of the methods):
  - `repo.ts`, `time.ts`, `visitor.ts`, `lineage.ts`: repo url parsing, UTC windows (`all`, `30d`, `7d`, `1d`), anonymous visitor hash and deterministic ids, remix chain and cycle check.
  - `github.ts`: a game repo must be a public personal repo of the publisher (GitHub numeric owner id equals the id linked to the login). Organization repos are not accepted. Optional `GITHUB_API_TOKEN` secret raises the GitHub rate limit.
  - `games.ts`, `game-add.ts`: catalog, game page (ancestors and direct remixes), create, edit, soft delete.
  - `track.ts`: one view or download per visitor, game, kind and UTC day. Visitor = cookie `ig_vid`, else IP hash. Salt = `VISITOR_SALT`, else `SITE_SECRET`.
  - `ranking.ts`: four rankings with four windows, KV cache of 5 minutes, developer profile.
  - `remix.ts`: "Is this a remix of your game?" reports, answer of the owner, decision of a moderator, notification through `notifier.call.create`.
  - `moderation.ts`: "Report" button, moderation queue, hide or show a game (purges the cached rankings), close a report.
- 104 Vitest tests in `liwe3/modules/indiegame/backend/tests/` run on a real in-memory SQLite database.

### user module

- New call event `user.call.user.oauth_link` (listener in `listeners.ts`, 3 tests). Details in `USER-NEW.md`.
- Removed a duplicate `isNull` import in `methods/user-email-resend.ts` (template drift after regeneration).

### Frontend and app wiring

- `@frontend-modules/indiegame`: `GameCard`, `GameGrid`, `LineageBar`, `RankingTable`, `ReportBox`, `RemixReportBox`, `RemixInbox`, `AdminQueue`, texts in `texts.ts` (ready to translate) and helpers in `utils.ts`.
- App routes in `app/frontend/src/routes`: catalog `/`, `/games/[id]`, `/rankings`, `/developers/[id]`, `/login` (GitHub), `/login/callback`, `/submit`, `/my-games`, `/admin`. The form of `/submit` and `/my-games` is `app/frontend/src/lib/GameForm.svelte` (`FormCreator` + `Upload`).
- `app/frontend/src/routes/+layout.svelte` sets the API base url from `PUBLIC_LIWE_SERVER` and registers the `text`, `textarea` and `checkbox` field types.
- `app/backend/src/index.ts` now registers the `upload` (screenshots and gallery) and `notifier` (remix report notifications) modules too.
- `system.admin` counts as a moderator (it already passes the route gate).
- To log in with GitHub an admin must add the `github` OAuth provider (`POST /api/user/oauth/provider/add`).

### Review fixes

- Author names never fall back to the username when it is an email (GitHub accounts without a profile name show `Developer`).
- Cookie forging: one IP can add at most 10 distinct visitors per game, kind and UTC day (KV counter, only when the IP is known).
- Deleting a game frees its repo id, so the same repo can be published again.
- Moderators now also see and decide remix reports the owner never answered (`pending`), and a moderator decision overrides a link the owner declared meanwhile.
- The moderation queue lists the hidden games (`hidden_games` in `IndieAdminReports`, new field in `work/modules/indiegame.json`) and the admin page can show them again.
- Screenshots and gallery accept only files of the upload module (`/api/upload/get?key=...`), never external urls.
- Counters of a page of games are read in chunks of 50 ids (D1 allows 100 bound parameters per query).
