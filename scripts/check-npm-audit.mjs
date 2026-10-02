#!/usr/bin/env node
/**
 * Runs `npm audit --omit=dev --audit-level=high` but allows a small,
 * explicitly dated allowlist of advisory IDs to pass through instead of
 * failing the build — used only for a finding that's confirmed:
 *   (a) real (not a false positive),
 *   (b) dev/build-tooling only, never shipped in the app bundle, and
 *   (c) has no upstream fix available yet.
 *
 * This is NOT a permanent suppression. Every entry has an `expires` date;
 * once that date passes, this script fails loudly on that entry regardless
 * of whether it's still "just" the allowlisted finding, forcing a human to
 * either renew the allowlist (re-confirming (a)-(c) still hold) or drop it
 * because upstream finally shipped a fix. See README's "Known issues" for
 * the full story on the >high-severity moderate findings this doesn't
 * touch at all (those stay below --audit-level=high and are unaffected by
 * this script).
 *
 * Usage: node scripts/check-npm-audit.mjs
 * Exit 0: no findings at/above --audit-level, or every one is allowlisted
 *         and not expired.
 * Exit 1: a real, non-allowlisted high/critical finding, or an allowlist
 *         entry past its expiry date.
 */

import { execFileSync } from "node:child_process";

/** @type {{ id: string, package: string, expires: string, reason: string }[]} */
const ALLOWLIST = [
  {
    id: "GHSA-86w9-cpqp-85rv",
    package: "node-forge",
    expires: "2026-11-15",
    reason:
      "RSA PKCS#1 v1.5 signature-verification bypass in node-forge, " +
      "reached only transitively through expo's own bundled @expo/cli " +
      "build tooling (expo -> @expo/cli -> @expo/code-signing-certificates " +
      "-> node-forge). Dev/build-time only — never ships in the app " +
      "bundle a device runs. No patched node-forge release exists yet " +
      "(confirmed ecosystem-wide, multiple unrelated projects hit the " +
      "same advisory at the same time); `npm audit fix --force` only " +
      "\"fixes\" this by downgrading expo to 44.0.6, a real regression. " +
      "Re-check before the expiry date: renew if still unfixed upstream, " +
      "drop this entry the moment a real fix ships.",
  },
];

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function runAudit() {
  try {
    const out = execFileSync(
      "npm",
      ["audit", "--omit=dev", "--audit-level=high", "--json"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    return JSON.parse(out);
  } catch (err) {
    // npm audit exits non-zero when it finds anything at/above
    // --audit-level, but still writes the JSON report to stdout.
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch (parseErr) {
        console.error("Could not parse npm audit JSON output:");
        console.error(err.stdout);
        throw parseErr;
      }
    }
    throw err;
  }
}

function adviceUrlsFor(vuln) {
  const urls = [];
  for (const via of vuln.via ?? []) {
    if (via && typeof via === "object" && typeof via.url === "string") {
      urls.push(via.url);
    }
  }
  return urls;
}

function main() {
  const today = todayUtc();
  const expired = ALLOWLIST.filter((entry) => entry.expires < today);
  if (expired.length > 0) {
    console.error(
      "npm-audit allowlist has expired entries that must be re-reviewed " +
        "before this check can pass:",
    );
    for (const entry of expired) {
      console.error(`  - ${entry.id} (${entry.package}), expired ${entry.expires}`);
    }
    console.error(
      "\nRe-run `npm audit --omit=dev --audit-level=high` for real and " +
        "either renew the expiry date in scripts/check-npm-audit.mjs (if " +
        "still unfixed upstream) or remove the entry (if a fix shipped).",
    );
    process.exit(1);
  }

  const report = runAudit();
  const vulnerabilities = Object.values(report.vulnerabilities ?? {});
  const atOrAboveHigh = vulnerabilities.filter((v) =>
    v.severity === "high" || v.severity === "critical",
  );

  if (atOrAboveHigh.length === 0) {
    console.log("npm audit: no high/critical findings. Clean.");
    process.exit(0);
  }

  const allowedIds = new Set(ALLOWLIST.map((e) => e.id));
  const unexplained = [];

  for (const vuln of atOrAboveHigh) {
    const urls = adviceUrlsFor(vuln);
    const isAllowlisted =
      urls.length > 0 &&
      urls.every((url) => [...allowedIds].some((id) => url.includes(id)));
    if (!isAllowlisted) {
      unexplained.push({ name: vuln.name, severity: vuln.severity, urls });
    }
  }

  if (unexplained.length > 0) {
    console.error(
      "npm audit found high/critical findings NOT covered by the " +
        "allowlist in scripts/check-npm-audit.mjs:",
    );
    for (const u of unexplained) {
      console.error(`  - ${u.name} (${u.severity}): ${u.urls.join(", ") || "no advisory URL"}`);
    }
    process.exit(1);
  }

  console.log(
    `npm audit: ${atOrAboveHigh.length} high/critical finding(s), all ` +
      "covered by the dated allowlist (see scripts/check-npm-audit.mjs):",
  );
  for (const vuln of atOrAboveHigh) {
    console.log(`  - ${vuln.name} (${vuln.severity})`);
  }
  process.exit(0);
}

main();
