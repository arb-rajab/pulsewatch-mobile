# Dependabot status

_Last updated: 2026-10-08. Maintained during the Dependabot clean-up pass; update when the state changes._

## Configuration

- Ecosystems covered: npm (`/`, the Expo app), github-actions (`/`).
- Grouping: `minor-and-patch` for both ecosystems (open-PR limit 5 each).
- Schedule: weekly.
- Ignore rules: `expo`/`expo-*` majors (move with the SDK, currently 57); `react`, `react-native`, `@types/react`, `@react-native/*` majors and minors (chosen by the Expo SDK); `typescript` and `eslint` majors (the eslint-config-expo toolchain does not load under TS 7 / ESLint 10).

## State at last update

- Open Dependabot PRs: 0 (each merged or closed only after reading its checks).
- Default-branch CI: green at last check.
- Last full rescan: 2026-10-08. Checked open PRs, default-branch and scheduled CI, Dependabot update jobs, ecosystem coverage against the manifests in the repo, Actions pins, exemption expiry dates, stray branches, and (new this pass) a local full-history gitleaks 8.28.0 scan. No new gaps. The repo's default branch is now `main` and the old rebuild branch is gone (corrected in Notes).

## Time-limited exemptions

- `scripts/check-npm-audit.mjs` allowlist: `node-forge` (GHSA-86w9-cpqp-85rv) and `braces` (GHSA-vfj7-8cjw-p6xm), both transitive via Expo build tooling, `expires` 2026-11-15; the check fails outright after that date.

## Notes

- `npm install`/`npm ci` need `--legacy-peer-deps` for this SDK 57 tree.
- The repo's default branch is `main` (checked through the API on 2026-10-08), and `claude/pulsewatch-mobile-rebuild-wab4mn` no longer exists. The older note about switching it is resolved.
- Every workflow declares a top-level `permissions: contents: read` (added 2026-10-08, rescan cycle 3). Jobs that need more, such as CodeQL's `security-events: write`, declare it at job level.
- Merge policy (deliberate choice by the repo owner, 2026-10-08): every PR, major-version dependency bumps included, is merged as soon as all of its required checks are green, confirmed per PR. This repo is a code showcase with no business or sensitive dependency, so green checks are the only gate. Red, pending or conflicted PRs are fixed or closed instead.

## Deferred (not re-raised each pass)

- Ignored major versions are listed in `.github/dependabot.yml` with the reason for each.
- Re-check exemptions before their `effectiveUntil` date (2026-11-15) and drop them once upstream fixes ship.
- Dependabot/code-scanning alert API (2026-10-08): not readable. The proxy-injected `GH_ALERTS_TOKEN` is sent, but `GET /repos/arb-rajab/*/dependabot/alerts` and `/code-scanning/alerts` return 403 "Resource not accessible by integration" on all 12 repos; the token lacks the `vulnerability_alerts` / `security_events` read permissions. Alert state remains unverified.
