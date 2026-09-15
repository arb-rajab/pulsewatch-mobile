@AGENTS.md

## Session continuity notes (quota-reduction — repo-specific, not generic advice)

- **No conventional `main` existed until the 2026-09-15 merge-finishing
  session.** This repo was created empty; the rebuild session pushed the
  entire app straight to `claude/pulsewatch-mobile-rebuild-wab4mn`, which
  GitHub then made the *default branch* by default (there was no `main`
  to default to). CI's `push`/`pull_request` triggers target `main`, so
  **no workflow ever ran** until a `main` branch was created at the same
  commit. `main` and the rebuild branch are now identical (0 commits
  apart) — there is no PR to open between them, and GitHub will refuse
  one ("No commits between main and ..."). The repo's *default branch
  setting* itself is still `claude/pulsewatch-mobile-rebuild-wab4mn` —
  no tool available to any session so far exposes changing that (GitHub
  Settings → Branches, or the REST `PATCH /repos/{owner}/{repo}` API
  with `default_branch`); a session with that capability should switch
  it to `main`. Until then, don't re-diagnose this as a fresh problem —
  it's this same known gap.
- **Dependabot alerts and CodeQL code-scanning alerts are not
  enumerable by any MCP tool available in this environment**, and the
  `gh` CLI is not available either. Don't ask a future session to
  "check and resolve Dependabot/CodeQL alerts" expecting a verified
  yes/no — the honest answer will always be "unverifiable via tooling
  here." Either have a human check the repo's Security tab directly, or
  accept the search-for-`dependabot/*`-PRs proxy (weak signal: absence
  of an open Dependabot PR is not proof of no alerts).
- **`npm audit --omit=dev` will always report ~13 moderate-severity
  findings** in `expo`/`expo-router`'s own build tooling
  (`@expo/config-plugins`, `xcode`, transitively `decode-uri-component`/
  `uuid`) with no non-breaking fix available (`npm audit fix --force`
  only "fixes" it by downgrading `expo-router` to `5.1.11`/`expo` to
  `46.0.21` — a real regression, not acceptable). This is why CI scopes
  the audit step to `--audit-level=high`. Seeing the moderate list again
  on a fresh `npm audit --omit=dev` is not a new regression — see
  README's "Known issues".
- **`npm install`/`npm ci` needs `--legacy-peer-deps`** throughout this
  SDK 57 tree (expo-router's optional peer on `react-native-worklets`/
  `react-dom` conflicts under npm's default resolver). Already reflected
  in `.github/workflows/ci.yml`. Running plain `npm install` locally
  without the flag produces an ERESOLVE error that looks like a real
  break but isn't — it's this same known peer-dep shape.
