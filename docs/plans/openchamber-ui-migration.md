# Implementation Plan: Replace the anemos Frontend UI with OpenChamber's UI

- **Date:** 2026-09-01
- **Repo:** `tidy-island` (anemos mobile fork of `sst/opencode`), branch `opencode/tidy-island`, synced to `origin/main`
- **Reference clone (read-only):** `/tmp/opencode/openchamber` — upstream `https://github.com/openchamber/openchamber`, vendored candidate commit **`2c8ae9a`** (`v1.22.0-3-g2c8ae9a`), MIT licensed
- **Status of the working tree:** there is **uncommitted voice/whisper-removal work in progress** (see §3.1). This plan is designed so no phase edits the files that work touches until well after it should have landed.

---

## 0. Executive Summary

We are replacing the SolidJS frontend in `packages/app` (plus its `packages/session-ui` component library and the Solid token library `packages/ui`) with OpenChamber's React 19 browser UI, adapted to run directly against our `opencode serve` backends from the existing native shells (iOS Swift/WKWebView app, Android Tauri app).

The end state:

- A new vendored package `packages/chamber-ui` (OpenChamber `packages/ui` + the mobile entry shell from `packages/web`), patched to be browser/Tauri-neutral and connected **directly** (absolute base URL + bearer token) to our opencode backends — the same architecture our current app uses, and the same architecture OpenChamber's own Capacitor mobile app uses.
- The existing `entry-ios.tsx` / `entry-android.tsx` mobile-entry contract is preserved in spirit: React entries in the new package render OpenChamber's `MobileApp` through an adapter that maps our Platform contract (notify / haptic / share / storage / deep links / resume / push pairing) onto OpenChamber's `RuntimeAPIs` + runtime abstractions, reusing the existing framework-agnostic `bridge.ts` / storage modules in each mobile package.
- Both frontends coexist behind a build-time `FRONTEND` switch in `packages/ios` and `packages/android`; the Solid app remains the default until a final cutover phase, so **iOS/Android builds never break on intermediate commits**.
- Phase-1 scope is the pure-opencode-SDK core (chat, sessions, composer, providers/models, instance connect). Express-server-dependent features (fs browsing, git surface, terminal, tunnels/QR, knowledge/recaps, scheduled tasks, agent memory, browser control, dev servers, GitHub/Linear, dictation/TTS, chamber config/plugins/skills) are cut initially via a feature registry, with a documented disposition each.

Why: our Solid app is a growing divergence burden (see `SYNC_CHECKLIST.md`, `UPSTREAM_ROADMAP.md` — 198 TAKE / 38 KEEP-CUSTOM / 39 KEEP-DIVERGENCE / 86 INSPECT files vs upstream), while OpenChamber is a very active (≈139 releases/yr), MIT, shell-agnostic React UI with a first-class mobile surface, virtualized timeline, worker-based markdown, and multi-instance support. Buying their UI and carrying a small, documented patch set is cheaper than continuing to maintain ours.

---

## 1. Findings — Our Current App (verified in-repo)

### 1.1 Packaging & build

| Fact | Detail |
|---|---|
| App package | `packages/app`, name `@opencode-ai/app`. Exports: `"." → src/index.ts`, `./desktop-menu`, `./updater`, `./wsl/types`, `./vite → vite.js`, `./index.css` |
| Vite plugin | `packages/app/vite.js` — `vite-plugin-solid` + `@tailwindcss/vite` + `@` alias (→ `packages/app/src`) + `worker.format: "es"` + oc-theme-preload inline script. **Mobile packages import this plugin** (`import appPlugin from "@opencode-ai/app/vite"`). |
| iOS shell | **Native Swift app**, not Tauri: `packages/ios/OpenCode/*.swift` (e.g. `OpenCodeApp.swift`, `PlatformBridge.swift`), fastlane `script/beam` for private TestFlight. Its vite config (`packages/ios/vite.config.ts`, port 1421, `base: "./"`, `publicDir: "../app/public"`) builds the entry into **`packages/ios/WebAssets/`** — and WebAssets (built, hashed JS chunks) **are committed to git** (visible as deletions in the current `git status`). |
| Android shell | **Tauri**: `packages/android/src-tauri/tauri.conf.json` → `frontendDist: "../dist"`, `devUrl: http://localhost:1422`, `beforeBuildCommand: "bun run build"` (the android package's own vite build → `outDir: "dist"`). Rust bridge plugin at `packages/android/src-tauri/mobile-bridge/`. |
| Mobile entries | `packages/ios/src/entry-ios.tsx` (218 lines), `packages/android/src/entry-android.tsx` (254 lines). Both import from `@opencode-ai/app`: `AppBaseProviders`, `AppInterface`, `PlatformProvider`, `ServerConnection`, `type NotifyOpts`, `type Platform`, plus their own `bridge`, storage (`createBridgeStorage` / `createTauriStorage`), and `Onboarding`. |
| Bridges are framework-agnostic (verified) | `packages/ios/src/bridge.ts` (151 lines, no solid/react, window-bridge root), `packages/ios/src/ios-storage.ts` (83 lines), `packages/android/src/bridge.ts` (49 lines, `@tauri-apps/*` only), `packages/android/src/storage.ts` (96 lines). **These are directly reusable from React.** |
| Monorepo | bun `1.3.13` (`packageManager`, husky-enforced), workspaces `packages/*` + `packages/sdk/js`, catalog deps, `patches/` + `patchedDependencies` (bun patch precedent), root `oxlint`, `turbo typecheck` gate, `bunfig.toml` forbids root tests. |
| Upstream-sync precedent | `SYNC_CHECKLIST.md` + `UPSTREAM_ROADMAP.md` already document divergence-audit methodology vs upstream `opencode` — we will mirror this for chamber tracking. |

### 1.2 Platform contract (must keep working)

`packages/app/src/context/platform.tsx` (247 lines) exports the `Platform` interface via `createSimpleContext` (`PlatformProvider` / `usePlatform`) plus types `PushCred`, `PairInfo`, `PushPrefs`, `PushDiag`, `PushState`, `NotifyOpts`, `FatalRendererErrorLog`, `DisplayBackend`. Surface:

- Shell: `openExternal`, `openLink`, `notify` (with `NotifyOpts`), `back`, `forward`, `restart`, optional `haptic`, `share`
- Storage: `storage(name)` — **per-workspace storage namespaces** (caveat §3.9)
- Server prefs: `getDefaultServer` / `setDefaultServer`
- Fork push methods: `pushState`, `requestPushPermission`, `beginPushPairing`, `getPushPairing`, `setPushPreferences`, `setPushRelayURL`, `setPushCredentials`, `clearPushPairing`, `testPush`, `openSystemSettings` (pairing logic in `packages/app/src/utils/push-pair.ts` + `context/push-pair.tsx`; UI in `src/components/settings-mobile-notifications.tsx`; `runPushSetup` etc. re-exported from `src/index.ts`)

Window events consumed (in `packages/app/src/context/push-pair.tsx`, `context/server-sdk.tsx`, `pages/layout/deep-links.ts`): `opencode:resume`, `opencode:transcription` (**being removed by the in-flight voice work**), `opencode:deep-link` (detail.urls).

### 1.3 Boot & backend usage

- `packages/app/src/entry.tsx`: server URL from `VITE_OPENCODE_SERVER_HOST`/`VITE_OPENCODE_SERVER_PORT` (default `localhost:4096`) or `location.origin`; persisted default-server key **`opencode.settings.dat:defaultServerUrl`**; `auth_token` query param → server auth (stripped from URL after use).
- Protocol negotiation: `packages/app/src/utils/server-protocol.ts` (36 lines; probes `/global/health` vs `/api/health` → `"v1" | "v2"`) and `server-protocol-resilient.ts` (59 lines; `/api/config` must return JSON else downgrade to v1 — guards against the incomplete v2 migration).
- SDK: workspace `packages/sdk/js` is `@opencode-ai/sdk` **1.18.11** with both `src/gen` (v1) and `src/v2/gen`; v1/v2 hybrid usage throughout.
- **Installed backend CLI: `opencode 1.18.25`** — exactly the version OpenChamber's UI pins (`@opencode-ai/sdk@1.18.25`, `/v2` imports). See compat matrix §1.7.

### 1.4 i18n, theming, tests

- i18n: 18 locale files in `packages/app/src/i18n/` — `en, de, es, fr, ja, ko, pl, tr, uk, zh, zht, br, ar, ru, th, no, da, bs` + `parity.test.ts`.
- Theming: `packages/ui` (`@opencode-ai/ui`) Solid token library with `generate:tailwind`; **its only consumer is `packages/session-ui`**, which in turn is only consumed by `packages/app` (verified) — so the whole `app → session-ui → ui` chain can retire together.
- Tests: `bun test --conditions=solid --preload ./happydom.ts` (note `test:unit` passes `--only-failures`, so scope with the direct command per AGENTS.md); Playwright e2e under `packages/app/e2e/{smoke,regression,user-story,performance}` with fixtures per `packages/app/e2e/AGENTS.md` (import `test`/`expect` from `../fixtures`; `withSession`/`trackSession`/`trackDirectory`; env `PLAYWRIGHT_SERVER_HOST/PORT` default `127.0.0.1:4096`, `PLAYWRIGHT_PORT` default 3000).

---

## 2. Findings — OpenChamber (verified in `/tmp/opencode/openchamber` @ `2c8ae9a`)

### 2.1 Architecture

- Packages: `web` (SPA shell + Express server), `ui` (the shell-agnostic React UI lib), `mobile` (Capacitor app), `electron`, `vscode`, `docs`. Root: bun `1.3.14`, engines `node >=22`.
- `packages/ui` (`@openchamber/ui@1.22.0`): **build script is only `tsc --noEmit`** — it is a lib, not an app. The runnable SPA entries (HTML + vite config) live in **`packages/web`** (`index.html`, **`mobile.html`**, `mini-chat.html`, `vite.config.ts`, `src/`). Vendoring must therefore take `packages/ui` **plus** the mobile entry bits of `packages/web`.
- Runtime abstraction (the key to direct-connect): `packages/ui/src/lib/{runtime-url,runtime-fetch,runtime-auth,runtime-auth-expiry,runtime-switch}.ts` + `src/lib/opencode/client.ts` — `DEFAULT_BASE_URL = import.meta.env.VITE_OPENCODE_URL || "/api"` (client.ts:44), absolute-URL + bearer-token injection supported, runtime URL switching for multi-instance. **`process.cwd()` leak at client.ts:584–585** (fallback config discovery candidate) must be guarded for the browser/Tauri build.
- Surface detection: `src/lib/runtimeSurface.ts` — priority: **explicit `window.__OPENCHAMBER_SURFACE__` stamp → `?surface=mobile|desktop` URL override → Capacitor shell → desktop/VSCode shells → phone-viewport heuristic**. The URL override gives us free mobile-surface testing in a desktop browser.
- Mobile boot: `src/apps/renderMobileApp.tsx` — takes **`apis: RuntimeAPIs`** (injectable runtime APIs), stamps `__OPENCHAMBER_SURFACE__ = 'mobile'` first, preloads markdown renderer, applies device classes pre-paint, installs a widget-snapshot bridge. Native-shell detection is `window.Capacitor?.isNativePlatform?.() === true || location.protocol === 'capacitor:'`; when native: (a) notifications API replaced with a **no-op** (`notifyAgentCompletion: async () => false`), (b) **`SessionAuthGate` is skipped** (native authenticates per-instance via its own connect flow instead). Both behaviors are exactly what we need — but the native detection must be extended to recognize Tauri/Swift shells.
- Mobile app surface: `src/apps/MobileApp.tsx` + a large mobile surface family (`MobileConnectionWelcome`, `MobileInstancesSurface`, `MobileSessionsSheet`, `MobileFilesSurface`, `MobileChangesSurface`, `MobileHeader`, deep links via `src/apps/deepLinks.ts` + `deepLinkNavigation.ts`, connections/secure storage via `src/apps/mobileConnections.ts` using `@aparajita/capacitor-secure-storage`).
- Deep-link scheme is **hardcoded `openchamber://`** (e.g. `openchamber://connect?...` import strings across locale files) — must be remapped to our `opencode://` scheme.
- State/sync: `src/sync/` — `sync-context.tsx`, `global-sync-store.ts`, `session-ui-store.ts` (optimistic mutations, client-generated message IDs reconciled via SSE), `streaming.ts`, `child-store.ts`, `notification-store.ts`, plus `use-sync.ts`. Virtualization: `@legendapp/list` 3.3.8, `@tanstack/react-virtual` 3.14.5, `virtua` 0.49.1.
- Workers: markdown pipeline in `src/components/chat/markdown/markdown-worker.ts` (`markdown-shiki.worker.ts?worker&url`, `type: 'module'`) and diff worker (`@pierre/diffs/worker/worker.js?worker&url`) — needs vite worker bundling (`worker.format: es`, same as our app plugin already does) and CSP-compatible serving in the WebViews.
- i18n: own lib at `src/lib/i18n`, messages as flat key maps split per domain per locale (`<locale>.ts`, `<locale>.settings.ts`, plus domain files). **12 locales: `en, de, es, fr, ja, ko, pl, pt-BR, tr, uk, zh-CN, zh-TW`** (large — e.g. `pl.settings.ts` alone is ~1.7k lines).
- Theming: `ThemeSystemProvider` (`src/contexts/`), CSS-var generation, JSON themes in `src/lib/theme/themes/` (aura, ayu, carbonfox, catppuccin, dracula, fields-of-the-shire, flexoki, gruvbox, jetbrains, kanagawa, … light/dark pairs). Custom brand themes are just additional JSON files — our token palette can be ported as an `anemos` theme.
- Router: custom path registry in `src/lib/router/` (`parseRoute`/`serializeRoute`/`types.ts`) — route gating for feature cuts is a small, central change.
- Capacitor build pattern to replicate for Tauri: `packages/mobile` scripts — `build` = `bun run --cwd ../web build && node scripts/prepare-web-assets.mjs` (copies dist, `mobile.html` → `index.html`), `sync` = build + `cap sync`.

### 2.2 Browser-neutrality problems in `packages/ui` (verified dependency list)

`dependencies` include server/node-only and Capacitor-only packages that must not (or need not) ship in our WebView bundle: `express@^5`, `http-proxy-middleware`, `simple-git`, `ghostty-web` (terminal), `@xenova/transformers` (in-browser ML for browser control), `@capacitor/*` + `@aparajita/capacitor-secure-storage` (mobile-only paths — keep as deps but ensure they are not invoked outside native), plus node types. Strategy: keep the package.json dependency list intact where harmless (workspace install), but **alias/stub the node-only imports at build time** and verify nothing on the mobile render path imports them eagerly.

### 2.3 Express-dependent features (`packages/web/server/lib/*`, verified directory list)

| Chamber feature (server lib) | UI surface | Disposition for us |
|---|---|---|
| `ui-auth` (JWT cookie gate) | `SessionAuthGate` | **Cut for native** (already skipped when native shell detected); for browser dev we run without `--ui-password` |
| Client-token pairing / instance auth | `MobileConnectionWelcome`, `mobileConnections.ts` | **Local** — reuse flow but store our bearer tokens via bridge storage instead of chamber's pairing endpoint |
| `terminal` (+ ghostty-web) | Terminal panel, `MobileChangesSurface` adjunct | **Cut initially** — our current app's PTY usage is desktop-oriented |
| fs browsing (`/api/fs/*`) | `MobileFilesSurface`, file pickers | **Reimplement later** over opencode SDK file APIs or Tauri fs; cut from phase 1 |
| git (`/api/git/*`) | `MobileChangesSurface` (diff review) | **Cut initially**; later candidate: port to opencode SDK `vcs` endpoints (our Solid app already does VCS diffs via SDK) |
| `tunnels` + QR | remote-instance connect | **Cut** (we connect over LAN/localhost directly) |
| `session-knowledge`, `session-goal`, `session-assist`, `session-folders` | recaps/knowledge/folder UI | **Cut initially** |
| `scheduled-tasks` | tasks UI | **Cut initially** |
| agent-memory, browser-control, dev-servers | respective panels | **Cut initially** |
| github / linear integrations | integration settings | **Cut** |
| `tts`, `text`, dictation | voice features | **Cut** — aligns with the in-flight voice/whisper removal |
| push (vapid + APNs relay), `relay` | notification settings | **Reimplement** from opencode SSE events + our fork's push relay/pairing (phase 5) |
| chamber config / settings / themes / plugins / skills / snippets routes | settings surfaces | **Reimplement minimal subset** (appearance/theme selection is largely client-side via `startAppearanceAutoSave` etc. — verify no `/api` dependency when cutting) |
| `quota`, `security`, `small-model`, `system-prompt`, `skills-catalog`, `walkthrough` | assorted | **Cut initially** |

**Pure-opencode-SDK core (kept, phase 1):** sessions, messages/parts streaming (SSE), prompts, commands, permissions/questions, providers/auth incl. OAuth, config, models, agents, tools, MCP — all through `createRuntimeOpencodeClient` with absolute base URL + bearer token.

### 2.4 Interesting details worth keeping in mind

- Mobile locks transport to **SSE** (`runtime-socket.ts` explicitly notes platform WebSocket rejection on `capacitor://` origins) — matches our WebView constraints.
- 30s timeout on non-streaming requests in their client — check it fits our long config/model calls.
- The UI persists appearance/typography/model prefs via auto-save modules (`startAppearanceAutoSave`, `startTypographyWatcher`, `startModelPrefsAutoSave`) — localStorage-based; confirm none of the cut routes are load-bearing for these.
- `apps/mobileWidgetSnapshot.ts` exposes a widget-snapshot bridge for iOS home-screen widgets — a nice future win for our Swift shell.
- Chamber's web package also has `mini-chat.html` (Electron mini chat) — out of scope, but shows multi-entry vite setup precedent.

### 2.5 Compat matrix (verified versions)

| Component | Version | Notes |
|---|---|---|
| Our installed `opencode` CLI backend | **1.18.25** | The thing chamber UI talks to; v2 API complete at this version (same release line chamber pins) |
| Chamber UI pinned SDK | `@opencode-ai/sdk@1.18.25` (npm) | `/v2` imports only — exact match to our backend |
| Our workspace `packages/sdk/js` | 1.18.11 | Used by the Solid app only; **do not** point chamber-ui at it — keep chamber's npm dep to avoid shape skew |
| Their bun / our bun | 1.3.14 / **1.3.13** | Keep ours (packageManager + husky enforce); vendored code doesn't check bun |
| Their engines | `node >=22` | Satisfied by our bun runtime; record in PROVENANCE |
| React / Zustand / Tailwind | 19.1 / 5.0.8 / v4 | New deps in our monorepo (workspace catalog additions) |

---

## 3. Caveats / Things to Worry About (checklist)

1. **Uncommitted voice/whisper-removal work in the tree** — touches `packages/app/src/{context/platform.tsx,context/settings.tsx,index.ts,components/prompt-input.tsx,components/settings-mobile-notifications.tsx,i18n/parity.test.ts}`, `packages/{ios,android}/src/*`, native Swift/Kotlin/Rust bridge files, and **deletes tracked built assets** `packages/ios/WebAssets/*.js`. This plan never edits `packages/app` and defers mobile-shell edits to Phase 8; land the voice work first. If it's still uncommitted when Phase 8 starts, coordinate — `entry-android.tsx`, `bridge.ts`, and the rust `mobile-bridge` are shared touchpoints.
2. **SDK compat** — chamber is **v2-only**. Our resilient v1 downgrade exists because some servers had incomplete v2. Any **v1-only backend will not work** with chamber UI. Mitigation: boot-time v2 guard (probe `/api/config` returns JSON, ported from `server-protocol-resilient.ts`) with an explicit "backend too old" screen; old Solid app remains available for edge servers until cleanup. See Open Question 1.
3. **CORS / WebView origin** — direct absolute-URL fetches from the WebView (`tauri://`-style or custom scheme origins on iOS, `http://tauri.localhost` on Android) to `http://localhost:42447` are cross-origin. Our current app already does exactly this, so a working mechanism exists — but it must be re-verified for the chamber bundle (different origin/assets). Recent commit `e43d25412 "add webview CORS debugging skill"` suggests this is a known pain point. Phase 0 spike; do not discover this on a device.
4. **Markdown/diff worker bundling** — `?worker&url` + `type: 'module'` imports require the vendored vite config to set `worker.format: es` (our `packages/app/vite.js` already does; port the setting) and the WebView CSP/asset serving to allow worker script loads. Verify early on both iOS WKWebView and Android WebView.
5. **`process.cwd()` leak** — `client.ts:584` adds `process.cwd()` as a config-discovery candidate when `process` exists. In bundlers with `process` polyfills this can throw or pollute discovery. Guard with a build-time `define` or patch the condition.
6. **Browser-neutrality of `@openchamber/ui`** — `express`, `http-proxy-middleware`, `simple-git` in `dependencies` (see §2.2). Even if tree-shaking keeps them out of the mobile bundle, typecheck/install surface remains; plan for vite `resolve.alias` stubs and possibly splitting heavy deps out of the vendored package.json.
7. **SSE-only transport** — correct for mobile (chamber already locks it), but confirm our backends' SSE headers/heartbeats behave without chamber's Express proxy (they do for our Solid app — same direct connection).
8. **Upstream churn (≈139 releases/yr)** — vendoring means manual re-sync. Mitigation: PROVENANCE + sync checklist + keep the local diff small and mechanical (prefer adapter packages over in-place edits; mark every in-vendor edit with `// ANEMOS-PATCH:` comments).
9. **Storage semantics per workspace** — our Platform `storage(name)` is namespaced per workspace; our default-server key `opencode.settings.dat:defaultServerUrl` must be **migrated** into chamber's instance list (secure storage via `mobileConnections`-equivalent using our bridge storage). One-time migration in the adapter; decide key mapping before Phase 3.
10. **i18n delta** — ours 18 locales vs chamber 12. Language overlap mapping: `zh→zh-CN`, `zht→zh-TW`, `br→pt-BR`; **net-new languages chamber lacks: `ar, ru, th, no, da, bs`** (6). Keys are completely different flat maps — porting is a key-audit + copy exercise, not a rename. Parity test must be ported or replaced.
11. **MIT attribution** — keep upstream `LICENSE`, add `PROVENANCE.md` (repo URL, commit `2c8ae9a`, tag `v1.22.0-3`, local-change list). Required and also our sync ledger.
12. **`packages/ios/WebAssets` is committed to git** — the chamber iOS build will regenerate differently-hashed chunks; Phase 8 must commit them (and we should consider gitignoring built assets in cleanup — separate decision, noted in Phase 10).
13. **Hardcoded `openchamber://` scheme** — remap to `opencode://` in `deepLinks.ts`/`deepLinkNavigation.ts` + locale strings; our Swift/Kotlin shells already emit `opencode://`.
14. **SessionAuthGate / notifications no-op keyed to Capacitor detection** — must be extended to detect Tauri/Swift native shells (or rely on the pre-stamped surface + injected `RuntimeAPIs`), else the browser-only auth gate appears on device or the no-op kills our native notifications.
15. **`auth_token` query-param boot** — our current entry supports `?auth_token=`; chamber's equivalent is the connect-URL import (`openchamber://connect?...`). Keep parity in the adapter (accept `auth_token` on cold start).
16. **Feature-cut discoverability** — chamber has no generic feature-flag system (verified); we introduce one small registry in the vendored package (see Decision 3) and must sweep settings/nav for orphaned entries pointing at cut routes.
17. **30s non-streaming timeout** in chamber's client — verify provider/model list calls against slow LAN servers still fit.
18. **Turbo/typecheck gates** — vendored package must fit `tsgo -b`/turbo conventions; chamber uses plain `tsc --noEmit` and an eslint setup we don't have (root is oxlint). Wire typecheck into turbo; lint can be excluded initially.

---

## 4. Decision Log

### D1 — Packaging: **Vendor into `packages/chamber-ui` at a pinned upstream commit** (adopted)

- Options: (a) vendor copy; (b) git subtree; (c) npm-published fork.
- **Recommendation: (a) vendor copy** of `packages/ui` + the mobile entry shell from `packages/web` (`mobile.html` + its entry module), at commit `2c8ae9a`, package name kept as **`@openchamber/ui`** (version `1.22.0-anemos.1`) so future upstream diffs stay minimal, consumed as a workspace package.
- Rationale: subtree merges at 139 releases/yr with our necessary in-vendor patches (native detection, scheme, node-dep stubs) would produce unreviewable histories; an npm fork requires publishing infrastructure we lack and still can't express build-time aliasing; vendoring gives full control, matches the repo's existing divergence-tracking culture (`SYNC_CHECKLIST.md`), and the patch surface is small and comment-marked. Cost — manual re-sync — is mitigated by the sync script + checklist (Phase 1 deliverable).
- Alternatives rejected: subtree (merge pain), npm fork (infra + still needs patches), rewriting UI into `packages/app` (loses diff-ability against upstream entirely).

### D2 — Connection architecture: **(a) Direct absolute URL, no middle layer** (adopted)

- Options: (a) UI → direct absolute URL to `opencode serve` backends; (b) bundle trimmed Express sidecar inside the Tauri/native shells; (c) hybrid.
- **Recommendation: (a)** — reuse chamber's runtime abstraction (`runtime-url.ts`, `runtime-auth.ts`, `createRuntimeOpencodeClient`) with `DEFAULT_BASE_URL` resolved from our env (`VITE_OPENCODE_SERVER_HOST/PORT`, default `localhost:4096`, plus the persistent `:42447`), exactly like our Solid app does today and exactly like chamber's own Capacitor app does (absolute URL + bearer token from secure storage, SSE transport).
- Rationale: zero new moving parts on device (no process supervision, ports, or IPC between WebView and a sidecar inside a mobile app); the Express server's value-add routes are all on the cut list anyway; a sidecar can be added later behind the same runtime abstraction if a killer feature demands it (that's the escape hatch that makes (a) strictly dominate (c) today).
- **v1/v2 sub-decision:** chamber UI is v2-only; our installed backend line (1.18.25) matches its pinned SDK. We **require a v2-capable backend** and add a boot-time guard (ported probe from `packages/app/src/utils/server-protocol-resilient.ts`: `/api/config` must return JSON) that renders an explicit "backend too old — update opencode" screen instead of silently breaking. We do **not** port the full v1 fallback into chamber (too large a divergence); v1-only servers keep using the old Solid app until it is retired (Open Question 1).

### D3 — Auxiliary feature scope: **Phase-1 minimal core + explicit cut list + small feature registry** (adopted)

- Phase 1 keeps only the pure-opencode-SDK core (see §2.3 table): sessions/chat/timeline, composer (attachments, slash commands, model/provider/agent selection), instance connect (multi-server), settings basics (instances, providers, models, appearance), i18n, theming.
- **Cut mechanism:** a single `src/features/registry.ts` in the vendored package — a typed map `featureKey → { enabled, reason }` — consulted by (1) the router/route serialization (hide cut routes), (2) nav/command palettes/settings sections (hide entries), and (3) a lazy-import wrapper that renders a "Not available in anemos" stub if a cut surface is reached by URL. Runtime registry (not build-time excludes) first: debuggable, reversible, and immune to import-graph surprises; revisit with build-time tree-shaking only if bundle size demands it (the `@xenova/transformers`/`ghostty-web` class of deps may force per-route lazy loading anyway).
- Rationale: chamber has no existing flag system (verified); one central registry keeps the ANEMOS-PATCH footprint tiny and auditable, and every disposition in §2.3 maps onto it directly.

### D4 — Native integration: **React entries in the vendored package + Platform adapter; old Solid app coexists via `FRONTEND` build switch** (adopted)

- New React entry (`packages/chamber-ui/mobile/entry.tsx` + `mobile.html`) calls `renderMobileApp(apis)` with an **`anemosRuntimeAPIs` adapter** that maps our Platform contract onto chamber's `RuntimeAPIs` and reuses the existing framework-agnostic `packages/{ios,android}/src/{bridge,storage}` modules (verified framework-agnostic, §1.1). Deep links, `opencode:resume`, haptics, share, openExternal wire through the same bridge as today; `opencode://` scheme replaces `openchamber://`.
- **Coexistence:** `packages/ios` and `packages/android` each gain `vite.chamber.config.ts` (selected by `FRONTEND=chamber`) building the chamber mobile entry into the **same output dirs the shells already consume** (`WebAssets/` for iOS, `dist/` for Android) — so `tauri.conf.json`, the Xcode project, `beam`, and the sideload pipeline are untouched. Default (no env var) remains the Solid app. `@opencode-ai/app`'s export surface is not modified at any point before cleanup.
- Rationale: builds and CI stay green on every intermediate commit by construction; the switch is one env var; rollback is "unset the env var". In-place replacement was rejected because it breaks the always-build-green requirement and removes the v1-only-server fallback during transition.

### D5 — Disposition of `packages/app`, `packages/session-ui`, `packages/ui`, i18n, theming (adopted)

- **`packages/app`:** feature-freeze (critical fixes only) from Phase 1 until cutover; deleted in Phase 10 with its unit/e2e/stability/bench suites. The old e2e suite keeps running (it guards the still-default frontend) until the default flips.
- **`packages/session-ui` / `packages/ui`:** `session-ui` is consumed only by `app`; `ui` only by `session-ui` (verified). Both retire in Phase 10. (If anything else starts consuming them meanwhile, Phase 10 scope shrinks accordingly.)
- **i18n:** port all 18 locales. The 12 chamber languages get key-audited ports (mechanical script + manual pass, seeding from chamber's `en.ts` and copying semantics from our locale files); the 6 net-new (`ar, ru, th, no, da, bs`) are written from our existing translations. All 18 land **before cutover** (Phase 6) — shipping fewer locales than the Solid app is a user-visible regression we're not willing to cut over with. Port/replacement of `parity.test.ts` gates this.
- **Theming:** chamber's `ThemeSystemProvider` + JSON themes become the source of truth; our palette ships as an `anemos` JSON theme (light/dark) alongside chamber's built-ins; `@opencode-ai/ui` tokens retire with Phase 10.

### D6 — Repo hygiene (adopted)

- `packages/chamber-ui/LICENSE` (upstream MIT, verbatim) + `packages/chamber-ui/PROVENANCE.md`: upstream repo URL, vendored commit `2c8ae9a` / `v1.22.0-3-g2c8ae9a`, date, and the running list of local changes (each also marked `// ANEMOS-PATCH:` in code).
- `docs/plans/openchamber-ui-migration.md` (this file) is the plan of record; `script/chamber-sync.sh` + `docs/chamber-sync-checklist.md` (Phase 1) regenerate the divergence audit against a fresh upstream tag, mirroring `SYNC_CHECKLIST.md` conventions.
- `.gitignore`: nothing to add for `/tmp/opencode/openchamber` (outside the repo); PROVENANCE records the reference-clone location and refresh command.
- Bun: stay on `1.3.13` (enforced by `packageManager` + `.husky/pre-push`). Their `engines.node >=22` is informational under bun; note it in PROVENANCE. Lint: exclude the vendored package from root `oxlint` initially (upstream is eslint-formatted); typecheck: yes, wire into turbo.

### D7 — Rollout & verification (adopted)

Per repo AGENTS.md, strictly: **browser dev loop first** (chamber dev server against the persistent `:42447` backend, mobile surface via `?surface=mobile` + device toolbar), then **narrowest unit/e2e** (direct `bun test --conditions=…` commands, chamber e2e smoke against `:4096`), then **device** (TestFlight via `beam`, Android build, `scripts/deploy-ipa.mjs` sideload). `bun run typecheck` (turbo, husky-enforced) is the per-commit gate; `bun run --cwd packages/{ios,android} build` must pass on every commit — guaranteed by the `FRONTEND` switch defaulting to the Solid app until Phase 9.

---

## 5. Phased Implementation Plan

> Conventions for every phase: run commands from repo root unless noted; never run tests from repo root (`bunfig.toml` guard); scope unit tests with the direct `bun test --conditions=… --preload ./happydom.ts <file>` command (`test:unit` passes `--only-failures` and cannot be scoped by appending a path); commit each phase separately; `bun run typecheck` green before moving on.

### Phase 0 — Spikes & de-risking (docs only, no product code)

**Goal:** Kill the three biggest unknowns before any vendoring: v2 completeness of target backends, CORS/origin behavior from a WebView-style origin, and a reproducible upstream mobile build.

**Files:** `docs/plans/openchamber-ui-migration.md` (append spike results), nothing else.

**Steps:**
- Probe the persistent backend `:42447` and a fresh `opencode serve --port 4096` (CLI 1.18.25): confirm `/api/health`, `/api/config`, `/v2` session/event endpoints return JSON with correct content-types (reuse the probe technique from `packages/app/src/utils/server-protocol-resilient.ts`; issue raw HTTP via Node `net`/sandbox per AGENTS.md rules — `curl`/`fetch` are blocked).
- CORS spike: from a non-localhost origin (any static server), verify preflight/actual responses for `/api/config` and the SSE endpoint; record which headers the backend sends; consult the recently added webview CORS debugging skill (commit `e43d25412`). Record whether the current Solid app relies on a Tauri origin exemption we must replicate.
- In `/tmp/opencode/openchamber` (read-only reference): run their `packages/mobile` build (`bun install`, `bun run --cwd packages/web build`, `node scripts/prepare-web-assets.mjs`) to confirm the mobile HTML entry builds and to capture the asset layout we will reproduce.
- Record all results in this plan file under a "Phase 0 results" heading.

**Verify:** findings appended; no repo code changed (`git status` shows only the plan file + pre-existing voice work).

**Rollback:** N/A (docs).

### Phase 1 — Vendor `packages/chamber-ui` + standalone browser render

**Goal:** OpenChamber's mobile surface rendering in a browser inside our monorepo, talking to `:42447`, with zero changes to any existing package.

**Files (create):**
- `packages/chamber-ui/**` — vendored `packages/ui/src` + `src/lib/i18n` + `src/lib/theme` (incl. `themes/*.json`) + selected `packages/web` entry bits (`mobile.html` → `packages/chamber-ui/mobile/index.html`, its entry module → `packages/chamber-ui/mobile/`), upstream `LICENSE`, new `PROVENANCE.md`, `package.json` (name `@openchamber/ui`, version `1.22.0-anemos.1`, scripts `typecheck`/`dev`/`build`)
- `packages/chamber-ui/vite.config.ts` — adapted from `packages/web/vite.config.ts`: `@` alias → `src`, `worker.format: "es"`, `?worker&url` handling, tailwind v4 plugin, entry = `mobile/index.html`, dev-server port (suggest 4455 to avoid 1421/1422/4445)
- `script/chamber-sync.sh`, `docs/chamber-sync-checklist.md`
- Root `package.json` workspaces already cover `packages/*` — no change needed; add the package to turbo `typecheck` pipeline.

**Steps:**
1. Copy from `/tmp/opencode/openchamber` at `2c8ae9a` (record hash in PROVENANCE): `packages/ui/src` → `packages/chamber-ui/src`, plus `mobile.html` + its entry source from `packages/web`, plus any `packages/web/public` assets the mobile entry references.
2. Mark every subsequent in-vendor edit with `// ANEMOS-PATCH: <reason>` (none needed in this phase beyond build wiring if possible).
3. Patch browser-neutrality minimally to make vite build succeed: stub/alias `express`, `http-proxy-middleware`, `simple-git` imports (they should be unreachable from the mobile entry — verify with the bundle manifest); guard `process.cwd()` at `src/lib/opencode/client.ts:584`.
4. Replace their `run-isolated-tests.mjs` test script with `bun test`-compatible invocation or drop the test script for now (tests come with Phase 7).
5. Wire `typecheck` into turbo; keep the package out of root oxlint globs.
6. Confirm dev render: `VITE_OPENCODE_URL=http://localhost:42447 bun run --cwd packages/chamber-ui dev`, open the printed URL with `?surface=mobile` and an iPhone viewport; the chamber connect screen should appear and, after entering the instance URL, sessions should load over SSE.

**Constraints:** no edits under `packages/app`, `packages/session-ui`, `packages/ui`, `packages/ios`, `packages/android`. Keep the ANEMOS-PATCH count minimal.

**Reuse:** `packages/app/vite.js` worker/es and alias conventions; repo `patches/` + `SYNC_CHECKLIST.md` documentation precedents.

**Verify:** `bun run --cwd packages/chamber-ui build` succeeds; `bun run typecheck` green at root; manual browser check as above (this is the browser-first gate — do not proceed to Phase 2 on a broken render).

**Rollback:** delete `packages/chamber-ui` + root wiring; nothing else references it.

### Phase 2 — Anemos connection runtime + v2 boot guard

**Goal:** The chamber UI boots against our default servers with our env vars, carries HTTP Basic credentials, and fails loudly on v1-only backends.

**Files:** `packages/chamber-ui/src/lib/opencode/client.ts` (base-URL precedence `// ANEMOS-PATCH:`), new `packages/chamber-ui/src/anemos/boot-guard.tsx`, new `packages/chamber-ui/src/anemos/server-env.ts`, `packages/chamber-ui/mobile/entry wiring`.

**Steps:**
1. Resolve default base URL from `VITE_OPENCODE_SERVER_HOST`/`VITE_OPENCODE_SERVER_PORT` (default `localhost:4096`) with `VITE_OPENCODE_URL` still taking precedence — matches our entry.tsx semantics and keeps chamber's escape hatch.
2. Port the resilient probe: `boot-guard.tsx` fetches the real `<base>/global/health` route and requires JSON with `healthy: true` and a version (the `/api/config` and `/api/mcp` paths are SPA fallbacks on opencode 1.18.x); on failure render a dedicated "backend too old / not v2" screen with the server URL and version guidance. This is the D2 v1/v2 sub-decision.
3. Wire HTTP Basic authorization for instances without Chamber's pairing endpoint: the token source is our adapter storage (Phase 3 completes the storage side; here define the interface + a localStorage fallback for browser dev), and `?auth_token=` remains base64 `user:pass`.
4. Preserve `?auth_token=` cold-start support (strip after read) mirroring `entry.tsx:112–151`.

**Constraints:** do not remove chamber's own `/api` default — gate it behind env so upstream diffs stay small.

**Reuse:** probe logic from `server-protocol-resilient.ts`; env semantics from `entry.tsx`.

**Verify:** browser: boots against `:42447` and a scratch `:4096`; pointing `VITE_OPENCODE_URL` at a v1-only stub (or a bogus path) shows the guard screen; SSE events flow (session list updates live from a second client).

**Rollback:** revert phase commit; vendor returns to pure upstream behavior.

### Phase 3 — Native adapter (Tauri/Swift shells)

**Goal:** `renderMobileApp` runs inside our native shells with the right surface, no auth gate, our notifications/storage/deep-links/resume/haptics/share.

**Files:** `packages/chamber-ui/src/anemos/{runtime-apis.ts,platform-adapter.ts,deep-links.ts,storage.ts}`, `packages/chamber-ui/src/lib/runtimeSurface.ts` or `src/lib/platform.ts` (`// ANEMOS-PATCH:` native detection extension), `packages/chamber-ui/src/apps/renderMobileApp.tsx` (detection patch only), `packages/chamber-ui/src/apps/deepLinks.ts` + `deepLinkNavigation.ts` (scheme remap).

**Steps:**
1. Extend native-shell detection: recognize Tauri (`'__TAURI_INTERNALS__' in window` / `location.protocol === 'tauri:'` / `http://tauri.localhost` origin) and the iOS WKWebView (our Swift bridge sets a marker, e.g. `window.__ANEMOS_SHELL__ = 'ios' | 'android'`) alongside the existing Capacitor check, so `SessionAuthGate` is skipped and the notifications no-op branch is replaced by our injected API.
2. Implement `anemosRuntimeAPIs`: `notifications.notifyAgentCompletion` / `canNotify` over our Platform `notify` (+ `NotifyOpts` semantics); remaining `RuntimeAPIs` members mapped or stubbed per the interface at `src/lib/api/types`.
3. Storage adapter: implement chamber's persistence needs (instances, appearance, prefs) over `createBridgeStorage` (iOS) / `createTauriStorage` (Android) — both verified framework-agnostic. **Migrate** `opencode.settings.dat:defaultServerUrl` into the chamber instance list on first boot (one-way, idempotent; keep the old key untouched for the Solid app during coexistence).
4. Deep links: remap `openchamber://` → `opencode://` in `deepLinks.ts`/`deepLinkNavigation.ts` and locale strings; feed `detail.urls` from our native events into chamber's navigation.
5. `opencode:resume` window event → trigger chamber's reconnect path (sync reconnect-recovery); haptics/share/openExternal via bridge calls mirroring the current `entry-*.tsx` logic (read both entry files as the porting checklist — 218 + 254 lines).

**Constraints:** the vendored edits stay marked and minimal; prefer adapter files under `src/anemos/` over in-place rewrites.

**Reuse:** `packages/ios/src/{bridge.ts,ios-storage.ts}`, `packages/android/src/{bridge.ts,storage.ts}` (unchanged, imported from the new entries in Phase 8 — for browser dev, adapter falls back to localStorage); Platform method semantics from `packages/app/src/context/platform.tsx`; resume/deep-link handling patterns from `packages/app/src/context/server-sdk.tsx` + `pages/layout/deep-links.ts`.

**Verify:** browser (with a `window.__ANEMOS_SHELL__` shim + `?surface=mobile`): auth gate absent, connect flow uses migrated default server, `opencode:resume` dispatch reconnects; unit: `bun run --cwd packages/chamber-ui test -- src/anemos` (or direct bun test command) for the storage migration + scheme remap.

**Rollback:** revert commit; Phase 1–2 behavior unaffected.

### Phase 4 — Feature registry & cuts

**Goal:** No reachable UI surface calls a chamber-Express route; the app presents the phase-1 core cleanly.

**Files:** new `packages/chamber-ui/src/features/registry.ts`; `// ANEMOS-PATCH:` hooks in `src/lib/router/` (route gating), the mobile nav surfaces (`src/apps/MobileApp.tsx`, `MobileFilesSurface`/`MobileChangesSurface`/etc. lazy-import wrappers), settings sections; new stub component `src/features/unavailable.tsx`.

**Steps:**
1. Define the registry with the §2.3 dispositions encoded (`fs`, `git`, `terminal`, `tunnels`, `knowledge`, `folders`, `scheduled-tasks`, `agent-memory`, `browser-control`, `dev-servers`, `github`, `linear`, `tts-dictation`, `chamber-config`, … all `enabled: false` with reasons; core features `true`).
2. Gate routes + nav entries + settings sections through it; lazy-import wrappers render the stub for deep links into cut surfaces.
3. Sweep for eager imports of cut features from the mobile entry (bundle analyzer) — especially `ghostty-web`, `@xenova/transformers`, `simple-git`, `express` transitively; force lazy or stub.
4. Confirm appearance/typography/model prefs persistence survives without the chamber config routes (they are client-side auto-save modules — verify, else route them through the registry to a local shim).

**Verify:** browser pass over every remaining nav surface with the network tab clean of non-opencode requests; `bun run --cwd packages/chamber-ui build` with a manifest audit showing no express/simple-git/ghostty chunks in the mobile entry graph.

**Rollback:** flip registry entries to `true` individually.

### Phase 5 — Push notifications (fork relay/pairing)

**Goal:** Feature parity with `settings-mobile-notifications.tsx`: permission, relay URL, pairing flow, preferences, test push — inside chamber settings.

**Files:** new `packages/chamber-ui/src/anemos/push/*` (pairing state machine ported from `packages/app/src/utils/push-pair.ts` + `context/push-pair.tsx`, settings UI component), registry entry `push: true` (fork-specific), wiring `notifications` runtime API → push relay.

**Steps:**
1. Port `push-pair.ts` state machine verbatim (it is framework-neutral logic — verify no solid imports; adapt the reactive shell to React).
2. Port the settings UI into chamber's settings surface under an "anemos" section; call the Platform push methods through the Phase 3 adapter.
3. Map chamber's notification triggers (agent completion, etc.) to our `notify` + `PushPrefs` (approval/question/error semantics from `PushPrefs`).
4. Unit tests for the pairing machine (port `packages/app/src/utils/push-pair.test.ts`).

**Verify:** `bun test` (direct command) for ported tests; browser walkthrough of the pairing UI against a scratch relay; device verification deferred to Phase 8.

**Rollback:** registry `push: false` hides the section.

### Phase 6 — i18n parity + theming

**Goal:** All 18 locales present with a parity gate; anemos brand theme available.

**Files:** `packages/chamber-ui/src/lib/i18n/messages/*` (port + 6 new locale pairs), registration points in `src/lib/i18n`, new `packages/chamber-ui/src/lib/theme/themes/anemos-{light,dark}.json`, ported parity test `packages/chamber-ui/src/lib/i18n/parity.test.ts`.

**Steps:**
1. Write a key-audit script (sandbox) comparing chamber `en.ts`/`en.settings.ts` keys against our locale dicts; seed the 12 overlapping locale files from chamber's English and fill semantics from our translations (manual pass; this is the bulk of the phase).
2. Author `ar, ru, th, no, da, bs` from our existing locale files mapped onto chamber keys.
3. Register locales; port the parity test concept from `packages/app/src/i18n/parity.test.ts` (all locales must define the union of keys; missing → fail).
4. Create `anemos` theme JSONs from our `packages/ui` token values; register alongside built-ins; default it on for the mobile surface.

**Verify:** `bun test` parity test green (18 locales); browser visual check of theme + RTL spot-check (ar).

**Rollback:** locales are additive; theme selectable.

### Phase 7 — Chamber e2e smoke suite (browser)

**Goal:** Playwright coverage of the new frontend against a real backend, using our e2e conventions.

**Files:** new `packages/chamber-ui/e2e/` — `fixtures` (port the conventions from `packages/app/e2e/AGENTS.md`: `withSession`/`trackSession`/`trackDirectory`, own `test`/`expect` re-exports), `playwright.config.ts` (reuse env contract `PLAYWRIGHT_SERVER_HOST/PORT`, `PLAYWRIGHT_PORT`; serve the chamber dev/build on its port), `smoke/*.spec.ts`.

**Steps:**
1. Stand up the chamber UI against a scratch `opencode serve` (same pattern as app e2e, default `:4096`).
2. Smoke specs: boot + connect; session create → send prompt → timeline renders streamed parts; composer model/agent selection; settings opens; v1-only guard screen (mock server via `e2e/utils/mock-server.ts` pattern from the app suite, if portable — else a stub HTTP server).
3. Add `test:e2e` script to `packages/chamber-ui`; wire into turbo alongside `@opencode-ai/app#test`.

**Verify:** `bun run --cwd packages/chamber-ui test:e2e -- e2e/smoke/boot.spec.ts` (narrowest first, then full smoke).

**Rollback:** additive; delete specs.

### Phase 8 — Mobile build switch + device verification (default stays Solid)

**Goal:** `FRONTEND=chamber` produces iOS and Android builds running the chamber UI on device; default builds unchanged.

**Files:** `packages/ios/vite.chamber.config.ts`, `packages/android/vite.chamber.config.ts`, small wrapper scripts in `packages/{ios,android}/package.json` (`build:chamber`), `packages/ios/script/*` only if the Xcode copy step needs the entry filename adjusted (it should not — same `WebAssets/index.html` layout).

**Steps:**
1. Chamber vite configs: build `packages/chamber-ui/mobile/index.html` (entry importing the anemos adapters, choosing iOS/android bridge by build flag), `base: "./"`, same outDirs (`WebAssets` / `dist`), same ports for dev (`1421`/`1422` with `devUrl` untouched — HMR against the chamber dev server config).
2. `bun run --cwd packages/ios build:chamber` → `bun run --cwd packages/ios beam` (TestFlight private); `FRONTEND=chamber` equivalent for Android (`ANDROID_BUILD.md` toolchain) + `scripts/deploy-ipa.mjs` sideload path.
3. Device checklist: SSE reconnect on `opencode:resume` (background/foreground), deep link cold-start + warm nav, notifications via relay, haptics, share sheet, keyboard/viewport behavior in the WKWebView/Android WebView (markdown worker loads! — caveat §3.4), rotation/iPad surface heuristics.
4. Fix what breaks (patches marked; the worker/CORS spikes from Phase 0 pay off here).

**Constraints:** do not change default `build` scripts or `tauri.conf.json`; the voice-removal work must be landed before this phase (shared files: `entry-*.tsx` neighbors, bridges).

**Verify:** `bun run typecheck`; default `bun run --cwd packages/{ios,android} build` still green (proves coexistence); device checklist signed off.

**Rollback:** don't set `FRONTEND=chamber` — default builds never changed.

### Phase 9 — Cutover

**Goal:** Chamber UI becomes the default frontend on all platforms.

**Files:** `packages/{ios,android}/package.json` (swap default `build` to chamber config; keep `build:solid` escape hatch), `packages/app` enters hard freeze, README/AGENTS updates.

**Steps:**
1. Flip defaults; keep one-release escape hatch (`build:solid`).
2. Burn-in: one TestFlight cycle + sideload cohort on chamber default; monitor the fork relay/error channels.
3. Update `AGENTS.md` browser-loop instructions for the chamber dev server + `?surface=mobile`.

**Verify:** default device builds run chamber; `bun run typecheck`; e2e smoke in CI-equivalent invocation.

**Rollback:** revert the default flip (one commit); `build:solid` remains available until Phase 10.

### Phase 10 — Cleanup & attribution finalization

**Goal:** Remove the Solid frontend stack; leave a maintainable vendored UI with sync docs.

**Files (delete):** `packages/app`, `packages/session-ui`, `packages/ui`, old mobile entries (`packages/{ios,android}/src/entry-*.tsx`, `onboarding*`), their vite/plugin wiring (`@opencode-ai/app/vite` imports), root turbo/test references, `build:solid` escape hatches. **Files (update):** `PROVENANCE.md` final change list, `docs/chamber-sync-checklist.md` regeneration, consider gitignoring built WebAssets (separate decision — flagged, not assumed).

**Steps:** delete in one commit per package family (app+session-ui+ui together since they form the dependency chain); fix root references; run full gates.

**Verify:** `bun install && bun run typecheck && bun run --cwd packages/{ios,android} build` all green with the Solid packages gone; chamber e2e smoke green.

**Rollback:** revert deletion commits (git history preserves everything).

---

## Phase 0 results — spikes executed 2026-09-01

> Method note: `curl`/`wget`/`fetch`/`http.get` are blocked in this environment; all HTTP probes were issued as raw HTTP/1.1 over Node `net.createConnection` (per the `local-http-net-probe` skill), printing only status line, content-type, and body shape. The server CORS predicate was recovered by string-extraction from the installed CLI binary (`~/.opencode/bin/opencode`, ELF, 1.18.25). Targets: the persistent backend `127.0.0.1:42447` and a scratch `opencode serve --port 4096` (CLI 1.18.25, started detached for the probe, killed afterward; :42447 untouched). Reference clone `/tmp/opencode/openchamber` @ `2c8ae9a` confirmed; host bun is 1.3.14 (≥ our 1.3.13 pin and exactly their `packageManager` pin).

### Spike 1 — Backend v2 completeness: **PASS** (with one correction to this plan's own assumptions)

| Endpoint (GET) | :42447 persistent | :4096 fresh CLI 1.18.25 | Verdict |
|---|---|---|---|
| `/api/health` | 200 `application/json` `{"healthy":true}` | same | ✅ v2 health |
| `/global/health` | 200 `application/json` `{"healthy":true,"version":"1.18.25"}` | same | ✅ global health + version |
| `/api/config` | 200 **`text/html`** (SPA fallback, 2.9 KB) | same | ⚠️ **not a v2 route** — see correction below |
| `/api/mcp` | 200 **`text/html`** (SPA fallback) | same | ⚠️ **not a v2 route** — real route is `/mcp` |
| `/mcp` | — | 200 `application/json` `{"context7":{"status":"connected"}}` | ✅ MCP served at `/mcp` |
| `/session` (classic) | 200 `application/json` (array, ~74 KB) | same (~77 KB) | ✅ classic routes still live |
| `/api/session` | 200 `application/json` `{"data":[…]}` (v2 envelope) | same (~25 KB) | ✅ v2 sessions |
| `/config` (v2 instance) | 200 `application/json` (~181 KB config object) | same (~202 KB) | ✅ |
| `/global/config` | 200 `application/json` (~107 KB) | same | ✅ |
| `/api/model`, `/api/provider`, `/api/agent`, `/api/location`, `/api/command`, `/session/status` | spot-checked JSON | 200 `application/json`, envelope `{"location":{…},"data":…}` | ✅ |
| `/global/event` (SSE) | 200 `text/event-stream`; first frame `data: {"payload":{"id":"evt_…","type":"server.connected","properties":{}}}` (chunked transfer) | same | ✅ SSE verified (headers + first bytes) |
| `/api/event` (SSE) | 200 `text/event-stream` + `Access-Control-Allow-Origin` when Origin present | — | ✅ |

Both servers behave identically. Directory scoping works (:42447 serves `/home/michael/IT/gemp-automations`, the scratch :4096 served the `tidy-island` worktree — `/api/location` and envelope `location` fields report it).

**Correction — `/api/config` & `/api/mcp` were never v2 routes.** The SPA catchall serves `index.html` for unregistered paths, which is what those probes hit. Verified against the generated v2 SDK route inventory in *both* our workspace SDK (1.18.11, `packages/sdk/js/src/v2/gen/sdk.gen.ts`) and chamber's installed npm SDK (`node_modules/@opencode-ai/sdk@1.18.25/dist/v2/gen/sdk.gen.js` — identical families): 19 `/api/*` app routes (`/api/session`, `/api/model`, `/api/provider`, `/api/agent`, `/api/command`, `/api/fs/*`, `/api/pty`, …) plus the plain/global family (`/session`, `/config`, `/config/providers`, `/global/{config,event,health,dispose,upgrade}`, `/mcp`, …). SDK URL building is plain concatenation `baseUrl + path`, so a direct base like `http://localhost:42447` reaches the natively-served plain routes and the `/api/*` mount alike.

**Consequence for the current Solid app (discovered, worth knowing):** `server-protocol.ts` treats a JSON-healthy `/global/health` as `"v1"`, so the Solid app runs these 1.18.25 servers in v1 mode today. `server-protocol-resilient.ts`'s `/api/config`-must-be-JSON probe can never pass on 1.18.x (the route does not exist) — the wrapper effectively always downgrades to v1. Harmless for the Solid app (classic routes are fully served) but the Phase 2 boot guard must not reuse that probe as-is. Also noted: our app authenticates with `Authorization: Basic base64(user:pass)` (`serverAuthHeaders`, `packages/app/src/utils/server.ts`) and `?auth_token=` carries that same base64 blob — not a bearer token.

**Impact on later phases:**
- **P2 boot guard:** probe a *real* v2 route — e.g. `GET <base>/global/health` returns `application/json` with `healthy === true`, optionally plus `GET <base>/config` returning JSON content-type. Do NOT port the `/api/config` probe. The D2 "backend too old" screen remains as a guard only; our installed backend line (1.18.25) already serves the complete v2 surface — no v1 fallback is needed for it.
- **P2 auth:** chamber's runtime-auth injects bearer tokens; our servers/entry use HTTP Basic. The anemes adapter must inject `Authorization: Basic …` headers from stored server credentials (and keep `?auth_token=` = base64 `user:pass` semantics), not assume bearer.
- **P1:** no change — direct connect with `baseUrl = http://host:port` works against both route families.

### Spike 2 — CORS / origin behavior: **PASS** (direct connection confirmed at the HTTP layer; no proxy or origin exemption needed)

Origin allow-list mapped empirically on :42447 (identical on :4096):

| Origin | `Access-Control-Allow-Origin` |
|---|---|
| `http://localhost:<any port>` (4445, 4455 tested) | ✅ echoed |
| `http://127.0.0.1:<any port>` (3000, 4445) | ✅ echoed |
| `tauri://localhost` | ✅ echoed |
| `http://tauri.localhost` / `https://tauri.localhost` | ✅ echoed |
| `https://app.opencode.ai` (regex `^https://([a-z0-9-]+\.)*opencode\.ai$`) | ✅ echoed |
| `oc://renderer*` (desktop app prefix) | ✅ allowed (per binary) |
| `http://localhost` (no port), `https://localhost:4445`, `http://[::1]:4445` | ❌ no CORS headers |
| `capacitor://localhost`, `ionic://localhost`, `ios://localhost`, `opencode://…`, `tauri://anemos`, `file://`, `null`, arbitrary hosts | ❌ no CORS headers |

Preflight `OPTIONS /api/config` with `Origin: http://localhost:4445` + `Access-Control-Request-Method: GET` → **204 No Content** with `access-control-allow-origin` (echo), `access-control-allow-methods: GET, HEAD, PUT, PATCH, POST, DELETE`, `access-control-allow-headers: authorization, content-type` (echoes requested headers — **the `Authorization` header is explicitly allowed**, so Basic/bearer auth works cross-origin), `access-control-max-age: 86400`, `vary: Origin`. Same result for `tauri://localhost` and `http://tauri.localhost` preflights. No `Access-Control-Allow-Credentials` is sent — irrelevant since neither our app nor chamber uses cookies. SSE endpoints (`/global/event`, `/api/event`) also send the echo ACAO when an Origin is present.

The predicate recovered from the 1.18.25 binary, de-minified:

```js
function allowOrigin(origin, serverConfig) {
  if (!origin) return true                                        // non-browser clients
  if (origin.startsWith("http://localhost:")) return true
  if (origin.startsWith("http://127.0.0.1:")) return true
  if (origin.startsWith("oc://renderer")) return true
  if (origin === "tauri://localhost" || origin === "http://tauri.localhost" || origin === "https://tauri.localhost") return true
  if (/^https:\/\/([a-z0-9-]+\.)*opencode\.ai$/.test(origin)) return true
  return serverConfig?.cors?.includes(origin) ?? false            // escape hatch
}
// wrapper: same-host origins are additionally always allowed (new URL(origin).host === request host)
```

Escape hatches (documented for edge cases): `opencode serve --cors <origin…>` CLI flag (array) and the `server.cors: string[]` config (`@opencode/ServerCorsConfig`); same-host origins bypass the list entirely.

**How the current Solid app succeeds cross-origin (verified in-repo):** the iOS shell registers a custom WKURL scheme handler for scheme **`tauri`** and loads `tauri://localhost/index.html` (`packages/ios/OpenCode/WebView/BridgeController.swift:89,150`) → origin `tauri://localhost`, on the allow-list. Android Tauri default origin `http://tauri.localhost` → allowed. Browser dev (`http://localhost:<any port>`) → allowed by prefix. `entry.tsx` does no CORS handling (none is possible client-side); auth rides on the `Authorization` header, which preflight allows. The `.opencode/skills/debugging/webview-cors-load-failed/SKILL.md` (commit `e43d25412`) records the original incident: the webview scheme was `app-local` (not allow-listed → every fetch died as WebKit "Load failed"), fixed by renaming the scheme to `tauri` and matching WhisperCode's ATS config; it also documents the ATS-vs-CORS discrimination and why a native fetch bridge is a last resort.

**Impact on later phases:**
- **D2 confirmed end-to-end:** chamber UI from a browser dev server (e.g. `http://localhost:4455` — any localhost port passes) and from both production webview origins talks directly to :42447/:4096 with `Authorization` headers. No proxy, no sidecar, no credentials mode.
- **P8 constraints (add to the device checklist):** keep the iOS custom scheme exactly `tauri` (host `localhost`) — do not rename or the allow-list match breaks; Android Tauri defaults are fine as-is; do not serve the webview over `https://localhost` (not allow-listed).
- **Dev caveats:** testing from a LAN phone browser (origin `http://<lan-ip>:<port>`) or over Tailscale hostnames needs `--cors <origin>` / `server.cors`; `capacitor://localhost` (chamber's own Capacitor default) is NOT allow-listed — if we ever debug using chamber's Capacitor shell, start the backend with `--cors capacitor://localhost`.
- **P1:** the chamber dev server on `localhost:4455` is covered by the `http://localhost:` prefix rule with zero backend changes.

### Spike 3 — Upstream mobile build repro: **PASS**

Executed in `/tmp/opencode/openchamber` @ `2c8ae9a` (clone left git-clean; only `packages/web/dist` + `packages/mobile/dist` build outputs were added):

| Step | Result |
|---|---|
| `bun install --frozen-lockfile` | ✅ 3101 packages, 30.6 s. Host bun 1.3.14 == their `packageManager` pin exactly — no version refusal, no `--no-verify` needed. No env vars required. Clone `git status` clean afterward. |
| `bun run --cwd packages/web build` | ✅ 71 s, vite 7.3.1, only a >500 kB chunk-size warning. Also builds `dist/sw.js` (PWA v1.2.0 service worker, iife, 1 kB). |
| `bun run --cwd packages/mobile build:assets` (`node scripts/prepare-web-assets.mjs`) | ✅ 0.2 s: `rm -rf packages/mobile/dist` → `cp -r ../web/dist → dist` → `writeFile(index.html, readFile(mobile.html))` — `index.html` becomes a byte-identical copy of `mobile.html` (which also remains). |

Node 24.11.1 on host satisfies their `engines.node >=22`; build itself runs under bun — no Node gate hit.

**Asset layout reproduced (`packages/mobile/dist`, 946 files / 37.0 MB — includes all three entry graphs):**

- Root files: `index.html` (mobile entry), `mobile.html` (duplicate source), `mini-chat.html` (electron entry — out of scope for us), `sw.js`, `site.webmanifest`, `favicon.*`, `apple-touch-icon*`, `logo-*`, `pwa-*`.
- `assets/`: ~750 language/theme/feature chunks (shiki grammars + themes, dual copies per entry graph), 164 `vendor-*` chunks, 2 CSS (`index-C57jT0Sa.css` 276 KB shared, `main-BV3KOtdA.css`), 3 worker files (`markdown-shiki.worker-D5fBU-lw.js` 140 KB, `worker-BBk7yuNN.js` 202 KB, `workerFactory-tw7cIdmV.js`), entry chunks `mobile-B-fCh64o.js` (bundled `src/mobile-main.tsx`), `renderMobileApp-DZc536kP.js` (208 KB), `index-b0zDkWyg.js` (416 KB shared core).
- Mobile `index.html` loads `<script type="module" crossorigin src="/assets/mobile-B-fCh64o.js">` + modulepreloads (`vendor-vite-runtime`, `vendor-scheduler`, `vendor-react`, `vendor-zustand`, `vendor-zod`, `vendor-opencode-sdk`, `index-*`) + stylesheet `index-C57jT0Sa.css`.
- Their vite config: `worker: { format: 'es' }` ✅ and `define: { 'process.env': {}, global: 'globalThis', __APP_VERSION__: … }` (port the defines to our vendored config — they also blunt the §3.5 `process` leak).

**Surprises / notes for vendoring:**
1. **Root-absolute asset URLs** (`/assets/…`) and `crossorigin` attributes — our Phase 8 `vite.chamber.config.ts` must override `base: "./"` (as planned; the WKWebView scheme handler serves from a bundle root, and our current iOS/Android configs already use `base: "./"`).
2. The PWA plugin rides along (`sw.js`, manifest, icons) — harmless in a webview, but the vendored config can drop it.
3. Their `dist` bundles **three** entry graphs (desktop/mobile/mini-chat) with duplicated grammar/theme chunks — our mobile-entry-only vendored build will be substantially smaller.
4. Heaviest chunks to watch in the Phase 4 lazy/stub sweep: `useAppFontEffects` 3.5 MB, `vendor-elkjs` 1.4 MB, `vendor-heic2any` 1.35 MB, `vendor-ghostty-web` 625 KB (cut features), `useAppFontEffects`/heic2any are the surprises not on the §2.2 list.

**Impact on later phases:** Phase 1 reproduces the single mobile entry (`mobile.html` + `src/mobile-main.tsx`), `worker.format: 'es'`, and the `process.env`/`global` defines; Phase 8 reproduces the `index.html := mobile.html` convention into `WebAssets/` / `dist/`. No toolchain blockers (host bun already satisfies their pin; no env vars or version flags needed).

### Phase 0 wrap-up

All three assumptions proven; plan adjustments recorded above (P2 probe route, P2 Basic-auth adapter, P8 scheme-preservation checklist item, P1 defines). No repo files other than this plan document were modified.

### Phase 2 results

**Verdict: PASS.** The Anemos browser runtime now resolves `VITE_OPENCODE_URL` ahead of `VITE_OPENCODE_SERVER_HOST`/`VITE_OPENCODE_SERVER_PORT`, defaults those values to `localhost:4096`, and preserves Chamber's `/api` base when no Anemos env is active. `?auth_token=` is validated as base64 `user:pass`, persisted through the browser token provider, and removed from the URL history.

Patched the runtime client to use the direct v2 server origin, inject `Authorization: Basic <base64>` on OpenCode HTTP requests, and use SSE for Anemos event streaming because browser WebSockets cannot carry the Basic header. The mobile bootstrap now skips Chamber's cookie/session/passkey gate for active Anemos envs and suppresses its `/auth/url-token` minting path. Added a v2 boot guard against `GET <base>/global/health`, requiring JSON with `healthy: true` and a version; `/api/config` and `/api/mcp` were deliberately not used because they are SPA fallbacks on opencode 1.18.x.

Verification with `playwright-core` against `/usr/bin/chromium` (`390×844`, `isMobile: true`) at `http://localhost:4455/mobile/?surface=mobile`:

- **Live runtime:** with `VITE_OPENCODE_SERVER_PORT=42447`, the splash progressed to the mobile sessions surface. `GET /global/event` returned `200 text/event-stream`, session pages returned `200`, and the sessions drawer rendered the live title `Parakeet V2/V3 Chunking and Punctuation Models`.
- **Basic auth/cold start:** a valid `auth_token` was stripped from the URL; captured OpenCode requests carried Basic authorization (22 Basic requests, 0 bearer requests).
- **Guard:** with `VITE_OPENCODE_URL=http://localhost:9/`, the dedicated `Backend too old / not v2-compatible` screen rendered with the resolved backend and `GET http://localhost:9/global/health` failure instead of the splash or a blank page.

Deviation: expected Phase-4 Chamber-only calls to `/api/config/themes` and `/api/push/visibility` still report CORS/404 failures in the browser; they are outside the Phase-2 connection/session path and did not prevent the v2 session/SSE surface from loading.

### Phase 3 results

**Implementation:** Added the Anemos platform/runtime adapter, centralized Capacitor/Tauri/Swift native-shell detection, and connected native notifications, storage, deep links, resume recovery, external links, image sharing, and the existing haptic/share bridge contract. Legacy `opencode.settings.dat:*` values migrate one-way into the Chamber mobile instance list; old keys remain untouched. `openchamber://` is accepted for compatibility, while new pairing guidance and generated links use `opencode://`.

The native lifecycle bridge dispatches `opencode:resume` into Chamber's exported reconnect trigger, and `opencode:deep-link` events consume `detail.urls` with cold-launch queue draining. Direct Anemos runtimes skip Chamber auth probing and use the injected platform notification implementation.

**Verification:** Unit, browser, and native-shell verification are deferred to the build-fixer/device verification pass; this implementation pass was verified by inspection only.

### Phase 4 results — feature registry and cuts

The Phase 4 registry is `packages/chamber-ui/src/features/registry.ts`. It contains 36 typed dispositions: 13 enabled core features and 23 cut features. Enabled features are `sessions`, `chat`, `composer`, `commands`, `providers`, `models`, `agents`, `mcp`, `permissions`, `questions`, `i18n`, `appearance`, and direct `instances`. Cut entries are `fs`, `git`, `terminal`, `tunnels`, `knowledge`, `folders`, `scheduled-tasks`, `agent-memory`, `browser-control`, `dev-servers`, `quota`, `security`, `small-model`, `system-prompt`, `skills-catalog`, `walkthrough`, `github`, `linear`, `tts-dictation`, `chamber-config`, `client-auth`, `push-web`, and `updates`; each has a reason and can be re-enabled independently.

Gated surfaces:

| Surface | Registry disposition |
|---|---|
| Mobile workspace drawer: Changes, Files, Terminal, Notes/Plans | Git, filesystem, terminal, and knowledge stubs; only SDK-backed MCP remains visible |
| Mobile sessions drawer: project-folder add, worktree discovery/create/edit/delete | Folder/Git actions removed from the mobile navigation and no background Git discovery runs |
| Mobile connection welcome/instances QR pairing | Client-auth pairing cut; direct URL/token and password connection remain |
| Composer: dictation, session goals/recaps/suggestions, GitHub/Linear links, file mentions, review/changed-file actions | Voice, knowledge, integration, filesystem, and Git actions are hidden or short-circuited |
| Context rail/panel and legacy URL tabs | Cut modes are hidden from the rail and render `Not available in anemos` for deep links |
| Settings navigation/search and settings page content | Only appearance, chat, and SDK-backed providers remain in the mobile settings list; cut deep links render the stub |
| MCP configuration/OAuth and Chamber settings/config stores | MCP status/connect/disconnect remains SDK-backed; Chamber config loading and OAuth setup are not invoked |
| Web push/APNs registration and OpenChamber update polling | Disabled pending the Phase 5 fork relay and later update replacement |

Bundle audit by import-graph traversal from `packages/chamber-ui/mobile/mobile-main.tsx` (the Vite build/manifest verification is deferred to build-fixer): 150 eager source modules were resolved; `express`, `simple-git`, `ghostty-web`, `@xenova/transformers`, and `http-proxy-middleware` each have **0** references in the eager graph. The four cut mobile surface modules (`MobileFilesSurface`, `MobileChangesSurface`, `TerminalView`, and `ComposerDictation`) are absent from the mobile entry graph. `heic2any` has one remaining reference in the eagerly resolved OpenCode client, but only as an on-demand dynamic attachment conversion import; it is not eagerly bundled. The full static-plus-dynamic closure was 837 modules and likewise contained no forbidden server/terminal dependency other than that lazy `heic2any` import.

Appearance, typography, and model preference persistence was verified by inspection: Anemos `syncDesktopSettings` reads `anemos.settings.v1:<runtimeKey>` from local storage, `updateDesktopSettings` merges and writes that key without `/api/config/settings`, `OpenChamberVisualSettings` reads the same local record, custom theme loading is skipped, and model metadata's external `models.dev` fetch is skipped. Existing Zustand local persistence remains unchanged.

Build, typecheck, and unit-test commands were not run by the implementation agent per the repository agent boundary; build-fixer owns those execution checks. No live browser/network sweep was performed; the verification agent owns that checklist.

---

## 6. Testing Strategy (summary)

- **Unit (per phase):** adapter/storage migration (P3), push pairing machine (P5), i18n parity (P6) — direct `bun test` invocations from within `packages/chamber-ui` (conditions/preload per the package's React setup, mirroring the app's happydom pattern).
- **Integration/e2e (P7):** Playwright smoke against a real `opencode serve` backend using the fork's fixture conventions (`withSession`/`trackSession`/`trackDirectory`, `modKey`, `data-component` selectors where chamber exposes them).
- **Device (P8/P9):** TestFlight via `beam`, Android per `ANDROID_BUILD.md`, sideload via `scripts/deploy-ipa.mjs`; explicit checklist (resume/SSE, deep links, push, worker/CSP, keyboard).
- **Always:** `bun run typecheck` before push (husky-enforced); browser dev loop before device, per AGENTS.md.

## 7. Risks & Mitigations

- **Risk:** Chamber's UI silently requires an Express route we missed on a core path. **Mitigation:** Phase 4 network-tab sweep + registry-gated stubs; e2e smoke runs without any chamber server.
- **Risk:** CORS/origin breakage on device. **Mitigation:** Phase 0 spike + existing CORS skill; the current app's mechanism is the reference.
- **Risk:** Worker/CSP failures in WKWebView/Android WebView. **Mitigation:** Phase 0 build repro; Phase 8 checklist item; fallback is disabling the markdown worker (chamber ships a synchronous renderer path for preload — verify).
- **Risk:** Upstream drift makes syncs painful. **Mitigation:** pinned commit + `// ANEMOS-PATCH:` markers + sync script/checklist; prefer pushing browser-neutrality fixes upstream.
- **Risk:** v1-only servers strand users. **Mitigation:** boot guard with explicit messaging; old app available via `build:solid` until Phase 10; Open Question 1.
- **Risk:** i18n port effort balloons (12 × ~2 large files each). **Mitigation:** key-audit script + seed-from-English workflow; timebox per locale; the 6 net-new languages can slip past cutover only if the user explicitly accepts (Open Question 2).
- **Risk:** Interleaving with the uncommitted voice work. **Mitigation:** plan never edits `packages/app`; Phases 8+ require the voice work landed; flagged in §3.1.

## 8. Success Criteria

- [ ] Chamber mobile surface renders in browser against `:42447` and `:4096` over SSE (P1–2)
- [ ] v1-only backend produces a clear error screen, not a broken app (P2)
- [ ] Native shells: no auth gate, our notifications/storage/deep-links/resume work (P3, P8 device checklist)
- [ ] Zero chamber-Express requests from the shipped UI (P4 audit)
- [ ] Push pairing parity on device (P5/P8)
- [ ] 18 locales with parity test green (P6)
- [ ] Chamber e2e smoke suite green in CI-equivalent invocation (P7)
- [ ] Default iOS/Android builds never broke on any intermediate commit (P8 gate, enforced by `FRONTEND` switch)
- [ ] Cutover + burn-in completed; Solid stack deleted; PROVENANCE/sync docs current (P9–10)

## 9. Open Questions

1. **v1-only backends:** are there real deployments/servers you still need to support that run v1-only opencode? If yes, we keep `build:solid` long-term (or scope porting the resilient downgrade into chamber's runtime layer as a post-cutover project). If no, Phase 10 can delete the Solid stack without an escape hatch.
2. **Locale scope:** all 18 pre-cutover as planned, or accept shipping the 12 + 3 mapped (`zh/zh-CN`, `zht/zh-TW`, `br/pt-BR`) at cutover with the 6 net-new languages following after?
3. **Diff review (git changes surface):** our current app reviews VCS diffs via the opencode SDK. Chamber's changes surface uses its Express git routes. Cut initially per this plan — confirm, or should porting it onto the SDK's `vcs` endpoints be pulled into Phase 4/5 scope?
4. **Terminal/files-on-device:** any mobile users depending on the PTY terminal or filesystem browsing today? Both are cut initially.
5. **Branding pass:** chamber UI carries OpenChamber naming/strings in places beyond the deep-link scheme. How far should the anemos rebrand go in Phase 4 (strings only vs. full visual identity), and is the default theme the current token palette?

### Phase 5 results

- Added the UI 3 fork-relay pairing machine and React shell under `packages/chamber-ui/src/anemos/push/`, including permission, host-plugin activation, relay polling, repair/clear, and Bun tests.
- Added native adapter push method shapes and bridge forwarding, relay URL and PushPrefs persistence, and notification trigger mapping for completion, approval, question, and error events.
- Added the registry-gated Anemos Notifications settings section with relay URL, permission, pairing, preferences, diagnostics state, and test push controls.
- Build and test commands were not run by the implementation agent per the repository agent boundary; build-fixer owns execution verification.
