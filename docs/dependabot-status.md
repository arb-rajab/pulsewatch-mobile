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

## Time-limited exemptions

- `scripts/check-npm-audit.mjs` allowlist: `node-forge` (GHSA-86w9-cpqp-85rv) and `braces` (GHSA-vfj7-8cjw-p6xm), both transitive via Expo build tooling, `expires` 2026-11-15; the check fails outright after that date.

## Notes

- `npm install`/`npm ci` need `--legacy-peer-deps` for this SDK 57 tree.
- The default branch setting of the repo may still point at the old rebuild branch (see CLAUDE.md); that is a repo-settings item for the owner.

## Deferred (not re-raised each pass)

- Ignored major versions are listed in `.github/dependabot.yml` with the reason for each.
- Re-check exemptions before their `effectiveUntil` date (2026-11-15) and drop them once upstream fixes ship.
