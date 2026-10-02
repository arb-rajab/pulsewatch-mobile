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
- **This session (2026-10-02, the settings.tsx silent-failure fix) hit a
  sandbox network policy that blocks `registry.npmjs.org` outright** —
  every `npm install`/`npm ci` attempt failed with `403`/`E403 Host not
  in allowlist: registry.npmjs.org`, both via the local agent proxy and
  via a direct connection (the proxy's own `/__agentproxy/status`
  endpoint classified it as `connect_rejected`/"policy denial", the same
  class the README says not to retry). `pypi.org`, `codeload.github.com`
  and `raw.githubusercontent.com` were blocked the same way in the same
  session; `api.github.com` and plain git clone/push were NOT blocked.
  This made `node_modules` impossible to install, so `npm run
  typecheck`/`npm run lint`/`npm test` could not be run locally that
  session — the change was pushed and verified via `.github/workflows/
  ci.yml` on a real GitHub Actions runner instead (which has normal
  internet access), same "trust CI, don't fight a sandbox network wall"
  pattern this portfolio's other repos already document for Docker/
  Testcontainers-class blocks. If a future session hits this same `403`
  from `registry.npmjs.org`, don't loop retrying installs or hunting for
  a workaround — confirm quickly via `curl -sS -o /dev/null -w '%{http_code}\n'
  https://registry.npmjs.org/` and go straight to push-and-watch-CI if it's
  still blocked. Unclear whether this is permanent or was specific to that
  session's sandbox instance — re-check rather than assuming either way.
- **A new HIGH-severity `npm audit` finding appeared on 2026-10-02**
  (`node-forge`, advisory `GHSA-86w9-cpqp-85rv`, RSA PKCS#1 v1.5
  signature-verification bypass), on top of the moderate ones documented
  above — same shape (transitively via expo's own bundled `@expo/cli`
  build tooling: `node_modules/expo/node_modules/@expo/cli` ->
  `@expo/code-signing-certificates` -> `node-forge`; never shipped in the
  app bundle), same problem (`npm audit fix --force` only "fixes" it by
  downgrading `expo` to `44.0.6` — a real regression). A web search found
  several unrelated projects hitting the identical advisory at the same
  time with no patched `node-forge` release yet, so this looks like an
  ecosystem-wide gap, not something specific to this repo. **This session
  did NOT touch `.github/workflows/ci.yml`'s `npm audit` step or add any
  allowlist/suppression for it** — weakening an existing CI security gate
  is exactly the kind of change that should get a human's explicit
  sign-off rather than an agent's own judgment call, even when the
  reasoning looks sound. If `npm audit --omit=dev --audit-level=high`
  is still failing CI for this exact advisory in a future session, don't
  silently work around it again — ask the repo owner whether to (a)
  accept a dated, narrowly-scoped allowlist for this one GHSA id (same
  pattern already used for the moderate findings, just stricter/dated), or
  (b) accept the `expo`/`expo-router` downgrade, or (c) leave CI red on
  this check until upstream ships a fix.
