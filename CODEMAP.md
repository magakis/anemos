# Codemap

> Detailed execution plan for synchronizing the anemos mobile UI with upstream opencode, preserving mobile-specific and WhisperCode-specific modifications.

## Table of Contents

- [Overview](#overview)
- [Project Architecture](#project-architecture)
- [Completed Phases](#completed-phases)
  - [Phase 0: Preparation](#phase-0-preparation-done)
  - [Phase 1: Vendor Upstream Reference](#phase-1-vendor-upstream-reference-done)
  - [Phase 2: Divergence Audit](#phase-2-divergence-audit-done)
- [Upcoming Phases](#upcoming-phases)
  - [Phase 3: Wholesale Upstream Copy](#phase-3-wholesale-upstream-copy)
  - [Phase 4: V1/V2 Layout Toggle](#phase-4-v1v2-layout-toggle)
  - [Phase 5: Mobile Feature Porting](#phase-5-mobile-feature-porting)
  - [Phase 6: Event System Re-implementation](#phase-6-event-system-re-implementation)
  - [Phase 7: Verification and Testing](#phase-7-verification-and-testing)
  - [Phase 8: Future V2 Migration](#phase-8-future-v2-migration)
- [Risk Register](#risk-register)
- [Key Reference Files](#key-reference-files)

---

## Overview

### What this project does

Anemos is a mobile fork of opencode. It descends from WhisperCode (which itself forked from opencode) and adds iOS/Android support via Tauri, push notifications, voice input, and mobile-specific UI. The upstream opencode project has evolved significantly (5,221 commits, ~5 months of development) since the fork base (commit `6b9ce5e63`, March 2026). The local UI is outdated and missing major features.

### The approach

Rather than selectively merging 86 ambiguous files, we take a **clean-copy-then-layer** strategy:

1. Copy upstream's latest `packages/app`, `packages/session-ui`, `packages/ui`, and `packages/client` wholesale — getting all 5 months of improvements at once.
2. Keep fork-only packages (`packages/ios`, `packages/android`, `packages/push`, `packages/push-relay`, `packages/shared`) — these are 100% original with no upstream conflicts.
3. Make the V1/V2 layout toggle always available (upstream gates it to existing users only).
4. Layer mobile features (push notifications, health polling, visibility listeners) as external providers that don't modify upstream code.
5. Re-implement event system mobile fixes against upstream's new architecture (the old architecture was completely rewritten).
6. Port mobile UI elements (tabs, composer, header) into the upstream layout.

### Key decisions made

- **V1 first, V2 later**: We use the V1 (legacy) layout as the primary, with the V2 toggle available. V1 has workspaces; V2 does not yet.
- **Wholesale copy over selective merge**: Cleaner base, no risk of missing unmarked divergences, all upstream features arrive at once.
- **Layer what's possible, rewrite what's not**: Push notifications and health polling can be layered. Event system fixes need re-implementation because upstream rewrote the architecture.

---

## Project Architecture

### Lineage

```
opencode (anomalyco/opencode, formerly sst/opencode)
  └── WhisperCode (DNGriffin/whispercode) — mobile fork, last synced 2026-03-08 (6b9ce5e63)
        └── anemos (magakis/anemos) — current project
```

### The V1/V2 reality

There are two distinct "V1/V2" concepts upstream:

1. **Layout V1/V2** (user-facing): "Legacy layout" (`pages/layout.tsx`) vs "new layout" (`pages/layout-new.tsx`). The legacy layout has workspaces, sidebar, and multi-project support. The new layout is a cleaner design but is still missing workspaces. Upstream added a temporary toggle in v1.17.19 (July 2026) letting users switch between them during the transition period.

2. **API V1/V2** (internal): Migration from legacy server endpoints (`/session`, `/global/event`) to new prefixed endpoints (`/api/session`, `/api/event`). This is a backend concern, not user-facing. The app auto-detects which protocol the server speaks.

For this project, "V1" and "V2" refer to the **layout** versions, not the API versions.

### Event system architecture

The fork's event fixes (resume handling, coalescing, session warm-up, detached todos) were built on an architecture that **no longer exists upstream**. Between the fork base and now, upstream completely rewrote the app-to-server sync layer:

- **Old (fork base)**: `global-sdk.tsx`, `global-sync.tsx`, `sync.tsx` — monolithic event handling with inline mobile fixes
- **New (current upstream)**: `server-sdk.tsx`, `server-sync.tsx`, `server-session.ts`, `server-session-v2-reducer.ts`, plus a `global-sync/` subdirectory with ~20 specialized files (event-reducer, session-cache, eviction, queue, bootstrap, child-store, etc.)

This means the fork's event fixes cannot be cherry-picked. They must be re-evaluated and, where still necessary, re-implemented against the new architecture.

**What can be layered without modifying upstream:**
- Push notifications (external event subscriber)
- Health polling (separate timer wrapper)
- Visibility/focus/online listeners (separate provider)

**What requires integration into upstream code:**
- Mobile resume with heartbeat (event stream loop)
- Session warm-up on prompt arrival (event listener)
- Detached todo copies (store types and sync logic)
- Eager refresh on resume (resume handlers)
- Enhanced event coalescing (queue processing)

### Upstream has zero mobile code

Confirmed: no iOS, no Android, no push notifications, no app-backgrounding lifecycle, no visibility-based reconnect, no `navigator.onLine` handling. All mobile features are 100% fork-original with no upstream conflicts.

### Fork divergence summary

390 divergence markers across 73 files, all referencing upstream sync commit `6b9ce5e63`. Categories:
- Mobile push notifications: 67 markers
- Fork-specific push providers: 21 markers
- Mobile resume/todo recovery: 18 markers
- Mobile UI adjustments: 14 markers
- Fork-specific settings: 11 markers
- Mobile keyboard affordances: 9 markers
- Other: 5 markers

### Key numbers

- Local app files: 262
- Upstream app files: 431
- Files to take from upstream: 198 new V1 files + full V2 set
- Fork-only files to preserve: 38
- Modified files with divergence markers: 39
- Modified files needing inspection: 86
- V2 files (deferred): 22
- Upstream commit gap: 5,221 commits (~5 months)

---

## Completed Phases

### Phase 0: Preparation (DONE)

**Goal:** Research the upstream project, understand the V1/V2 situation, and document findings.

**What was done:**
- Confirmed upstream repository: `anomalyco/opencode` (formerly `sst/opencode`)
- Researched V1/V2 layout migration and API migration
- Investigated local app structure and component locations
- Investigated live-update/tab-freeze behavior and WhisperCode mitigations
- Wrote `UPSTREAM_ROADMAP.md` (strategy document)

**Status:** Complete.

---

### Phase 1: Vendor Upstream Reference (DONE)

**Goal:** Add the upstream repository as a git remote and fetch its latest code for diffing and reference.

**What was done:**
- Added `upstream` remote: `https://github.com/anomalyco/opencode.git`
- Shallow fetch (`--depth=1`) of `dev` branch
- Pinned commit: `32f278b48f1a495611165d8a9f1ace0b512933e2` (2026-08-01)
- Verified all relevant packages accessible: `packages/app`, `packages/session-ui`, `packages/ui`
- Updated `UPSTREAM_ROADMAP.md` with Phase 1 results

**How to use the reference:**
- View any upstream file: `git show upstream/dev:<path>`
- Diff any file: `git diff upstream/dev -- <path>`
- List upstream files: `git ls-tree -r --name-only upstream/dev <path>`

**Status:** Complete.

---

### Phase 2: Divergence Audit (DONE)

**Goal:** Catalog every difference between local and upstream code, classify each file, and produce a sync checklist.

**What was done:**
- Cataloged all 390 `UPSTREAM-DIVERGENCE` markers across 73 files
- Generated file-level diff: 198 TAKE, 38 KEEP-CUSTOM, 39 KEEP-DIVERGENCE, 86 INSPECT, 22 V2-DEFERRED
- Investigated structural differences (session-ui package, timeline refactor, ui package changes)
- Investigated event system architecture differences
- Researched V1/V2 toggle mechanism and upstream evolution since fork base
- Wrote `SYNC_CHECKLIST.md` (full file-level classification)

**Key findings:**
- `packages/session-ui` does not exist locally (upstream has 35 rendering components there)
- Timeline was refactored from single file to 15-file virtualized directory upstream
- Event system was completely rewritten upstream
- V1/V2 layout toggle exists upstream but is gated to existing users only
- Upstream has zero mobile/push/background code
- Fork base is 5,221 commits behind upstream

**Status:** Complete. The clean-copy-then-layer approach was chosen based on these findings.

---

## Upcoming Phases

### Phase 3: Wholesale Upstream Copy

**Goal:** Replace the local app, UI, and session-ui packages with upstream's latest versions, getting all 5 months of improvements at once. Establish a clean base to layer mobile features onto.

**Status:** Pending

**Prerequisites:** Phase 2 complete (understand what to copy and what to keep).

**Approach:** Replace the entire `packages/app`, `packages/ui`, and add `packages/session-ui` and `packages/client` from upstream. Keep all fork-only packages untouched.

**Packages to copy from upstream (wholesale replace):**
- `packages/app/` — the entire app, including both V1 and V2 files
- `packages/ui/` — shared UI primitives
- `packages/session-ui/` — session rendering components (does not exist locally; must be added)

**Packages to copy from upstream (add new):**
- `packages/client/` — the V2 API client (needed for V2 support; upstream vendors this as a tgz in `packages/app/vendor/`)

**Packages to KEEP (fork-only, do not touch):**
- `packages/ios/` — Tauri iOS wrapper
- `packages/android/` — Tauri Android wrapper
- `packages/push/` — push notification service
- `packages/push-relay/` — push relay service
- `packages/shared/` — shared logic
- `packages/plugin/` — plugin package
- `packages/sdk/js/` — generated SDK (may need regeneration against upstream's API spec)
- `packages/identity/` — identity package
- `packages/containers/` — containers
- `packages/extensions/` — extensions
- `packages/docs/` — documentation
- `packages/script/` — build/utility scripts

**Detailed steps:**

1. **Create a safety backup branch**
   - `git checkout -b backup/pre-wholesale-sync`
   - `git checkout main` (return to working branch)
   - This preserves the current state for rollback

2. **Replace packages/app**
   - Remove the current `packages/app/src/` contents
   - Check out upstream's version: extract all files from `upstream/dev` under `packages/app/`
   - This includes V1 files, V2 files, tests, stories, assets — everything
   - The vendored client tgz at `packages/app/vendor/opencode-ai-client-1.17.13-v2.tgz` comes with it

3. **Replace packages/ui**
   - Remove the current `packages/ui/src/` contents
   - Check out upstream's version: extract all files from `upstream/dev` under `packages/ui/`

4. **Add packages/session-ui**
   - This package does not exist locally
   - Check out upstream's entire `packages/session-ui/` directory
   - Verify its `package.json` exports are correct

5. **Add packages/client (if not vendored)**
   - If upstream vendors the client as a tgz in `packages/app/vendor/`, no separate action needed
   - If `packages/client/` exists as a workspace package, add it

6. **Resolve root workspace configuration**
   - Update root `package.json` `workspaces` field to include `packages/session-ui` (and `packages/client` if applicable)
   - Ensure fork-only packages remain in the workspace list
   - Update `turbo.json` if it references package-specific pipelines

7. **Resolve dependencies**
   - Run `bun install`
   - Upstream may have different dependency versions; resolve conflicts
   - Pay attention to: `solid-js`, `vite`, `tailwindcss`, `@tailwindcss/vite`, `@solidjs/router`, `@solid-primitives/*`
   - The fork's mobile-specific deps (Tauri plugins, push libraries) must be preserved in the relevant fork-only packages

8. **Resolve tsconfig paths**
   - Verify `@/*` alias still maps to `src/*` in `packages/app/tsconfig.json`
   - Verify `@opencode-ai/session-ui` and `@opencode-ai/client` resolve correctly
   - Check for any new path aliases upstream may have added

9. **Resolve import errors**
   - Run `bun run typecheck`
   - Fix any import errors — these will mostly be:
     - Fork-only packages referencing old app exports that moved or were renamed
     - SDK version mismatches (`@opencode-ai/sdk` paths may differ)
     - Missing type definitions
   - Do NOT try to port mobile features yet — just get the upstream app to compile
   - Temporarily comment out or stub any fork-only integration points that break

10. **Get the app to build**
    - `bun run --cwd packages/app build`
    - Fix build errors
    - The app should build as a pure upstream app at this point (no mobile features)

**Files and directories involved:**
- `packages/app/` (entire directory — wholesale replace)
- `packages/ui/` (entire directory — wholesale replace)
- `packages/session-ui/` (entire directory — add new)
- Root `package.json` (workspace config)
- `turbo.json` (pipeline config)
- Root `tsconfig.json` (if shared)

**Risks:**
- **Dependency conflicts**: Upstream may use different major versions of shared deps. Resolution may require careful version pinning.
- **SDK incompatibility**: The fork's `packages/sdk/js` is generated from an older API spec. Upstream's app may expect newer SDK types. May need to regenerate the SDK from upstream's OpenAPI spec (`./script/generate.ts`).
- **Workspace configuration**: Adding `packages/session-ui` and `packages/client` to the workspace may surface dependency resolution issues.
- **Build tool differences**: Upstream may use a different Vite config, Tailwind config, or plugin setup. The fork's `vite.js` and `packages/app/vite.config.ts` will be replaced by upstream's.
- **Fork-only package breakage**: Fork-only packages (`push`, `shared`, etc.) may import from `@opencode-ai/app` or `@opencode-ai/ui` and break if exports changed. These will need to be fixed in Phase 5.

**Verification:**
- `bun run typecheck` passes (or passes with only fork-only-package errors that are expected)
- `bun run --cwd packages/app build` produces a build
- The app renders when started with `bun run --cwd packages/app dev`
- Upstream features are visible: command palette, titlebar tabs, new timeline, settings V2
- V1 layout (legacy) is accessible and shows workspaces

**Estimated effort:** High. This is the most disruptive phase. Expect significant time on dependency resolution and import fixes.

---

### Phase 4: V1/V2 Layout Toggle

**Goal:** Make the V1/V2 layout toggle always available to all users, not just pre-existing profiles. Both layouts should be accessible from Settings.

**Status:** Pending

**Prerequisites:** Phase 3 complete (upstream app is building).

**Context:** Upstream added a layout toggle in v1.17.19 (July 2026). It's in Settings > General, implemented as `layoutTransitionAvailable()` gated by `layoutTransitionEligible`. The eligibility check was designed so that only users who had the app before V2 can see the toggle. New users are forced into V2. We want the toggle visible to everyone.

**Detailed steps:**

1. **Locate the eligibility mechanism**
   - Find `layoutTransitionAvailable` and `layoutTransitionEligible` in `packages/app/src/context/settings.tsx`
   - Find where the toggle UI is rendered in `packages/app/src/components/settings-v2/general.tsx`
   - Find the `shouldEnableNewLayout` function that auto-enables V2 based on version cutoff
   - Understand the full flow: how the setting is stored, read, and applied

2. **Make eligibility always true**
   - Modify the eligibility check so `layoutTransitionEligible` is always `true`
   - Or modify `layoutTransitionAvailable()` to always return `true`
   - The goal: every user sees the toggle, regardless of profile age or version history
   - Keep the toggle UI as-is — it already works, it's just gated

3. **Verify both layouts render**
   - Start the app and go to Settings > General
   - Confirm the layout toggle is visible
   - Switch to V1 (legacy layout) — verify workspaces, sidebar, multi-project view work
   - Switch to V2 (new layout) — verify the new interface renders
   - Confirm the setting persists across restarts

4. **Ensure V1 layout includes the context tab and session changes**
   - The user specifically wants the context inspector and session changes/review features maintained
   - These exist in the V1 layout's session side panel (review tab + context tab)
   - Verify they render correctly in the upstream V1 layout

**Files involved:**
- `packages/app/src/context/settings.tsx` — eligibility logic
- `packages/app/src/components/settings-v2/general.tsx` — toggle UI
- Possibly `packages/app/src/pages/layout.tsx` (legacy layout entry)
- Possibly `packages/app/src/pages/layout-new.tsx` (new layout entry)

**Risks:**
- The eligibility mechanism may be more deeply integrated than expected (e.g., tied to onboarding flow, desktop renderer, or migration scripts)
- The V1 layout may have dependencies on older APIs that are partially removed
- The toggle may have a sunset mechanism that auto-disables V1 after a date

**Verification:**
- Toggle is visible in Settings > General for a fresh profile
- Both V1 and V2 layouts render correctly
- V1 layout shows workspaces
- V1 layout shows context inspector and session changes/review
- Setting persists across app restarts

**Estimated effort:** Low to Medium. The mechanism exists; we're just removing the eligibility gate.

---

### Phase 5: Mobile Feature Porting

**Goal:** Port the fork's mobile-specific features onto the upstream codebase. This is the bulk of the customization work.

**Status:** Pending

**Prerequisites:** Phase 3 complete (clean upstream base), Phase 4 complete (V1/V2 toggle working).

**Approach:** Work through each feature category systematically. Each sub-phase is independently testable. Features that can be layered as separate providers are preferred over features that require modifying upstream files.

**Sub-phases:**

#### 5a. Platform Contract Extensions

**Goal:** Extend the platform context to support mobile capabilities (push, voice, notifications).

**What to port:** The fork extended `context/platform.tsx` with mobile-specific methods: push permission, pairing state, relay configuration, notification kind metadata. Upstream's platform contract is simpler (web/desktop only).

**Steps:**
- Compare upstream's `context/platform.tsx` with the fork's version (available in git history or the backup branch)
- Add the mobile-specific methods and types to upstream's platform contract
- Ensure web/desktop implementations safely ignore the mobile-only extensions
- The Tauri wrappers (`packages/ios`, `packages/android`) implement these methods natively

**Files:**
- `packages/app/src/context/platform.tsx`

**Risk:** Upstream's platform contract may have changed structure. Need to merge, not replace.

#### 5b. Push Notification Infrastructure

**Goal:** Add push notification support as a layered provider that subscribes to the event stream without modifying upstream's event system.

**What to port:** The fork has a complete push system: push relay URL normalization, push pairing flow, push plugin commands, push test flow, notification click handling with channel-aware routing, notification delivery with mobile push kind tagging.

**Steps:**
- Port the push utility files: `utils/push-relay-url.ts`, `utils/push-pair.ts`, `utils/push-plugin.ts`, `utils/push-test.ts`, `utils/notification-click.ts`
- Port the push context providers: `context/push-relay.tsx`, `context/push-pair.tsx`
- Port the notification context: `context/notification.tsx` (with mobile push kind tagging)
- Create a push notification provider that subscribes to upstream's event stream (`serverSDK.event.listen()`) and triggers notifications
- Wire the push providers into the app entry point (`app.tsx`) around the layout

**Files:**
- `packages/app/src/utils/push-relay-url.ts` (new — fork-only)
- `packages/app/src/utils/push-pair.ts` (new — fork-only)
- `packages/app/src/utils/push-plugin.ts` (new — fork-only)
- `packages/app/src/utils/push-test.ts` (new — fork-only)
- `packages/app/src/utils/notification-click.ts` (new — fork-only)
- `packages/app/src/context/push-relay.tsx` (new — fork-only)
- `packages/app/src/context/push-pair.tsx` (new — fork-only)
- `packages/app/src/context/notification.tsx` (modify upstream's version to add mobile kinds)
- `packages/app/src/app.tsx` (add push providers around layout)

**Key principle:** The push provider subscribes to events externally. It does NOT modify `server-sdk.tsx` or `server-sync.tsx`.

#### 5c. Mobile Session Tabs

**Goal:** Port the mobile tab system (session / changes / context) into the upstream session layout.

**What to port:** The fork added `SessionMobileTabs` with three tabs: "session" (chat), "changes" (review/diffs), "context" (context inspector). This is the primary mobile navigation. Upstream's layout is desktop-oriented (side panels, titlebar tabs).

**Steps:**
- Port `pages/session/session-mobile-tabs.tsx` from the backup branch
- Port the mobile tab state management from `pages/session.tsx` (store.mobileTab)
- Integrate into upstream's session page layout
- Ensure the context tab and changes/review tab render correctly within the mobile tab system
- The context inspector (`components/session/session-context-tab.tsx`) and review tab (`pages/session/review-tab.tsx`) come from upstream's wholesale copy; they need to be wired into the mobile tabs

**Files:**
- `packages/app/src/pages/session/session-mobile-tabs.tsx` (new — fork-only)
- `packages/app/src/pages/session.tsx` (modify to add mobile tab logic)

**Risk:** Upstream's session page structure is significantly different (2412 lines of diff). The mobile tabs need to fit into the new structure, not the old one.

#### 5d. Mobile Composer Adjustments

**Goal:** Port mobile-specific composer positioning and keyboard handling.

**What to port:** The fork adjusted the composer region for mobile (closer to bottom edge, mobile keyboard affordances, editor DOM helpers for touch input).

**Steps:**
- Port the mobile composer positioning from `pages/session/composer/session-composer-region.tsx`
- Port the mobile keyboard affordances from `components/prompt-input.tsx`
- Port the editor DOM helpers from `components/prompt-input/editor-dom.ts`
- Integrate into upstream's composer components (which may have a different structure)

**Files:**
- `packages/app/src/pages/session/composer/session-composer-region.tsx` (modify)
- `packages/app/src/components/prompt-input.tsx` (modify — add mobile affordances)
- `packages/app/src/components/prompt-input/editor-dom.ts` (new — fork-only)

#### 5e. Mobile Header and Refresh

**Goal:** Port the mobile session header with the mobile-only refresh button.

**What to port:** The fork added a mobile refresh button to the session header (replacing a keyboard shortcut that doesn't exist on mobile).

**Steps:**
- Port the mobile refresh button from `components/session/session-header.tsx`
- Integrate into upstream's session header

**Files:**
- `packages/app/src/components/session/session-header.tsx` (modify)

#### 5f. Mobile Settings UI

**Goal:** Port the mobile notification settings panel (push permission, pairing, relay configuration).

**What to port:** The fork added a "Phone" tab to the settings dialog with mobile push setup UI.

**Steps:**
- Port `components/settings-mobile-notifications.tsx` and related files
- Port `components/settings-mobile-notifications-data.ts` and helpers
- Add the phone tab to the settings dialog (`components/dialog-settings.tsx`)
- Ensure the tab only appears on mobile platforms

**Files:**
- `packages/app/src/components/settings-mobile-notifications.tsx` (new — fork-only)
- `packages/app/src/components/settings-mobile-notifications-data.ts` (new — fork-only)
- `packages/app/src/components/dialog-settings.tsx` (modify — add phone tab)

#### 5g. Server Connection Screen

**Goal:** Port the mobile server setup screen (the fork has a custom server configuration UI for mobile).

**What to port:** The fork added `components/server/server-config-screen.tsx` and `components/server/server-form.tsx` for mobile server setup.

**Steps:**
- Port the server config screen and form
- Integrate into the app's server connection flow
- Ensure it works with the fork's direct-fetch health check

**Files:**
- `packages/app/src/components/server/server-config-screen.tsx` (new — fork-only)
- `packages/app/src/components/server/server-form.tsx` (new — fork-only)
- `packages/app/src/utils/server-health.ts` (modify — fork's direct-fetch health check)

#### 5h. Pull-to-Refresh and Mobile UX

**Goal:** Port pull-to-refresh and other mobile UX touches.

**What to port:** Pull-to-refresh indicator, hook, scroll spy, safe area handling, mobile header/sidebar.

**Steps:**
- Port `components/pull-to-refresh-indicator.tsx`
- Port `hooks/use-pull-to-refresh.ts`
- Port `components/mobile/` directory (mobile-header, mobile-sidebar, safe-area, tab-bar)
- Port `pages/session/scroll-spy.ts`
- Port `pages/session/session-timeline-header.tsx`

**Files:**
- `packages/app/src/components/pull-to-refresh-indicator.tsx` (new — fork-only)
- `packages/app/src/hooks/use-pull-to-refresh.ts` (new — fork-only)
- `packages/app/src/components/mobile/` (new directory — fork-only)
- `packages/app/src/pages/session/scroll-spy.ts` (new — fork-only)
- `packages/app/src/pages/session/session-timeline-header.tsx` (new — fork-only)

#### 5i. Internationalization

**Goal:** Add mobile-specific translation strings to all locale files.

**What to port:** Each of the 17 locale files has 3 divergence markers for: mobile refresh action labels, fork-only settings navigation labels, and mobile push permission/relay/pairing/routing strings.

**Steps:**
- For each locale file in `packages/app/src/i18n/`, add the mobile-specific strings
- Ensure new locale files from upstream (e.g., `uk.ts`) also get the mobile strings
- Run i18n parity tests

**Files:**
- All files in `packages/app/src/i18n/` (17+ files)

#### 5j. Entry Point Integration

**Goal:** Wire all mobile providers and features into the app entry points.

**What to port:** The fork modified `app.tsx`, `entry.tsx`, and `index.ts` to include push providers, platform exports, and mobile-specific initialization.

**Steps:**
- Add push providers to `app.tsx` (around the Layout component)
- Add platform exports to `index.ts` (for Tauri wrappers to consume)
- Ensure `entry.tsx` handles both web (browser notifications) and mobile (push metadata) paths

**Files:**
- `packages/app/src/app.tsx` (modify — add push providers)
- `packages/app/src/entry.tsx` (modify — handle mobile notify metadata)
- `packages/app/src/index.ts` (modify — add push/platform exports)

**Estimated effort (Phase 5 overall):** High. This is the bulk of the customization work. Each sub-phase is independently testable, which helps manage complexity.

---

### Phase 6: Event System Re-implementation

**Goal:** Evaluate each of the fork's event system mobile fixes against upstream's new architecture, and re-implement those that are still necessary. Prefer wrapper providers over inline patches.

**Status:** Pending

**Prerequisites:** Phase 3 complete (upstream event system in place), Phase 5 partially complete (mobile platform contract available).

**Context:** Upstream completely rewrote the app-to-server sync layer. The fork's fixes were built on the old architecture. Each fix must be evaluated: does upstream's new system handle this scenario? If not, can it be added as a wrapper? Or does it require modifying upstream's code?

**Evaluation matrix (each fix must be assessed):**

#### 6a. Mobile Resume Handling

**Old fix:** Added `visibilitychange`, `focus`, `online`, and `opencode:resume` event listeners that trigger stream reconnection and data refresh when the app returns to foreground.

**Upstream status:** Only has `pageshow` handler (`resumeStreamAfterPageShow()`). No visibility/focus/online/opencode:resume handling.

**Evaluation needed:**
- Does upstream's `pageshow` handler cover the mobile resume case?
- Can we add a separate resume provider that triggers the same reconnection logic without modifying `server-sdk.tsx`?
- Or does the reconnection logic need to be called from within the event stream loop?

**Implementation approach (preferred):** Create a `MobileResumeProvider` that:
- Listens for `visibilitychange`, `focus`, `online`, `opencode:resume`
- On resume, calls the same reconnection method that `pageshow` triggers
- If the reconnection method is accessible from outside `server-sdk.tsx` (e.g., via context), this is a clean wrapper
- If not, we need to expose it or modify `server-sdk.tsx` minimally

#### 6b. Session Warm-Up on Prompt

**Old fix:** When a `permission.asked` or `question.asked` event arrives for a session that isn't loaded yet, call `warmSessions()` to hydrate the session chain so the prompt dock can attach.

**Upstream status:** No equivalent. Unknown if the new architecture handles this scenario.

**Evaluation needed:**
- Does upstream's new `server-sync.tsx` / `server-session.ts` lazy-load sessions on demand?
- If the new architecture loads sessions on access, warm-up may be unnecessary
- If not, can we add a warm-up call as an event subscriber?

#### 6c. Enhanced Event Coalescing

**Old fix:** Added `staleDeltas` Set to track and skip stale delta events, plus a heartbeat timeout (15s) that aborts stale streams.

**Upstream status:** Has basic `coalesceServerEvents()` but no stale delta tracking or heartbeat.

**Evaluation needed:**
- Is stale delta tracking still necessary with the new architecture?
- Does the new event reducer handle deltas differently?
- Can coalescing enhancements be added as a middleware layer?

#### 6d. Detached Todo Copies

**Old fix:** `copyTodos()` returns detached arrays so resume-triggered refreshes don't reuse reconciled references that drift between store and cache.

**Upstream status:** No global todo cache, no copying logic.

**Evaluation needed:**
- Does the new `server-session.ts` / `server-session-v2-reducer.ts` handle todo state differently?
- Is the drift problem still present with the new architecture?
- If yes, can we add a todo store wrapper?

#### 6e. Eager Refresh on Resume

**Old fix:** `refreshOnResume()` with cooldown triggers `queue.refresh()` and `queueDirectories(true)` when the app returns to foreground.

**Upstream status:** No equivalent.

**Evaluation needed:**
- Does the new sync layer have a queue that can be triggered externally?
- Can this be implemented as a separate provider that calls into the sync layer's public API?

#### 6f. Health Polling

**Old fix:** Polls server health every 10 seconds via `setInterval`.

**Upstream status:** Has `useServerHealth` but polling behavior unclear.

**Implementation:** Create a health polling provider that wraps upstream's health check with a timer. This is cleanly layerable.

**Steps for Phase 6:**
1. For each fix (6a-6f), read upstream's implementation and evaluate
2. Determine: unnecessary / layerable / requires patch
3. Implement unnecessary fixes: skip (document why)
4. Implement layerable fixes: create separate provider files
5. Implement patch-required fixes: modify upstream files minimally, document each change
6. Test each fix individually on a mobile device or emulator

**Files potentially involved:**
- `packages/app/src/context/server-sdk.tsx` (may need modification for resume)
- `packages/app/src/context/server-sync.tsx` (may need modification for warm-up)
- New files: `packages/app/src/context/mobile-resume-provider.tsx` (if layerable)
- New files: `packages/app/src/context/mobile-health-polling.tsx` (layerable)
- `packages/app/src/context/todo-store.ts` (if detached copies still needed)

**Risks:**
- Upstream's new architecture may be resistant to external hooks
- Some fixes may require modifying upstream's core files, creating ongoing maintenance
- The evaluation may reveal that some fixes are MORE necessary than before (if the new architecture has regressions)
- Testing mobile resume/background behavior requires a real device or emulator

**Verification:**
- Open the app, start a session, send a message
- Background the app (switch to another app), wait for new responses
- Return to the app — updates should appear immediately without tab switching
- Test with poor network connectivity
- Test with server restart while app is backgrounded

**Estimated effort:** High. This is the most technically challenging phase. The evaluation alone may take significant time.

---

### Phase 7: Verification and Testing

**Goal:** Comprehensive testing to verify the upstream sync is complete and no mobile features have regressed.

**Status:** Pending

**Prerequisites:** Phases 3-6 complete.

**Test categories:**

#### 7a. Automated Tests

- `bun run typecheck` — passes across all packages
- `bun run lint` — passes (oxlint at repo root)
- `bun run --cwd packages/app test:unit` — unit tests pass
- `bun run --cwd packages/app test:e2e` — e2e tests pass (may need fixture updates)
- `bun run --cwd packages/push test` — push service tests pass
- `bun run --cwd packages/push-relay test` — relay tests pass

#### 7b. Mobile Feature Tests (Manual)

Each must be tested on a real device or emulator:

1. **Mobile tabs**: Switch between session / changes / context tabs. Each tab renders correctly.
2. **Live updates**: Start a session, send a message. While the assistant responds, switch to another tab and back. Updates should appear without manual refresh. Background the app and return — updates should be current.
3. **Context inspector**: Open the context tab. Verify token usage, context breakdown by role, system prompt, and raw messages all render.
4. **Session changes/review**: Open the changes tab. Verify file diffs render with session/turn modes. File tree shows changed files.
5. **Push notifications**: Pair a device, send a test push. Verify notification arrives. Tap notification — app opens to correct session.
6. **Voice input**: Test voice input if available on the platform.
7. **V1/V2 toggle**: Switch between layouts in settings. Both render correctly. V1 has workspaces.
8. **Server connection**: Connect to a server via the mobile setup screen. Verify health polling works.
9. **Pull-to-refresh**: Pull down on the session list. Verify refresh indicator and data reload.
10. **Composer**: Type a message, add context items, attach files. Verify mobile keyboard doesn't cover the input. Submit works.

#### 7c. Regression Tests

- Verify no upstream features are broken by mobile customizations
- Verify the app works on both web (browser) and mobile (Tauri webview)
- Verify fork-only packages (`push`, `push-relay`, `shared`) still integrate correctly

**Estimated effort:** Medium. Mostly manual testing on devices.

---

### Phase 8: Future V2 Migration

**Goal:** Track upstream's V2 layout progress and eventually migrate to V2 when it reaches feature parity (especially workspaces).

**Status:** Future (not started)

**When to start:**
- When upstream adds workspaces to the V2 layout
- When upstream's V2 layout reaches acceptable feature parity
- When upstream announces V1 sunset (the toggle is temporary)

**What it involves:**
- Port any remaining V1-only features into V2
- Test V2 layout on mobile
- Eventually remove V1 layout code
- Follow upstream's V1 deletion (PR #39485)

**Note:** This phase is intentionally brief because it's speculative. The V2 landscape will change significantly by the time we get here.

---

## Risk Register

| # | Risk | Impact | Probability | Mitigation |
|---|---|---|---|---|
| R1 | Dependency version conflicts during wholesale copy | Build fails | High | Careful version resolution; pin critical deps; test incrementally |
| R2 | SDK incompatibility (generated types mismatch) | Runtime errors | Medium | Regenerate SDK from upstream's OpenAPI spec |
| R3 | Event system fixes can't be layered | Ongoing patch maintenance | Medium | Evaluate each fix; prefer wrapper providers; document patches |
| R4 | Mobile tabs don't fit upstream's session layout | UI breakage | Medium | Adapt tab logic to new structure; test early |
| R5 | Upstream removes V1 before we're ready | Loss of V1 features | Low | Pin upstream reference; monitor PR #39485 |
| R6 | Push notification provider can't subscribe to event stream | Push breaks | Low | `serverSDK.event.listen()` is a public API; should be stable |
| R7 | Tauri wrappers break on new app exports | Mobile builds fail | Medium | Update wrapper imports; test iOS/Android builds |
| R8 | i18n parity tests fail with new locales | Test failures | Low | Add mobile strings to all locales including new ones |
| R9 | Performance regression from upstream changes | Slow app | Low | Benchmark before/after; upstream optimized for performance |
| R10 | Fork-only packages can't import from new app/ui | Build errors | Medium | Fix import paths; update package exports |

---

## Key Reference Files

### Strategy and planning documents
- `UPSTREAM_ROADMAP.md` — high-level strategy, phased approach, preservation requirements
- `SYNC_CHECKLIST.md` — Phase 2 file-level classification (198 take / 38 keep / 39 divergence / 86 inspect / 22 v2)
- `CODEMAP.md` — this document (detailed execution plan)

### Git references
- `upstream/dev` — upstream opencode at commit `32f278b48` (2026-08-01)
- `backup/pre-wholesale-sync` — backup branch created before Phase 3
- `6b9ce5e63` — the fork's last upstream sync (March 2026, ~v1.15.x)

### Key upstream files to understand (read via `git show upstream/dev:<path>`)
- `packages/app/src/context/settings.tsx` — V1/V2 toggle eligibility
- `packages/app/src/context/server-sdk.tsx` — event stream client
- `packages/app/src/context/server-sync.tsx` — sync layer
- `packages/app/src/context/server-session.ts` — session state management
- `packages/app/src/pages/layout.tsx` — V1 (legacy) layout
- `packages/app/src/pages/layout-new.tsx` — V2 (new) layout
- `packages/app/src/pages/session.tsx` — main session page
- `packages/app/V1_API_MIGRATION.md` — API migration checklist

### Key fork-only files to port (from backup branch)
- `packages/app/src/context/global-sdk.tsx` — old event system (reference for re-implementation)
- `packages/app/src/context/global-sync.tsx` — old sync layer (reference)
- `packages/app/src/context/sync.tsx` — old session sync (reference)
- `packages/app/src/pages/session/session-mobile-tabs.tsx` — mobile tabs
- `packages/app/src/context/push-pair.tsx` — push pairing
- `packages/app/src/context/push-relay.tsx` — push relay
- `packages/app/src/utils/notification-click.ts` — notification routing
- `packages/app/src/components/settings-mobile-notifications.tsx` — push settings UI
