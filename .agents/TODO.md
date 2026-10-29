# Fork TODO

Fork-specific, deferred from the `merge/main-into-dev-2026-10-28` sync
(review item 5). Upstream does not touch `.agents/`, so this file will not
conflict on future merges.

## Gate upstream frontend `__tests__/` in CI (deferred)

**Current state (intentional, stable):**
- `.github/workflows/frontend-tests.yml` runs 16 shards with
  `vitest run --shard X/16 --maxWorkers=1 --exclude '**/__tests__/**'`;
  shards 8 and 14 are `continue-on-error` (happy-dom OOM).
- `.github/workflows/ci.yml` `frontend` job is typecheck-only
  (`bun run i18n:check` → `bun run routes:gen` → `bun check -b`); it does
  **not** run `bun run test` (upstream's full suite).

**Why deferred:** the full upstream `__tests__/` suite (184 files) OOMs on
happy-dom cross-file retention (~2GB, config-unfixable in this env), so the
blanket `--exclude '**/__tests__/**'` is the stable workaround that keeps the
gate green. Re-enabling it is not a one-time fix:
- A non-blocking "upstream-tests" job would be perpetually red (some upstream
  tests are inherently fork-incompatible, e.g.
  `web/src/features/system-update/__tests__/update-checking.test.tsx` mocks a
  browser-direct GitHub fetch while the fork uses the `/api/latest-release`
  backend proxy) — not actionable.
- Targeted re-enable (exclude only the failing/incompatible ones, run the rest
  as blocking) requires running all 184 files with `--maxWorkers=1` + sharding
  to find the fail/OOM set, and the set changes as upstream evolves → per-merge
  maintenance.

**Actionable regression net already in place:** fork tests under
`web/src/coverage-tests/` and Go `*_test.go` `coverage_test.go` are NOT
excluded (only `**/__tests__/**` is), so they run in the gating shards and
block. They pass on the fork; a future merge that silently drops a fork
capability turns one of them red (e.g. low-balance reminder, localized email
template, batch-token quota query/audit, update-check RC/Beta detection).

**When revisited, investigate:**
1. Run `bunx vitest run '__tests__/**' --maxWorkers=1` (sharded) to enumerate
   which of the 184 fail (fork-incompatible contracts) vs OOM.
2. Exclude only those; run the rest as blocking shards. Reassess after any
   upstream happy-dom / vitest / component refactor that changes the OOM or
   contract-mismatch set.

## Recurring per-merge CI tweaks (not deferred — inherent, mechanical)

These recur every upstream sync because upstream edits the same workflow
files; they are documented in the `merge-main-to-dev` skill and the
`ci-skip-upstream-failures` memory, not fixable once-and-for-all here:
- Drop `-race` from `.github/workflows/backend-tests.yml` (upstream re-adds
  it; `-race` surfaces 8+ latent races in upstream production code that are
  timing-dependent and never converge).
- Re-add `routes:gen` step to `.github/workflows/ci.yml` before typecheck
  (`routeTree.gen.ts` is gitignored; upstream's ci.yml has no such step).
