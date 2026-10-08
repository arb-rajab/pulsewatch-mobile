@AGENTS.md

## Session continuity notes (quota-reduction — repo-specific, not generic advice)

- **The default branch is `main` (resolved; checked 2026-10-08).** The
  repo started with the whole app on `claude/pulsewatch-mobile-rebuild-wab4mn`,
  which GitHub made the default branch, so CI (which targets `main`) never
  ran until `main` was created at the same commit. The default branch has
  since been switched to `main` and the rebuild branch deleted. Nothing
  left to do here; don't re-diagnose it.
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
  the audit to `--audit-level=high` (now via `scripts/check-npm-audit.mjs`,
  see the node-forge note below). Seeing the moderate list again
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
  ecosystem-wide gap, not something specific to this repo. **Resolution:
  a dated, narrowly-scoped allowlist for this one GHSA id.** The CI
  `npm audit` step now runs `node scripts/check-npm-audit.mjs` instead of
  plain `npm audit --omit=dev --audit-level=high` (commit `919450b`,
  merged to `main` with PR #3 at the repo owner's request). The script
  still fails on any other high/critical leaf advisory; only
  `GHSA-86w9-cpqp-85rv` passes, and only until **2026-11-15**, after which
  the check fails outright. When it does: re-check whether `node-forge`
  (or `@expo/code-signing-certificates`) has shipped a fix — if so, drop
  the entry; if not, ask the repo owner before pushing the expiry out.
  Don't widen the allowlist to any other advisory without the owner's
  explicit sign-off — loosening this gate is their call, not an agent's.
- **`npm test`'s "test" CI step is genuinely flaky** (confirmed 2026-10-02
  by capturing the actual failing step's own output, not a fresh re-run —
  a re-run alone can pass even when the original run flaked, which is
  misleading). Across ~6 CI runs on one branch with no source changes in
  between, it failed twice: both times
  `SettingsScreen › shows the signed-in operator email and their devices`
  (a pre-existing test, not a new one) threw `Exceeded timeout of 5000 ms
  for a test` — Jest's default per-test timeout, under whatever CPU
  contention that run's runner happened to have (this suite's default
  jest config runs test files in parallel workers, not `--runInBand`).
  Re-running the same commit's failed jobs (no code change) passed
  cleanly. If `npm test` fails in CI on an unrelated, unmodified test with
  this exact "Exceeded timeout of 5000 ms" message, don't treat it as a
  real regression from whatever change is in the PR — re-run the job
  first. PR #3 raised Jest's default `testTimeout` to 10000 in
  `jest.config.js` for this; if timeouts still recur, the next step is
  adding `--runInBand` to the `test` script, not chasing it as a logic bug.
