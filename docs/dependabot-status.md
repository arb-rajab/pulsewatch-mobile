# Dependabot status

_Last updated: 2026-10-09. Maintained during the Dependabot clean-up pass; update when the state changes._

## Configuration

- Ecosystems covered: npm (`/`, the Expo app), github-actions (`/`).
- Grouping: `minor-and-patch` for both ecosystems (open-PR limit 5 each).
- Schedule: weekly.
- Ignore rules: `expo`/`expo-*` majors (move with the SDK, currently 57); `react`, `react-native`, `@types/react`, `@react-native/*` majors and minors (chosen by the Expo SDK); `typescript` and `eslint` majors (the eslint-config-expo toolchain does not load under TS 7 / ESLint 10).

## State at last update

- Open Dependabot PRs: 0 (each merged or closed only after reading its checks; #27 closed 2026-10-09, see Notes).
- Default-branch CI: green at last check.
- Last full rescan: 2026-10-09. Checked open PRs (none), default-branch and scheduled CI, Dependabot update jobs, ecosystem coverage (no new manifests since 2026-10-08), Actions pins, exemption expiry dates and stray branches, plus three new dimensions: branch-protection required contexts against the check runs a PR actually produces, the repo's `security_and_analysis` settings, and check-run annotations on `main`. No required context is stale. The annotations showed `ubuntu-latest` moving to Ubuntu 26 from 2026-10-19, so every job is now pinned to `ubuntu-24.04` (see Notes). The full-history gitleaks scan was not repeated: the only commits since 2026-10-08 are docs and CI changes, each scanned by the push-run gitleaks job. Rescan cycle 2 (same day, after those pins merged) repeated every dimension and added one: each repo's `SECURITY.md` and whether GitHub private vulnerability reporting is enabled.

## Time-limited exemptions

- `scripts/check-npm-audit.mjs` allowlist: `node-forge` (GHSA-86w9-cpqp-85rv) and `braces` (GHSA-vfj7-8cjw-p6xm), both transitive via Expo build tooling, `expires` 2026-11-15; the check fails outright after that date.

## Notes

- `npm install`/`npm ci` need `--legacy-peer-deps` for this SDK 57 tree.
- The repo's default branch is `main` (checked through the API on 2026-10-08), and `claude/pulsewatch-mobile-rebuild-wab4mn` no longer exists. The older note about switching it is resolved.
- Every workflow declares a top-level `permissions: contents: read` (added 2026-10-08, rescan cycle 3). Jobs that need more, such as CodeQL's `security-events: write`, declare it at job level.
- Merge policy (deliberate choice by the repo owner, 2026-10-08): every PR, major-version dependency bumps included, is merged as soon as all of its required checks are green, confirmed per PR. This repo is a code showcase with no business or sensitive dependency, so green checks are the only gate. Red, pending or conflicted PRs are fixed or closed instead.
- Every Linux job runs on `ubuntu-24.04` (pinned 2026-10-09; it is what `ubuntu-latest` resolved to). GitHub moves `ubuntu-latest` to Ubuntu 26 from 2026-10-19, and an unattended image change could turn every check red at once. Move to `ubuntu-26.04` deliberately, in one PR whose CI has run on it. Dependabot does not bump `runs-on` labels.
- `SECURITY.md` added 2026-10-09 (rescan cycle 2: the repo had no security policy). It sends reporters to GitHub private vulnerability reporting, which was disabled here; the repo owner changed it through the API on 2026-10-09 and the read-back confirmed it (`enabled: true`).
- CI bundles the app (`npx expo export --platform android --platform ios`, added 2026-10-09). Dependabot security PR #27 moved `expo-router` to 58 (SDK 58) to drop `decode-uri-component`; typecheck, lint, Jest and the audit passed, but the bundle failed (`Unable to resolve module react-native/setup-env`), while `main` bundled cleanly. #27 was closed. The `decode-uri-component` and `uuid` findings clear with the deliberate SDK 58 upgrade; Dependabot's `uuid` security update (2026-10-09) fails because `uuid` 3.4.0 comes from Expo's `xcode` build tooling.

## Deferred (not re-raised each pass)

- Ignored major versions are listed in `.github/dependabot.yml` with the reason for each.
- Re-check exemptions before their `effectiveUntil` date (2026-11-15) and drop them once upstream fixes ship.
- Alerts first read 2026-10-09 with the repo owner's PAT, run on their machine (Claude sessions still get 403: the proxy sends a GitHub App token instead of `GH_ALERTS_TOKEN`, even a PAT passed explicitly): none open. A second read the same day, after Dependabot's security-update jobs ran, found five open Dependabot alerts, all in `package-lock.json` and none in the app's own code:
  - #1 `uuid` 7.0.3 (medium, GHSA-w5hq-g745-h8pq, missing bounds check in v3/v5/v6 with a buffer; fix 11.1.1), via `@expo/config-plugins` → `xcode`. Fixed by `overrides: { xcode: { uuid: ^11.1.1 } }`; `xcode` only calls `uuid.v4()`. The lockfile was regenerated with `npm@11 install --package-lock-only --force`, the only command that changed nothing but the `uuid` entry.
  - #2 `decode-uri-component` 0.2.2 (medium, GHSA-vcc3-ghjq-m6fr, DoS on malformed percent-encoding; fix 0.5.0), in the app bundle via `expo-router` 57 → `query-string` 7. 0.5.0 is ESM-only with a default export and `query-string` 7 `require()`s it and calls the result, so an override breaks query parsing. It clears with the deliberate SDK 58 upgrade (see #27). Dismissal as tolerable risk requested.
  - #3 `node-forge` 1.4.0 and #4 `braces` 3.0.3 (high, no patched release): Expo CLI / Metro / Jest tooling, already allowlisted in `scripts/check-npm-audit.mjs` until 2026-11-15. Dismissal as tolerable risk requested, to match.
  - #5 `sprintf-js` 1.0.3 (medium, no patched release): Jest's coverage toolchain only. Dismissal as tolerable risk requested.
