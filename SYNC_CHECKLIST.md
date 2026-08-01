# Sync Checklist — Phase 2 Divergence Audit

> Generated 2026-08-01. Compares local `packages/app/src/` against `upstream/dev` (commit `32f278b48`).
> Regenerate full file lists with: `git diff --name-status upstream/dev -- packages/app/src/`

## Summary

| Category | Count | Action |
|---|---|---|
| TAKE | 198 | Add these new V1 files from upstream |
| KEEP-CUSTOM | 38 | Our-only files — do not sync |
| KEEP-DIVERGENCE | 39 | Modified, has UPSTREAM-DIVERGENCE markers — protect during sync |
| INSPECT | 86 | Modified, no markers — manual review required |
| V2-DEFERRED | 22 | V2 files — skip until Phase 4 |

Local files: 262. Upstream files: 431.

## High-Risk Files (must be hand-merged, cannot auto-sync)

These modified files have large diffs AND no divergence markers, meaning they likely contain unmarked fork-specific code that would be lost if overwritten with upstream:

| File | Lines Changed | Risk |
|---|---|---|
| `pages/session.tsx` | 2412 | Critical — main session page, mobile tabs, live updates |
| `context/permission.tsx` | 599 | Critical — permission handling |
| `components/settings-keybinds.tsx` | 436 | Medium — keyboard shortcuts |
| `components/dialog-select-file.tsx` | 427 | Medium — file selection dialog |
| `context/layout.tsx` | 392 | Critical — layout state, surprising no markers given push routing |
| `pages/session/file-tabs.tsx` | 368 | High — file tab management |
| `context/server.tsx` | 343 | Critical — server connection, health polling |
| `context/prompt.tsx` | 327 | Critical — prompt/input state |
| `index.css` | 317 | High — global styles, mobile layout |
| `utils/persist.ts` | 317 | High — persistence, may affect mobile resume |
| `components/prompt-input/submit.ts` | 274 | High — prompt submission logic |
| `context/terminal.tsx` | 229 | Medium — terminal context |

## Likely Safe to Take (29 INSPECT files with minimal diff)

These files show near-zero changes in diff stat, suggesting they match upstream closely or were renamed/moved. Verify each before syncing:

- `components/dialog-connect-provider.tsx`
- `components/dialog-custom-provider.tsx`
- `components/dialog-edit-project.tsx`
- `components/dialog-manage-models.tsx`
- `components/dialog-select-directory.tsx`
- `components/dialog-select-model-unpaid.tsx`
- `components/dialog-select-model.tsx`
- `components/prompt-input/attachments.ts`
- `components/prompt-input/build-request-parts.ts`
- `components/prompt-input/context-items.tsx`
- `components/prompt-input/image-attachments.tsx`
- `components/prompt-input/placeholder.ts`
- `components/prompt-input/slash-popover.tsx`
- `components/prompt-input/submission-state.ts`
- `components/prompt-input/transient-state.ts`
- `components/session-context-usage.tsx`
- `components/session/session-context-metrics.ts`
- `components/session/session-context-tab.tsx`
- `components/session/session-new-view.tsx`
- `components/session/session-sortable-tab.tsx`
- `components/status-popover-body.tsx`
- `context/global-sync/bootstrap.test.ts`
- `context/global-sync/child-store.ts`
- `context/global-sync/session-cache.ts`
- `context/global-sync/session-load.ts`
- `context/global-sync/session-trim.ts`
- `context/permission-auto-respond.ts`
- `pages/layout/sidebar-workspace.tsx`
- `pages/session/session-side-panel.tsx`

## KEEP-DIVERGENCE Files (39 files with UPSTREAM-DIVERGENCE markers)

These files contain 145 intentional fork divergence markers. They MUST be hand-merged, never overwritten:

### Entry Points (3 files)
- `entry.tsx`, `app.tsx`, `index.ts` — push providers, platform exports

### I18n (17 files)
- `i18n/{en,ar,br,bs,da,de,es,fr,ja,ko,no,pl,ru,th,tr,zh,zht}.ts` — mobile refresh, push, settings labels

### Context (14 files)
- `context/platform.tsx` — platform contract extensions for mobile
- `context/notification.tsx` — mobile push kind tagging
- `context/push-pair.tsx` — push pairing state
- `context/push-relay.tsx` — push relay persistence
- `context/todo-store.ts` — detached todo copy logic
- `context/sync.tsx` — resume/todo recovery cache rules
- `context/global-sync.tsx` — resume refresh, session warm-up
- `context/global-sdk.tsx` — mobile resume event handling, event coalescing
- `context/global-sync/event-reducer.ts` — fork todo copy behavior
- `context/global-sync/bootstrap.ts` — fork bootstrap paths
- `context/settings.tsx` — fork settings

### Components (11 files)
- `components/prompt-input.tsx` — mobile keyboard affordances
- `components/prompt-input/editor-dom.ts` — mobile editor DOM helpers
- `components/session/session-header.tsx` — mobile refresh button
- `components/dialog-select-server.tsx` — mobile server help copy
- `components/dialog-settings.tsx` — phone tab integration
- `components/settings-general.tsx` — settings separation
- `components/settings-mobile-notifications.tsx` — mobile push setup UI
- `components/settings-mobile-notifications-data.ts` — push setup data
- `components/terminal.tsx` — terminal touch handling

### Pages (2 files)
- `pages/layout.tsx` — push routing, channel-aware routing, notification click bridge (9 markers)
- `pages/session/composer/session-composer-region.tsx` — mobile composer positioning

### Utils (10 files)
- `utils/notification-click.ts` — channel-aware push tap routing
- `utils/push-plugin.ts` — push plugin commands
- `utils/push-relay-url.ts` — relay URL normalization
- `utils/push-pair.ts` — pairing flow
- `utils/push-test.ts` — test push flow
- `utils/server.ts` — server auth header split
- `utils/mobile-review-limit.ts` — mobile review rendering limits

## KEEP-CUSTOM Files (38 files — our-only, not in upstream)

### Mobile Components
- `components/mobile/mobile-header.tsx`, `mobile-sidebar.tsx`, `safe-area.tsx`, `tab-bar.tsx`
- `components/pull-to-refresh-indicator.tsx`
- `components/server/server-config-screen.tsx`, `server-form.tsx`

### Mobile Notifications
- `components/settings-mobile-notifications.tsx` + data/helpers/test

### Global SDK and Sync (fork-specific event system)
- `context/global-sdk.tsx` — event stream with batching/coalescing, mobile resume
- `context/global-sync.tsx` — eager refresh, session warm-up
- `context/global-sync/session-prefetch.ts`

### Push Infrastructure
- `context/push-pair.tsx`, `context/push-relay.tsx`
- `utils/push-pair.ts`, `push-plugin.ts`, `push-relay-url.ts`, `push-test.ts`, `notification-click.ts`

### Session Pages (fork-specific)
- `pages/session/message-timeline.tsx` — our timeline (upstream refactored into `timeline/` dir)
- `pages/session/session-mobile-tabs.tsx` — mobile tab switching
- `pages/session/scroll-spy.ts` — scroll spy
- `pages/session/session-timeline-header.tsx`

### Utils
- `utils/mobile-review-limit.ts`
- `context/todo-store.ts`
- `hooks/use-pull-to-refresh.ts`

## Structural Findings

### packages/session-ui (MISSING LOCALLY)
- Does NOT exist in anemos
- Upstream has 35 components: markdown, message-part, line-comment, file, dock-prompt, basic-tool, session-review, session-retry, tool-error-card, tool-count-summary, etc.
- Many of the 198 TAKE files may import from `@opencode-ai/session-ui` — adding them without resolving this package will cause import errors
- **MUST RESOLVE before Phase 3 sync**: either (a) add the package, (b) confirm components are inlined in app/ui, or (c) rewrite imports

### Timeline Refactor
- Local: single `pages/session/message-timeline.tsx` (our-only, KEEP-CUSTOM)
- Upstream: `pages/session/timeline/` directory with 15 files (TAKE — virtualized projection model)
- This is a major architectural change — the new model is in TAKE but depends on upstream's event/store architecture

### packages/ui Diff
- 75 files added (session-ui migration + new features)
- 145 files deleted (V2 cleanup + audio/font asset removal)
- 60 files modified
- The ui package has diverged significantly

## Recommended Phase 3 Approach

### Wave 0: Resolve structural blockers
1. Confirm whether `@opencode-ai/session-ui` components are available locally (inlined in app or ui package) or need to be added
2. Decide on timeline approach: adopt upstream's `timeline/` directory or keep current `message-timeline.tsx`
3. Map import dependencies: which TAKE files import from session-ui or other missing packages

### Wave 1: Add non-conflicting new files
Add TAKE files that have no local equivalent and don't import from missing packages. Group by feature area.

### Wave 2: Sync low-risk modified files
The 29 "likely safe" files above. Verify each diff before taking.

### Wave 3: Sync medium-risk files
INSPECT files with 20–150 lines of diff. Review each diff manually.

### Wave 4: Hand-merge high-risk files
The 12 high-risk files above. Merge upstream changes into our files while preserving all KEEP-DIVERGENCE and KEEP-CUSTOM code.

### Wave 5: Verify and test
- Run typecheck: `bun run typecheck`
- Run unit tests: `bun run --cwd packages/app test:unit`
- Run e2e tests: `bun run --cwd packages/app test:e2e`
- Manual test: mobile tabs, live updates (no freeze), context inspector, session changes, push, voice
