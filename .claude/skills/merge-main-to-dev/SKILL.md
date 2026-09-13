---
name: merge-main-to-dev
description: >
  Merge upstream origin/main into the dev branch while preserving all fork-specific
  customizations. Use when the user asks to merge, sync, or update dev from main,
  or mentions "合并", "同步", "merge main", "sync upstream". This is a fork repo —
  origin/main carries upstream releases; dev carries fork customizations that MUST
  survive every merge.
---

# Merge origin/main into dev

This repo is a fork. `origin/main` receives upstream releases. `dev` carries
fork-specific customizations (E2E tests, extra notification channels, batch token
ops, email templates, update checker, image-gen page, etc.). The merge workflow
brings upstream changes into dev **without losing any dev customization**.

## Phase 0 — Pre-flight

1. Read `AGENTS.md` (mandatory per project rules).
2. Confirm the working tree is clean (`git status`). Stash or commit if not.
3. Fetch the latest upstream: `git fetch origin`.
4. Count divergence:

```bash
git log --oneline dev..origin/main | wc -l      # upstream-only commits
git log --oneline origin/main..dev | wc -l      # dev-only commits
```

5. Create the merge branch from dev:

```bash
git checkout -b merge/main-into-dev dev
```

## Phase 1 — Trial merge (dry run)

Run a trial merge to discover conflicts without committing:

```bash
git merge origin/main --no-commit --no-ff
```

List all conflicted files:

```bash
git diff --name-only --diff-filter=U
```

Abort the trial and present the conflict report to the user:

```bash
git merge --abort
```

## Phase 2 — Conflict analysis & report

Classify every conflicted file into one of the categories below and present a
table to the user **before resolving anything**. Include the file path, conflict
cause, and proposed resolution for each file.

### Conflict categories

| Category | Typical files | Resolution strategy |
|---|---|---|
| **CI/Build configs** | `.github/workflows/ci.yml`, `release.yml` | Keep dev's E2E job, `version.sh` script, extra CI steps; adopt main's toolchain versions |
| **Gitignore** | `.gitignore`, `web/.gitignore` | Union of both sides' entries |
| **Project docs** | `AGENTS.md`, `CLAUDE.md` | Keep dev's fork-aware rules (test organization, etc.); append main's new rules |
| **Backend Go — fork features** | See §Dev Customizations below | **Always keep dev's version** when the file is a fork-only feature |
| **Backend Go — shared code** | `controller/relay.go`, `service/quota.go`, etc. | Keep dev's additions (template HTML, extra fields); adopt main's new params and refactors around them |
| **Backend Go tests** | `*_test.go` | Keep both sides' test functions; prefer dev's TestMain |
| **Frontend config** | `package.json`, `bun.lock`, `vitest.config.ts` | Main's newer versions + dev's extra deps; **regenerate bun.lock** (`rm web/bun.lock && cd web && bun install`) |
| **Frontend hooks & lib** | `use-system-config.ts`, `auth-session.ts`, `use-sidebar-*.ts` | Keep dev's enhanced hooks; base on main's refactored structure if main did an architectural rewrite |
| **Frontend feature components** | `model-mutate-drawer.tsx`, `notification-tab.tsx`, `details-dialog.tsx`, `routing-reliability-section.tsx`, `types.ts` | **Most complex.** Keep dev's pricing/vendor/notification enhancements; adopt main's new fields and error handling |
| **Frontend tests** | `*.test.tsx` under `web/src/` | Keep dev tests as primary; add AGPL license header from main if missing; merge unique test scenarios |
| **i18n JSON** | `web/src/i18n/locales/*.json` | JSON key union — keep dev's extra keys, adopt main's new keys; **regenerate sync-report** with `cd web && bun run i18n:sync` |
| **Auto-generated files** | `routeTree.gen.ts`, `bun.lock`, `_sync-report.json` | **Delete and regenerate** — never manually merge |

Wait for user approval of the plan before proceeding.

## Phase 3 — Real merge & conflict resolution

```bash
git merge origin/main --no-commit --no-ff
```

Resolve conflicts **in this order** (simple → complex):

1. `.gitignore` files — union both sides
2. `AGENTS.md` / `CLAUDE.md` — append main's new sections, keep dev's existing rules
3. CI/Build configs — keep dev structure, adopt main's version numbers
4. Backend Go files — one by one, see resolution strategy per file
5. Frontend config (`package.json`) — merge dependency lists, keep dev extras
6. Frontend hooks & lib — carefully merge, keeping dev's enhanced logic
7. Frontend feature components — the hardest; see guidance below
8. Frontend tests — keep dev's test structure, add main's AGPL headers
9. i18n JSON — use a script or manual JSON merge for key union
10. Auto-generated files — skip for now, regenerate in Phase 5

### Resolving frontend feature components (the hard part)

For files like `model-mutate-drawer.tsx` where dev has extensive customizations
(500+ lines of pricing modes, vendor dropdowns, etc.) and main has an
architectural refactor:

- **If main's refactor is purely structural** (renaming, reorganizing) with no
  new user-facing features → **keep dev's version entirely**.
- **If main added new fields/features** → keep dev's version as base, manually
  port main's new fields into dev's structure.
- **Never auto-accept main's version** for these files — it will destroy dev
  customizations.

### Verifying no residual conflict markers

After resolving all files:

```bash
grep -rn '<<<<<<< HEAD' . --include='*.go' --include='*.ts' --include='*.tsx' --include='*.json' --include='*.yml' --include='*.md' | grep -v node_modules | grep -v '.git/'
```

Must return zero results.

## Phase 4 — Stage resolved files

```bash
git add <all resolved files>
```

Do NOT `git add .` blindly — review what's staged with `git status`.

## Phase 5 — Regenerate auto-generated files

```bash
# bun.lock
rm -f web/bun.lock
cd web && bun install

# Route tree (if TanStack Router is used)
cd web && bun run build  # or the specific route-gen command

# i18n sync report
cd web && bun run i18n:sync
```

Stage the regenerated files:

```bash
git add web/bun.lock web/src/routeTree.gen.ts web/src/i18n/locales/_reports/
```

## Phase 6 — Verification

All four checks MUST pass before committing:

```bash
# 1. Go root module build
~/.local/go/bin/go build ./...

# 2. relaykit standalone build (MUST use GOWORK=off)
cd relaykit && GOWORK=off ~/.local/go/bin/go build ./...

# 3. Frontend dependency install (already done in Phase 5)
# Verify no errors from bun install

# 4. Frontend typecheck
cd web && bun run typecheck
```

If any check fails, fix the issue before continuing. Common problems:

| Problem | Fix |
|---|---|
| Go import path conflict | Check if main renamed a package; update imports in dev files |
| relaykit won't build standalone | Ensure no root-module imports leaked into relaykit/ |
| TypeScript type errors | Main may have changed a shared type; update dev's usage |
| Missing bun dependency | Check if main added new deps that weren't in the merge |

## Phase 7 — Commit

Use this commit message format:

```
Merge latest origin/main into dev (N new commits)

Merged N upstream commits from origin/main into dev.

Conflict resolution (M files):
- Auto-resolved (AA/DD): X files
- Upstream-only changes (no dev customization): Y files
- Dev customization preserved: Z files — <list key files>

Dev customizations preserved:
- <bulleted list of fork features with file paths>

Main features adopted:
- <bulleted list of notable upstream changes>

Verification:
- go build ./... passes
- relaykit standalone build passes (GOWORK=off)
- bun install succeeds
- bun run typecheck: zero errors
```

```bash
git commit
```

## Phase 8 — Post-merge (optional, on user request)

- Run backend tests: `cd /home/admin/workspace/code/NewApi/new-api && ~/.local/go/bin/go test ./...`
- Run frontend tests: `cd web && bun run test`
- Run E2E tests: invoke the `e2e-integration` skill
- Push: `git push origin merge/main-into-dev`
- Create PR to merge into dev

---

## Dev Customizations Registry

These are the fork-specific features that MUST be preserved in every merge.
**Update this list when adding new dev-only features.**

### Backend (Go)

| Feature | Key files | Description |
|---|---|---|
| Batch token create/update | `controller/token.go`, `model/token.go`, `router/api-router.go` | Bulk token CRUD APIs |
| Styled HTML email templates | `controller/misc.go`, `common/email.go` | Gradient background verification code cards |
| Enhanced quota notifications | `service/quota.go` | Styled HTML for quota warning emails |
| Channel error notification system | `service/channel_error_counter.go`, `setting/operation_setting/monitor_setting.go` | ChannelErrorNotify* fields, error counting |
| Feishu notifications | `service/feishu_notify.go` | Feishu/Lark bot integration |
| QQ Bot notifications | `service/qqbot_notify.go` | QQ bot integration |
| System update checker | `controller/system_update.go`, `controller/update_check.go` | Admin update reminders |
| Enhanced user management | `controller/user.go` | Extra user fields/operations |
| Notify DTO extensions | `relaykit/dto/notify.go`, `relaykit/dto/user_settings.go` | Extra notification types |
| Operation settings tools | `setting/operation_setting/tools.go` | Additional settings utilities |
| version.sh release script | `scripts/version.sh` (if exists) | Custom versioning vs main's inline git-describe |

### Frontend (React/TypeScript)

| Feature | Key files | Description |
|---|---|---|
| Model mutate drawer extensions | `web/src/features/channels/components/drawers/model-mutate-drawer.tsx` | Pricing modes, vendor dropdown (~500 extra lines) |
| Extra notification channels | `web/src/features/profile/components/tabs/notification-tab.tsx` | Feishu, QQ bot notification settings |
| Routing reliability section | `web/src/features/system-settings/models/routing-reliability-section.tsx` | Channel error notification config UI |
| Image generation page | `web/src/routes/_authenticated/image-gen/index.tsx`, `web/src/features/system-settings/content/image-gen-section.tsx` | Image gen feature and settings |
| Enhanced system config hooks | `web/src/hooks/use-system-config.ts` | StatusApiResponse, mapStatusDataToConfig |
| E2E auth bootstrap hook | `web/src/lib/auth-session.ts` | E2E test auth bypass |
| Usage log details dialog | `web/src/features/usage-logs/components/dialogs/details-dialog.tsx` | Enhanced log detail view |
| System settings types | `web/src/features/system-settings/types.ts` | Extra setting fields |
| Profile types & constants | `web/src/features/profile/types.ts`, `web/src/features/profile/constants.ts` | Extra notification types |
| Enhanced sidebar config | `web/src/hooks/use-sidebar-config.ts` | Extra nav items |
| i18n batch edit token keys | `web/src/i18n/locales/*.json` | Translation keys for batch token UI |

### CI/Infrastructure

| Feature | Key files | Description |
|---|---|---|
| E2E integration test job | `.github/workflows/ci.yml` | Playwright E2E job in CI |
| E2E test suite | `web/e2e-integration/` | 84+ Playwright integration tests |
| version.sh in release | `.github/workflows/release.yml` | Custom version extraction |
| Fork-aware test rules | `AGENTS.md` section "Test file organization" | Test placement conventions |
| Frontend test infra | `web/src/test/`, `web/vitest.config.ts` | Test utils, setup, shims |
| Coverage tests | `web/src/coverage-tests/`, `*/coverage_test.go` | Fork-specific test files |

---

## Troubleshooting

| Scenario | Solution |
|---|---|
| `bun.lock` has merge conflicts | Delete it and run `bun install` to regenerate |
| `routeTree.gen.ts` has conflicts | Delete it and run `bun run build` to regenerate |
| Main renamed a Go package | Update all dev-only files that import the old name |
| Main refactored a component dev extended | Keep dev's version as base, port main's new props/features manually |
| Conflict count is very large (100+) | Many are auto-resolvable (AA/DD type); focus manual effort on UU conflicts |
| i18n JSON conflicts | Do key union: keep all keys from both sides, prefer main's value for shared keys, keep dev's value for dev-only keys |
| Main changed a shared type that dev extends | Accept main's base type change, re-add dev's extra fields |
