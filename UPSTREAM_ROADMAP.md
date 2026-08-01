# Upstream Sync Roadmap

> Strategy for synchronizing the anemos UI with upstream `opencode` while preserving mobile-specific and WhisperCode-specific modifications.

## 1. Purpose and Scope

This document is the reference for all upstream synchronization work on the anemos frontend (`packages/app`). It captures:

- The relationship between anemos, WhisperCode, and upstream opencode
- The current state of upstream's V1/V2 server-API migration
- What must be preserved during sync
- A phased sync strategy

**Scope:** `packages/app` (SolidJS web/mobile UI). Backend (`packages/opencode` CLI), SDK generation, and mobile wrappers (`packages/ios`, `packages/android`) are out of scope for UI sync unless explicitly noted.

## 2. Project Lineage

```
opencode (anomalyco/opencode, formerly sst/opencode)
  └── WhisperCode (DNGriffin/whispercode) — mobile fork with live-update fixes, push, voice
        └── anemos (magakis/anemos) — current project
```

- **anemos** descends from WhisperCode, not directly from opencode.
- Local remote `upstream-archive` points to `DNGriffin/whispercode.git`, confirming this lineage.
- When syncing upstream opencode, we are re-merging the grandparent. The WhisperCode layer between must not be regressed.

## 3. Upstream Reference

| Field | Value |
|---|---|
| Repository | `anomalyco/opencode` (`sst/opencode` 301-redirects here) |
| Default branch | `dev` |
| Latest release | `v1.18.11` (2026-08-01) |
| License | MIT |
| Repo size | ~424 MB (full clone) |
| Submodules | None |
| Relevant packages | `packages/app`, `packages/session-ui`, `packages/ui`, `packages/client` |

No upstream remote is currently configured in anemos. One must be added before any sync work.

## 4. The V1/V2 Reality

**"V2" is a server-API migration, not a separate parallel UI.** This is the most important fact for sync planning.

- **V1** = legacy server endpoints (unprefixed: `/session`, `/global/event`, `/session/:id/diff`), consumed via `@opencode-ai/sdk`.
- **V2** = new server endpoints (`/api/*`-prefixed: `/api/event`, `/api/session/active`, etc.), consumed via `@opencode-ai/client`.
- Both coexist in the same `packages/app` via a runtime protocol-detection adapter layer (`src/utils/server-protocol.ts`, `src/utils/server-compat.ts`, `src/context/server-sdk.tsx`). There is **no global V1/V2 toggle** — selection is per-server, detected at runtime.
- Migration is tracked in upstream `packages/app/V1_API_MIGRATION.md`. New V2-native components use a `-v2` suffix (e.g. `prompt-input-v2.tsx`) or live in a `v2/` subfolder.
- **Open PR [#39485 "refactor(app): support only v2 servers"](https://github.com/anomalyco/opencode/pull/39485)** removes V1 support entirely. V1 is being deprecated and deleted, not maintained as a legacy option.
- **anemos currently has zero V2 traces** — only the V1 (legacy) UI.

**Implication for sync:** "Keep the old UI" = keep using V1 files. "Synchronize with the latest old UI" = pull the latest non-`-v2`, non-`v2/` versions of upstream's `packages/app` files. The V2 migration is deferred to Phase 4.

> **Naming trap:** The package `@opencode-ai/sdk/v2` actually wraps the **V1 (legacy)** endpoints. The genuinely-new client is `@opencode-ai/client`. Do not be misled by the `/v2` in the SDK path.

## 5. Sync Strategy (Phased)

### Phase 0: Preparation (DONE)

- [x] Research upstream repo, V1/V2 situation, component locations
- [x] Investigate WhisperCode-specific divergences and live-update behavior
- [x] Write this roadmap

### Phase 1: Vendor Upstream Reference

- [x] Add upstream remote pointing to `anomalyco/opencode`
- [x] Choose vendoring method (sparse checkout scoped to relevant packages, shallow clone into ignored directory, or git submodule)
- [x] Pin to a specific commit/tag for reproducibility
- [x] Record the pinned commit SHA in this document

#### Phase 1 Results

- **Pinned commit:** `32f278b48f1a495611165d8a9f1ace0b512933e2` (`32f278b48`)
- **Fetch date:** 2026-08-01
- **Vendoring method:** Git remote (`upstream`) + shallow fetch (`--depth=1`). Upstream objects stored in local `.git/`. Files browsable via `git show upstream/dev:<path>` and diffable via `git diff upstream/dev -- <path>`.
- **Upstream packages verified:** `packages/app`, `packages/session-ui`, `packages/ui` — all found and accessible
- **Upstream app source file count:** 431

### Phase 2: Divergence Audit

- [x] Generate a full diff between anemos `packages/app` and upstream's V1 (non-`-v2`) files
- [x] Classify each difference:
  - [x] `upstream-change-to-take` — newer upstream code we want
  - [x] `mobile-divergence-to-keep` — anemos/WhisperCode mobile-specific code
  - [x] `whispercode-trait-to-keep` — WhisperCode reactivity/live-update fixes
  - [x] `conflict-to-resolve` — changes in both that need manual merge
- [x] Produce a file-by-file sync checklist
- [x] Identify all `UPSTREAM-DIVERGENCE` markers and verify each is still needed
- [x] Investigate whether anemos needs to adopt upstream's `packages/session-ui` package split

#### Phase 2 Results

- **Audit date:** 2026-08-01
- **Full checklist:** See `SYNC_CHECKLIST.md` for the complete file-by-file classification
- **Summary:** 198 TAKE (new V1 files), 38 KEEP-CUSTOM (our-only), 39 KEEP-DIVERGENCE (marked), 86 INSPECT (unmarked, need review), 22 V2-DEFERRED
- **Critical blockers identified:**
  - `packages/session-ui` does not exist locally — must resolve before Phase 3
  - `pages/session.tsx` has 2,412 lines of diff — largest single merge challenge
  - 12 high-risk files exceed 200 lines of diff each
  - Not all fork divergences are marked (e.g. `context/layout.tsx` has 392 changes, 0 markers)
- **Full file lists regenerable via:** `git diff --name-status upstream/dev -- packages/app/src/`

### Phase 3: V1 UI Sync (current priority)

- Sync V1 (legacy) files from upstream into anemos
- Preserve all items in section 6 (Preservation Requirements)
- Test after each logical group of files:
  - Mobile tabs switch correctly (session / changes / context)
  - Live updates work without manual tab-switching (no freeze regression)
  - Context inspector renders correctly
  - Session changes / review tab works
  - Push notifications and voice input still function
- Verify the tab-freeze issue does not regress

### Phase 4: V2 Migration (future)

- Track upstream's V2 migration progress and PR #39485
- Evaluate whether and when to adopt the V2 server protocol
- Plan V2 client integration (`@opencode-ai/client`)
- Note: historical session diffs are currently gapped in V2 (pending snapshot-semantics definition upstream). The session-changes view may not work against V2 historical sessions until upstream resolves this.

## 6. Preservation Requirements

These must NOT be regressed during any sync. Most are marked in the codebase with `UPSTREAM-DIVERGENCE` comments.

### 6.1 Mobile Live-Update / Reactivity System

**Root cause of the "tab freeze" issue:** Mobile tabs (`session` / `changes` / `context`) are rendered with SolidJS `Switch`/`Match`, which unmounts inactive tabs. Unmounted components lose their reactive store subscriptions, so updates received while a tab is inactive are missed until you switch back (which remounts and re-subscribes).

**WhisperCode's mitigations (MUST PRESERVE):**

| File | What it does |
|---|---|
| `src/context/global-sdk.tsx` | Event stream via `createGlobalEmitter` with batching (`FLUSH_FRAME_MS=16`, `STREAM_YIELD_MS=8`) and event coalescing. Mobile resume event listener for forced reconnect. |
| `src/context/global-sync.tsx` (~L165-173) | `refreshOnResume()` — eager queue refresh on mobile resume event with cooldown (`RESUME_REFRESH_COOLDOWN_MS`). |
| `src/context/global-sync.tsx` (~L347-352) | `warmSessions()` — hydrates session chain when a live prompt arrives, handling missed `session.created` events while backgrounded. |
| `src/context/sync.tsx` (~L560-566) | `copyTodos()` — returns detached arrays so resume-triggered refreshes do not reuse reconciled references that drift between store and session_todo cache. |
| `src/pages/session.tsx` (~L1250) | Visibility, focus, online, and `opencode:resume` event listeners that trigger `refreshActiveSession()`. |
| `src/utils/mobile-review-limit.ts` | `MOBILE_REVIEW_FILE_LIMIT = 100` — prevents large review sets from stalling iOS/Android webviews. |
| `src/utils/session-cache.ts` | `SESSION_CACHE_LIMIT = 30` — mobile memory management for session cache. |

### 6.2 Mobile UI Features

| Feature | Location |
|---|---|
| Mobile tabs (session / changes / context) | `src/pages/session.tsx` — `SessionMobileTabs` |
| Mobile tabs component | `src/pages/session/session-mobile-tabs.tsx` |
| Mobile composer positioning | `src/pages/session/composer/session-composer-region.tsx` |
| Push notifications | `@whisperopencode/push` plugin, `packages/push`, `packages/push-relay` |
| Voice input | Platform integration in `src/context/platform.tsx` |
| iOS / Android wrappers | `packages/ios`, `packages/android` (Tauri — NOT Electron like upstream desktop) |

### 6.3 Custom UI Features (user-requested to maintain)

| Feature | Location | Notes |
|---|---|---|
| Context inspector | `src/components/session/session-context-tab.tsx` | Token usage, context breakdown by role, system prompt display, raw messages accordion. The user wants this maintained. |
| Session changes / review | `src/pages/session/review-tab.tsx` + `session-side-panel.tsx` | Diff view with "session" vs "turn" modes. File tree with "changes" and "all" tabs. The user wants this maintained. |
| Context usage indicator | `src/components/session-context-usage.tsx` | Shown in the side panel header. |

## 7. Component Map

Local files vs upstream equivalents. Where upstream has a newer or refactored version, it is noted.

| Area | Local (anemos) | Upstream (V1) | Notes |
|---|---|---|---|
| Chat timeline | `pages/session/message-timeline.tsx` | `pages/session/timeline/` (split: `message-timeline.tsx`, `model.ts`, `projection.ts`, `rows.ts`, `row-reconciliation.ts`, `virtual-items.ts`, `measure.ts`, `summary-diffs.ts`) | Upstream refactored into a virtualized projection model. Major structural difference — evaluate carefully in Phase 3. |
| Session route | `pages/session.tsx` | `pages/session.tsx` | Core file, likely many upstream changes. |
| Composer / prompt input | `components/prompt-input.tsx` + `prompt-input/` | `components/prompt-input.tsx` + `prompt-input/` | Similar structure upstream. |
| Context inspector | `components/session/session-context-tab.tsx` | `components/session/session-context-tab.tsx` + `session-context-breakdown.ts`, `session-context-format.ts`, `session-context-metrics.ts` | Upstream split into more helper files. |
| Session review / changes | `pages/session/review-tab.tsx` + `session-side-panel.tsx` | `pages/session/review-tab.tsx` + shared `session-ui` `session-review.tsx`, `session-diff.ts` | Upstream factors diff rendering into `packages/session-ui`. |
| Side panel | `pages/session/session-side-panel.tsx` | `pages/session/session-side-panel.tsx`, `session-panel-layout.ts`, `session-panel-width.ts` | Upstream split layout into separate files. |
| File tree | Inline in side panel | `components/file-tree.tsx` / `file-tree-v2.tsx` + `file-tree-v2-model.ts` | Upstream extracted file tree. |
| Session rendering primitives | Inline in `packages/app` | `packages/session-ui/src/components/` | Upstream extracts shared rendering into a separate package. anemos may not have this package — investigate in Phase 2. |
| Event system | `context/global-sdk.tsx` + `global-sync.tsx` + `sync.tsx` | `context/server-sdk.tsx` | Different architecture. Mobile-specific event handling is a WhisperCode addition. |

> **Structural difference:** Upstream splits session rendering into a separate `packages/session-ui` package. anemos appears to keep this inline in `packages/app`. This needs investigation during Phase 2 to determine whether to adopt the split or keep rendering inline.

## 8. Known Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tab freeze regression | Live updates stop when switching mobile tabs | Preserve all `UPSTREAM-DIVERGENCE` event/resume code (section 6.1) |
| Losing WhisperCode mobile fixes | Push, voice, resume handling break | File-by-file divergence audit (Phase 2) before any sync |
| Upstream timeline refactor | Chat rendering breaks | `message-timeline.tsx` to `timeline/` is a major refactor — evaluate separately in Phase 3 |
| V1 deletion upstream (PR #39485) | No more V1 files to sync from | Pin upstream reference BEFORE V1 is removed; sync from pinned commit |
| `session-ui` package split | Missing rendering components after sync | Investigate whether anemos has or needs `packages/session-ui` in Phase 2 |
| Historical diff gap in V2 | Session changes view breaks on V2 servers | Stay on V1 for now; V2 snapshot semantics pending upstream |
| Event system architecture difference | Overwriting global-sdk/global-sync with upstream's server-sdk breaks mobile reactivity | Treat event system files as high-preservation; sync carefully or skip |

## 9. Open Questions

1. **Vendoring method:** Sparse checkout (small, scoped to relevant packages) vs shallow clone (simple, into ignored dir) vs git submodule (tracked in .gitmodules)? Decide in Phase 1.
2. **`packages/session-ui`:** Does anemos need to adopt this upstream package split, or keep rendering inline in `packages/app`? Investigate in Phase 2.
3. **Timeline refactor:** Upstream's `timeline/` virtualized projection model is a significant architectural change. Adopt it, or keep the current `message-timeline.tsx`? Evaluate in Phase 3.
4. **V2 timeline:** When does V1 get fully removed upstream (PR #39485 merge)? Should we pin a "last V1" commit as our sync baseline? Monitor the PR.
5. **Event system sync:** The event system (`global-sdk.tsx`, `global-sync.tsx`) is architecturally different from upstream's `server-sdk.tsx` and carries critical mobile reactivity. Should these files be synced at all, or treated as permanently forked? Evaluate in Phase 2.
