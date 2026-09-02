# Implementation Plan: OpenChamber UI for anemos — Three-Interface Shell Architecture

- **Date:** 2026-09-01 · **Revision 2:** 2026-09-02 (post-Phase-4 architecture change — see D8)
- **Repo:** `tidy-island` (anemos mobile fork of `sst/opencode`), branch `opencode/tidy-island`, synced to `origin/main`
- **Reference clone (read-only):** `/tmp/opencode/openchamber` — upstream `https://github.com/openchamber/openchamber`, vendored at commit **`2c8ae9a`** (`v1.22.0-3-g2c8ae9a`), MIT licensed
- **Execution state:** Phases 0–4 **executed** (commits `37b8697`, `ec0d6d38`, `72db8a70b`, `5c6d196ac`, `8500cc7c6`, `ee2d56cbb`, `72aa96310`). Phases 5–11 are **Rev 2** (restructured; old→new mapping in §5).
- **Status of the working tree:** the **voice/whisper-removal work is still uncommitted** (see §3.1) — Phases 8+ touch the same mobile-shell files (`entry-*.tsx` neighbors, bridges, rust `mobile-bridge`) and require it landed first. Also untracked: two stray playwright-cli snapshot files `chamber-mobile-initial.yml` / `chamber-mobile-noenv.yml` (phase-verification leftovers — delete; tracked in P11 housekeeping).

---

## 0. Executive Summary (Rev 2)

The anemos app ships **three selectable interfaces** behind a native-launched **UI selector screen**:

1. **UI 1 — "Chamber Full"**: the untouched upstream OpenChamber web UI, loaded **remotely** from the user's own OpenChamber server URL (they already run one). All features, including the 23 our direct-connect build cuts (terminal, fs, git, tunnels, knowledge, …). Chamber's own auth applies. No anemos code beyond loading the URL and a native gesture recognizer.
2. **UI 2 — "Classic"**: the existing SolidJS `packages/app`, **zero changes**, direct opencode connection, as today. Permanent — this dissolves the old cutover phase and is the permanent answer for v1-only servers and the 6 locales UI 3 won't carry at first.
3. **UI 3 — "Anemos Chamber"**: the vendored `packages/chamber-ui` direct-connect build (Phases 1–4 executed: vendored, connected over SSE with Basic auth, native adapters, feature registry with 13 enabled / 23 cut). Remaining: push (P5), theming/locale hardening (P6), e2e (P7).

A **selector screen** is shown at launch (remembering the last choice; initial default = Classic) and reachable from **any** UI via a native **four-finger swipe-up** gesture (iOS) and its Android equivalent (evaluated in D8.3). Because remote pages cannot dispatch our window events, the gesture is intercepted **natively** (Swift gesture recognizer / Kotlin touch handling in the existing mobile-bridge plugin) — which also makes the selector's placement decision easy: **a local HTML selector page + native launch routing and gesture, one WebView, navigation-based switching** (D8.1).

Per-UI server wiring: UI 1 → the configured OpenChamber server (its own auth); UIs 2 & 3 → the shared opencode default server (existing settings keys + the P3 one-way migration).

Why this shape (Rev 2 rationale): the user already runs an OpenChamber server — full-featured chamber is therefore available *for free* by loading it remotely, which removes the pressure to reimplement the 23 Express-dependent features inside our vendored build, removes the need for a risky cutover, and lets the vendored UI 3 stay a small, aggressively-cut, direct-opencode surface. The cost — maintaining a three-surface shell — is mostly native glue plus the already-executed vendoring work.

**What changed vs Rev 1 (superseded):** the "replace the Solid app, cut over, delete the old stack" end-state is withdrawn. Old Phase 9 (cutover) is **dissolved**; old Phase 10 (deletion) becomes P11 (docs/dead-code only). D2/D5/D7 are annotated where D8 supersedes them. Phases 0–4 below are the unchanged historical record of executed work.

---

## 1. Findings — Our Current App (verified in-repo)

### 1.1 Packaging & build

| Fact | Detail |
|---|---|
| App package | `packages/app`, name `@opencode-ai/app`. Exports: `"." → src/index.ts`, `./desktop-menu`, `./updater`, `./wsl/types`, `./vite → vite.js`, `./index.css` |
| Vite plugin | `packages/app/vite.js` — `vite-plugin-solid` + `@tailwindcss/vite` + `@` alias (→ `packages/app/src`) + `worker.format: "es"` + oc-theme-preload inline script. **Mobile packages import this plugin** (`import appPlugin from "@opencode-ai/app/vite"`). |
| iOS shell | **Native Swift app**, not Tauri: `packages/ios/OpenCode/*.swift` (e.g. `OpenCodeApp.swift`, `PlatformBridge.swift`, `BridgeController.swift` — custom WKURL scheme handler for scheme **`tauri`**, loads `tauri://localhost/index.html`), fastlane `script/beam` for private TestFlight. Its vite config (`packages/ios/vite.config.ts`, port 1421, `base: "./"`, `publicDir: "../app/public"`) builds the entry into **`packages/ios/WebAssets/`** — and WebAssets (built, hashed JS chunks) **are committed to git**. |
| Android shell | **Tauri**: `packages/android/src-tauri/tauri.conf.json` → `frontendDist: "../dist"`, `devUrl: http://localhost:1422`, `beforeBuildCommand: "bun run build"` (the android package's own vite build → `outDir: "dist"`). Rust bridge plugin at `packages/android/src-tauri/mobile-bridge/` (Kotlin + Rust, permission'd commands — the established place to add native commands). |
| Mobile entries | `packages/ios/src/entry-ios.tsx` (218 lines), `packages/android/src/entry-android.tsx` (254 lines). Both import from `@opencode-ai/app`: `AppBaseProviders`, `AppInterface`, `PlatformProvider`, `ServerConnection`, `type NotifyOpts`, `type Platform`, plus their own `bridge`, storage (`createBridgeStorage` / `createTauriStorage`), and `Onboarding`. |
| Bridges are framework-agnostic (verified) | `packages/ios/src/bridge.ts` (151 lines, no solid/react, window-bridge root), `packages/ios/src/ios-storage.ts` (83 lines), `packages/android/src/bridge.ts` (49 lines, `@tauri-apps/*` only), `packages/android/src/storage.ts` (96 lines). **Directly reusable from React and from a plain HTML selector page** (local content can call the bridges; remote UI 1 content must NOT be able to — §3.19). |
| Monorepo | bun `1.3.13` (`packageManager`, husky-enforced), workspaces `packages/*` + `packages/sdk/js`, catalog deps, `patches/` + `patchedDependencies` (bun patch precedent), root `oxlint`, `turbo typecheck` gate, `bunfig.toml` forbids root tests. |
| Upstream-sync precedent | `SYNC_CHECKLIST.md` + `UPSTREAM_ROADMAP.md` already document divergence-audit methodology vs upstream `opencode` — mirrored for chamber tracking (`script/chamber-sync.sh` + `docs/chamber-sync-checklist.md`, landed in Phase 1). |

### 1.2 Platform contract (must keep working)

`packages/app/src/context/platform.tsx` (247 lines) exports the `Platform` interface via `createSimpleContext` (`PlatformProvider` / `usePlatform`) plus types `PushCred`, `PairInfo`, `PushPrefs`, `PushDiag`, `PushState`, `NotifyOpts`, `FatalRendererErrorLog`, `DisplayBackend`. Surface:

- Shell: `openExternal`, `openLink`, `notify` (with `NotifyOpts`), `back`, `forward`, `restart`, optional `haptic`, `share`
- Storage: `storage(name)` — **per-workspace storage namespaces** (caveat §3.9)
- Server prefs: `getDefaultServer` / `setDefaultServer`
- Fork push methods: `pushState`, `requestPushPermission`, `beginPushPairing`, `getPushPairing`, `setPushPreferences`, `setPushRelayURL`, `setPushCredentials`, `clearPushPairing`, `testPush`, `openSystemSettings` (pairing logic in `packages/app/src/utils/push-pair.ts` + `context/push-pair.tsx`; UI in `src/components/settings-mobile-notifications.tsx`; `runPushSetup` etc. re-exported from `src/index.ts`)

Window events consumed (in `packages/app/src/context/push-pair.tsx`, `context/server-sdk.tsx`, `pages/layout/deep-links.ts`): `opencode:resume`, `opencode:transcription` (**being removed by the in-flight voice work**), `opencode:deep-link` (detail.urls).

### 1.3 Boot & backend usage

- `packages/app/src/entry.tsx`: server URL from `VITE_OPENCODE_SERVER_HOST`/`VITE_OPENCODE_SERVER_PORT` (default `localhost:4096`) or `location.origin`; persisted default-server key **`opencode.settings.dat:defaultServerUrl`**; `auth_token` query param → server auth (stripped from URL after use).
- Protocol negotiation: `packages/app/src/utils/server-protocol.ts` (36 lines; probes `/global/health` vs `/api/health` → `"v1" | "v2"`) and `server-protocol-resilient.ts` (59 lines). **Phase 0 discovered** (§Phase 0 results): `/api/config` is not a v2 route — the Solid app runs 1.18.x servers in v1 mode today, which is fine for it.
- SDK: workspace `packages/sdk/js` is `@opencode-ai/sdk` **1.18.11** with both `src/gen` (v1) and `src/v2/gen`; chamber-ui keeps its own npm `@opencode-ai/sdk@1.18.25` (exact match to the installed backend).
- **Installed backend CLI: `opencode 1.18.25`**. Auth is **HTTP Basic** (`Authorization: Basic base64(user:pass)`), not bearer (Phase 0 correction — P2 implemented accordingly).

### 1.4 i18n, theming, tests

- i18n: 18 locale files in `packages/app/src/i18n/` — `en, de, es, fr, ja, ko, pl, tr, uk, zh, zht, br, ar, ru, th, no, da, bs` + `parity.test.ts`.
- Theming: `packages/ui` (`@opencode-ai/ui`) Solid token library with `generate:tailwind`; its only consumer is `packages/session-ui`, which in turn is only consumed by `packages/app` (verified). **Rev 2: this chain stays permanently** (UI 2 forever) — no retirement.
- Tests: `bun test --conditions=solid --preload ./happydom.ts` (scope with the direct command per AGENTS.md — `test:unit` passes `--only-failures`); Playwright e2e under `packages/app/e2e/{smoke,regression,user-story,performance}` with fixtures per `packages/app/e2e/AGENTS.md` (import `test`/`expect` from `../fixtures`; `withSession`/`trackSession`/`trackDirectory`; env `PLAYWRIGHT_SERVER_HOST/PORT` default `127.0.0.1:4096`, `PLAYWRIGHT_PORT` default 3000).

---

## 2. Findings — OpenChamber (verified in `/tmp/opencode/openchamber` @ `2c8ae9a`)

### 2.1 Architecture

- Packages: `web` (SPA shell + Express server), `ui` (the shell-agnostic React UI lib), `mobile` (Capacitor app), `electron`, `vscode`, `docs`. Root: bun `1.3.14`, engines `node >=22`.
- `packages/ui` (`@openchamber/ui@1.22.0`): **build script is only `tsc --noEmit`** — it is a lib, not an app. The runnable SPA entries (HTML + vite config) live in **`packages/web`** (`index.html`, **`mobile.html`**, `mini-chat.html`, `vite.config.ts`, `src/`). Vendoring therefore took `packages/ui` **plus** the mobile entry bits of `packages/web`.
- Runtime abstraction (the key to direct-connect): `packages/ui/src/lib/{runtime-url,runtime-fetch,runtime-auth,runtime-auth-expiry,runtime-switch}.ts` + `src/lib/opencode/client.ts` — `DEFAULT_BASE_URL = import.meta.env.VITE_OPENCODE_URL || "/api"` (client.ts:44), absolute-URL + auth-header injection supported, runtime URL switching for multi-instance. `process.cwd()` leak at client.ts:584–585 guarded in the vendored copy.
- Surface detection: `src/lib/runtimeSurface.ts` — priority: **explicit `window.__OPENCHAMBER_SURFACE__` stamp → `?surface=mobile|desktop` URL override → Capacitor shell → desktop/VSCode shells → phone-viewport heuristic**. The URL override gives free mobile-surface testing in a desktop browser.
- Mobile boot: `src/apps/renderMobileApp.tsx` — takes **`apis: RuntimeAPIs`** (injectable runtime APIs), stamps `__OPENCHAMBER_SURFACE__ = 'mobile'` first, preloads markdown renderer, applies device classes pre-paint. Native-shell detection was Capacitor-only; Phase 3 extended it (Tauri checks + `window.__ANEMOS_SHELL__` marker) so `SessionAuthGate` is skipped and notifications route to our implementation. Relevant to **UI 1**: the remote chamber page is chamber's *web* runtime — it will show its own `SessionAuthGate` if the user's server requires a UI password; that is correct and none of our business.
- Mobile app surface: `src/apps/MobileApp.tsx` + mobile surface family (`MobileConnectionWelcome`, `MobileInstancesSurface`, `MobileSessionsSheet`, `MobileFilesSurface`, `MobileChangesSurface`, `MobileHeader`, deep links via `src/apps/deepLinks.ts` + `deepLinkNavigation.ts`, connections/secure storage via `src/apps/mobileConnections.ts`).
- Deep-link scheme is **hardcoded `openchamber://`** — remapped to `opencode://` in the vendored copy (P3). For **UI 1** this is inverted: the remote page legitimately uses `openchamber://` links; on a device without the chamber app installed they simply no-op (harmless — noted §3.22).
- State/sync: `src/sync/` — `sync-context.tsx`, `global-sync-store.ts`, `session-ui-store.ts` (optimistic mutations, client-generated message IDs reconciled via SSE), `streaming.ts`, `child-store.ts`, `notification-store.ts`, plus `use-sync.ts`. Virtualization: `@legendapp/list` 3.3.8, `@tanstack/react-virtual` 3.14.5, `virtua` 0.49.1.
- Workers: markdown pipeline in `src/components/chat/markdown/markdown-worker.ts` (`markdown-shiki.worker.ts?worker&url`, `type: 'module'`) and diff worker (`@pierre/diffs/worker/worker.js?worker&url`) — needs vite worker bundling (`worker.format: es`) and CSP-compatible serving in the WebViews.
- i18n: own lib at `src/lib/i18n`, messages as flat key maps split per domain per locale. **12 locales: `en, de, es, fr, ja, ko, pl, pt-BR, tr, uk, zh-CN, zh-TW`** — all 12 of these languages exist in our 18 (mapping `zh→zh-CN`, `zht→zh-TW`, `br→pt-BR`); the 6 ours-has-that-chamber-lacks are `ar, ru, th, no, da, bs`.
- Theming: `ThemeSystemProvider` (`src/contexts/`), CSS-var generation, JSON themes in `src/lib/theme/themes/`. Custom brand themes are just additional JSON files — our palette ports as an `anemos` theme.
- Router: custom path registry in `src/lib/router/` — the Phase 4 feature registry hooks exactly here.
- Capacitor build pattern (reference for our mobile packaging): `packages/mobile` — `build` = web build + `prepare-web-assets.mjs` (`index.html := mobile.html` byte-copy), `sync` = build + `cap sync`.

### 2.2 Browser-neutrality problems in `packages/ui` (verified dependency list)

`dependencies` include server/node-only and Capacitor-only packages: `express@^5`, `http-proxy-middleware`, `simple-git`, `ghostty-web` (terminal), `@xenova/transformers` (in-browser ML), `@capacitor/*` + `@aparajita/capacitor-secure-storage`. Phase 4's import-graph audit confirmed none of the server-side ones are reachable from the mobile entry (0 eager references; the only lazy exception is `heic2any` for attachment conversion, on-demand). Relevant to **UI 1**: none of this matters there — the remote page ships whatever its own server bundles.

### 2.3 Express-dependent features (`packages/web/server/lib/*`, verified directory list)

| Chamber feature (server lib) | UI surface | Disposition for UI 3 (direct-connect) |
|---|---|---|
| `ui-auth` (JWT cookie gate) | `SessionAuthGate` | **Cut for native** (skipped for anemos runtimes — P2) |
| Client-token pairing / instance auth | `MobileConnectionWelcome`, `mobileConnections.ts` | **Local** — direct URL/token + password connection remain (P4: `client-auth` cut, direct instances kept) |
| `terminal` (+ ghostty-web) | Terminal panel | **Cut in UI 3** — **available in UI 1** |
| fs browsing (`/api/fs/*`) | `MobileFilesSurface`, file pickers | **Cut in UI 3** — **available in UI 1** |
| git (`/api/git/*`) | `MobileChangesSurface` (diff review) | **Cut in UI 3** — **available in UI 1** |
| `tunnels` + QR | remote-instance connect | **Cut in UI 3** — **available in UI 1** |
| `session-knowledge`, `session-goal`, `session-assist`, `session-folders` | recaps/knowledge/folder UI | **Cut in UI 3** — **available in UI 1** |
| `scheduled-tasks` | tasks UI | **Cut in UI 3** — **available in UI 1** |
| agent-memory, browser-control, dev-servers | respective panels | **Cut in UI 3** — **available in UI 1** |
| github / linear integrations | integration settings | **Cut in UI 3** — **available in UI 1** |
| `tts`, `text`, dictation | voice features | **Cut in UI 3** (aligns with voice removal) — **available in UI 1** |
| push (vapid + APNs relay), `relay` | notification settings | **Reimplemented** from opencode SSE events + our fork push relay/pairing (Phase 5) |
| chamber config / settings / themes / plugins / skills / snippets routes | settings surfaces | **Minimal local subset** (P4 verified appearance/typography/model prefs persist client-side via `anemos.settings.v1:<key>` without these routes) |
| `quota`, `security`, `small-model`, `system-prompt`, `skills-catalog`, `walkthrough` | assorted | **Cut in UI 3** — **available in UI 1** |

> **Rev 2 note:** the "Reimplement later" ambitions of Rev 1 are retired — with UI 1 loading the user's full chamber server, every cut feature remains reachable through UI 1 against a chamber server. UI 3 stays a lean direct-opencode surface; the §2.3 "later" items only return if the user asks for them *without* a chamber server.

**Pure-opencode-SDK core (kept in UI 3):** sessions, messages/parts streaming (SSE), prompts, commands, permissions/questions, providers/auth incl. OAuth, config, models, agents, tools, MCP — all through `createRuntimeOpencodeClient` with absolute base URL + Basic auth.

### 2.4 Interesting details worth keeping in mind

- Mobile locks transport to **SSE** — matches our WebView constraints (and P2 chose SSE for anemos runtimes because browser WebSockets cannot carry the Basic `Authorization` header).
- 30s timeout on non-streaming requests in their client — fits our observed config/model call latencies.
- `apps/mobileWidgetSnapshot.ts` exposes a widget-snapshot bridge for iOS home-screen widgets — a future win for our Swift shell (works in UI 3; not in UI 1).
- Chamber's web package also has `mini-chat.html` — multi-entry vite precedent.

### 2.5 Compat matrix (verified versions)

| Component | Version | Notes |
|---|---|---|
| Our installed `opencode` CLI backend | **1.18.25** | Serves the complete v2 surface natively (Phase 0 spike 1) |
| Chamber UI pinned SDK | `@opencode-ai/sdk@1.18.25` (npm) | `/v2` imports — exact match to our backend |
| Our workspace `packages/sdk/js` | 1.18.11 | Solid app only; chamber-ui keeps its npm dep |
| Their bun / our bun | 1.3.14 / **1.3.13** | Keep ours; vendored code doesn't check bun |
| Their engines | `node >=22` | Satisfied by our runtime; recorded in PROVENANCE |
| React / Zustand / Tailwind | 19.1 / 5.0.8 / v4 | Present in the vendored package |
| User's OpenChamber server (UI 1 target) | current, self-run | Whatever version they run; entirely their stack — no coupling to our vendored copy |

---

## 3. Caveats / Things to Worry About (checklist)

1. **Uncommitted voice/whisper-removal work in the tree (STILL UNCOMMITTED as of Rev 2)** — touches `packages/app/src/*`, `packages/{ios,android}/src/*`, native Swift/Kotlin/Rust bridge files, and deletes tracked built assets `packages/ios/WebAssets/*.js`. Phases 0–4 never touched those files. **Phases 8–10 (shell integration) DO share touchpoints** (`entry-*.tsx` neighbors, `bridge.ts`, rust `mobile-bridge` Kotlin/Rust) — the voice work **must land before P8 starts**. Also: two stray untracked playwright-cli snapshots (`chamber-mobile-initial.yml`, `chamber-mobile-noenv.yml`) — delete (P11).
2. **SDK compat** — chamber is **v2-only**; UI 3 requires a v2-capable backend (boot guard implemented in P2 against `/global/health`). **Rev 2: v1-only servers are permanently served by UI 2 (Classic)** — the old strand-users risk is dissolved; the guard screen in UI 3 should now *suggest switching to Classic* rather than only "update your backend".
3. **CORS / WebView origin (RESOLVED by Phase 0 spike 2)** — allow-list: `http://localhost:*`, `http://127.0.0.1:*`, `tauri://localhost`, `http(s)://tauri.localhost`, `oc://renderer*`, `*.opencode.ai`; `Authorization` explicitly allowed in preflight; escape hatches `--cors` / `server.cors`. **P8+ constraint: keep the iOS custom scheme exactly `tauri` (host `localhost`); never serve the webview over `https://localhost`.** `capacitor://localhost` is NOT allow-listed (relevant only if debugging with chamber's own Capacitor shell).
4. **Markdown/diff worker bundling** — `?worker&url` + `type: 'module'`; vendored config sets `worker.format: es` (P1). Still to verify on-device (P10 checklist): worker loads under the WKWebView custom scheme + Android WebView CSP.
5. **`process.cwd()` leak** — guarded in the vendored copy via the ported `process.env`/`global` defines.
6. **Browser-neutrality of `@openchamber/ui`** — resolved for the mobile entry by the P4 import-graph audit (0 eager references to express/simple-git/ghostty/transformers; lazy `heic2any` only). Re-audit after every upstream sync.
7. **SSE-only transport** — correct for mobile; verified live against `:42447` (P2).
8. **Upstream churn (≈139 releases/yr)** — manual re-sync via PROVENANCE + `script/chamber-sync.sh` + `// ANEMOS-PATCH:` markers. **Rev 2 lowers urgency**: UI 3 is a cut-down surface we control; full-featured chamber comes from the user's own server (UI 1), which tracks upstream independently of our vendored copy.
9. **Storage semantics per workspace** — our Platform `storage(name)` is per-workspace namespaced; the P3 migration copies `opencode.settings.dat:defaultServerUrl` one-way into chamber's instance list (old key untouched, so UI 2 is unaffected).
10. **i18n delta (REVISED)** — chamber's 12 locales cover 12 of our 18 languages natively (`zh/zh-CN`, `zht/zh-TW`, `br/pt-BR` mapping). The 6 chamber lacks (`ar, ru, th, no, da, bs`) are **deferred, not gated** (D8.6): UI 2 ships all 18 forever, so no user loses their language. Add net-new languages to UI 3 on demand.
11. **MIT attribution** — `packages/chamber-ui/LICENSE` + `PROVENANCE.md` (landed P1); refreshed in P11.
12. **`packages/ios/WebAssets` is committed to git** — the combined three-entry asset bundle (Rev 2) grows the committed tree; measure in P8; consider gitignoring built assets as a separate decision (P11 flags it again).
13. **Hardcoded `openchamber://` scheme** — remapped in UI 3 (P3). In UI 1 the remote page's own `openchamber://` links no-op on our devices (no chamber app installed) — harmless, but QR/connect links inside UI 1 cannot deep-link back; users copy/paste instead (§3.22).
14. **SessionAuthGate / notifications keyed to native detection** — extended in P3 for our shells. In UI 1, chamber's web runtime *should* show its own gate when the user's server has a UI password — correct behavior, do not suppress.
15. **`auth_token` query-param boot** — preserved in UI 3 (P2, Basic semantics).
16. **Feature-cut discoverability** — registry landed (P4: 13 enabled / 23 cut, every entry individually re-enableable).
17. **30s non-streaming timeout** — observed fine against LAN servers.
18. **Turbo/typecheck gates** — chamber-ui wired into turbo; excluded from root oxlint.
19. **REV 2 — Native bridge must not leak to remote UI 1 content (SECURITY).** With one WebView navigating to the user's chamber URL, every native capability we expose to local pages (notify, push pairing, storage, share, bridge commands) must be origin-gated: (a) iOS — verify WKUserScript injection scope and every `PlatformBridge`/`BridgeController` handler rejects non-`tauri://localhost` origins (check `BridgeController.swift` message handlers); (b) Android/Tauri — do NOT add the chamber server to any remote-IPC capability (`dangerousRemoteDomainIpcRules` stays absent); IPC only for the local `http://tauri.localhost` origin. P9 includes an explicit pen-test: from a page served *by the chamber server*, attempt bridge invokes — all must fail.
20. **REV 2 — Gesture platform conflicts.** iOS **iPad**: four-finger swipe-up is the system multitasking gesture when Multitasking Gestures are enabled — the system wins and ours never fires. Mitigations: primary gesture stays 4-finger swipe-up (iPhone: no conflict), plus a 4-finger **double-tap** alternate recognizer, plus the selector is always reachable by relaunching the app. Android: no system 4-finger conflicts known (3-finger is the risky one on some OEMs — avoid); implement in the existing `mobile-bridge` Kotlin plugin with deliberate thresholds (pointer count ≥ 4, distance/velocity gates) to avoid accidental triggers during scrolling/typing.
21. **REV 2 — One WebView, navigation-based switching.** Only one JS runtime alive at a time (memory-safe: chamber full UI is a heavy desktop-class SPA — three live WebViews would be unacceptable on device). Cost: switching UIs reloads them (UI 1 re-hydrates its SPA; UI 3 reconnects SSE) and unsaved composer drafts are lost — acceptable, note in selector copy. Do NOT attempt overlay-WebView architectures.
22. **REV 2 — UI 1 operational quirks.** Remote page needs https (ATS) or a LAN-http ATS exception on iOS (decide when the user's server URL is configured — if `http://<lan-ip>`, add the exception to `Info.plist`); webview cookie jar is origin-scoped so chamber's UI-password session persists per-server; chamber's own service worker (`sw.js`) will register in the webview — verify it doesn't fight our navigation lifecycle; `openchamber://` links inside UI 1 no-op (§3.13).
23. **REV 2 — Per-UI server semantics can confuse users.** UI 1 talks to the *chamber server*; UIs 2/3 talk to the *opencode server*. The selector must label each UI's target server (and UI 1's reachability) so nobody sends prompts to the wrong backend. Session histories do not transfer between UI 1 and UI 3 (different servers/stores).
24. **REV 2 — Three-surface maintenance burden.** UI 2 (frozen but permanent), UI 3 (vendored, synced), UI 1 (external, zero-maintenance for us) + selector glue in two native shells. The plan keeps UI 2 at zero changes and confines shell glue to small, additive native modules; every future feature decision must now state *which UI* it targets.

---

## 4. Decision Log

### D1 — Packaging: **Vendor into `packages/chamber-ui` at a pinned upstream commit** (adopted; executed P1)

- Options: (a) vendor copy; (b) git subtree; (c) npm-published fork.
- **Adopted: (a) vendor copy** of `packages/ui` + the mobile entry shell from `packages/web`, at commit `2c8ae9a`, package name kept **`@openchamber/ui`** (version `1.22.0-anemos.1`), consumed as a workspace package.
- Rationale: subtree merges at 139 releases/yr with our in-vendor patches would be unreviewable; an npm fork needs publishing infrastructure we lack; vendoring matches the repo's divergence-tracking culture. Mitigation for manual re-sync: PROVENANCE + sync script/checklist + `// ANEMOS-PATCH:` markers. **Rev 2 note:** with UI 1 covering full-feature chamber, upstream-sync pressure on the vendored copy drops further.

### D2 — Connection architecture: **(a) Direct absolute URL, no middle layer** (adopted; executed P2)

- Options: (a) UI → direct absolute URL to `opencode serve` backends; (b) bundle trimmed Express sidecar inside the native shells; (c) hybrid.
- **Adopted: (a)** — chamber's runtime abstraction with `DEFAULT_BASE_URL` resolved from our env, **HTTP Basic** auth injection (Phase 0 correction: not bearer), SSE transport (browser WebSockets can't carry the Basic header). Verified live against `:42447`.
- **v1/v2 sub-decision:** UI 3 requires a v2-capable backend; boot guard probes `GET <base>/global/health` (JSON + `healthy: true`); no v1 fallback is ported. **Rev 2:** v1-only servers are permanently the domain of UI 2.
- **Rev 2 amendment:** D2 now governs **UI 3 only**. UI 1 is the counter-case the user adopted deliberately: a full chamber *server* (their own), consumed remotely — no anemos middle layer there either, just a WebView navigation. The Rev 1 "sidecar if a killer feature demands it" escape hatch is retired: killer features now come via UI 1.

### D3 — Auxiliary feature scope: **minimal core + explicit cut list + feature registry** (adopted; executed P4)

- UI 3 keeps only the pure-opencode-SDK core: 13 enabled features (`sessions`, `chat`, `composer`, `commands`, `providers`, `models`, `agents`, `mcp`, `permissions`, `questions`, `i18n`, `appearance`, direct `instances`); 23 cut with typed reasons, each independently re-enableable (`packages/chamber-ui/src/features/registry.ts`).
- Runtime registry (not build-time excludes): debuggable, reversible, immune to import-graph surprises; P4's audit proved the mobile entry graph has 0 eager references to server/terminal deps.
- **Rev 2 note:** the registry is now also the map of "what UI 1 gives you instead" — each cut entry's stub screen in UI 3 should say so (P6 copy pass: "Available in Chamber Full").

### D4 — Native integration: **React entries in the vendored package + Platform adapter** (adopted; executed P3)

- `renderMobileApp` runs via anemos adapters; native detection extended (Tauri checks + `window.__ANEMOS_SHELL__`); storage adapter + one-way `defaultServerUrl` migration; `opencode://` deep links; `opencode:resume` → chamber reconnect; notifications/haptics/share via the existing framework-agnostic bridges.
- **Rev 2 amendment:** the Rev 1 **`FRONTEND=chamber` build-time either/or switch is superseded** by D8's combined-bundle architecture (both UIs ship together, selection is a launch-time route). The `vite.chamber.config.ts` idea from Rev 1 P8 is replaced by the P8 combined asset layout (`selector.html` + `classic.html` + `chamber.html` in one bundle). The voice-work-before-shell-work constraint carries over to P8.

### D5 — Disposition of `packages/app`, `packages/session-ui`, `packages/ui`, i18n, theming (**SUPERSEDED IN PART BY D8**)

- Rev 1 said: freeze, then delete at cleanup; port all 18 locales; chamber theming becomes source of truth.
- **Rev 2 amendment (what stands vs what changed):**
  - `packages/app` / `session-ui` / `ui`: **permanent, never deleted.** UI 2 is a first-class interface. Maintenance posture: zero-changes (bug fixes only, at the user's discretion) — the §1.1 divergence burden is accepted because Classic is the compatibility floor (v1 servers, 18 locales, familiar UX).
  - **i18n:** the all-18 gate is **dropped** (D8.6). UI 3 ships chamber's stock 12 (all of which are languages we already serve); the 6 net-new (`ar, ru, th, no, da, bs`) are added on demand. Parity test covers the shipped set.
  - **Theming:** unchanged — `anemos` JSON theme (light/dark) for UI 3 brand continuity; UI 2 keeps `@opencode-ai/ui` tokens (untouched).

### D6 — Repo hygiene (adopted; P1 partial → P11 completes)

- `packages/chamber-ui/LICENSE` (upstream MIT) + `PROVENANCE.md` (repo URL, commit `2c8ae9a`, local-change ledger). Bun stays 1.3.13; chamber-ui in turbo typecheck, out of root oxlint. `.gitignore`: nothing needed for the `/tmp` clone (PROVENANCE records it).
- **Rev 2 addition:** P11 also records the UI 1 architecture in PROVENANCE (no code from upstream is used for UI 1 — only a URL) and sweeps the stray snapshot yml files.

### D7 — Rollout & verification (adopted, amended)

- Browser dev loop first, narrowest unit/e2e, then device (`beam`, `ANDROID_BUILD.md`, `scripts/deploy-ipa.mjs`); `bun run typecheck` per commit; default mobile builds green on every commit.
- **Rev 2 amendment:** "default stays Solid until cutover" becomes **"default = remembered selection, initial default Classic; there is no cutover"**. The green-builds invariant is preserved by P8's combined-bundle switch: the selector ships disabled-by-configuration first (launch routes straight to Classic), then gesture/selector, then UI 1 — each step independently revertible.

### D8 — REV 2 — **Three-interface shell architecture with native gesture + HTML selector** (adopted)

The user runs an OpenChamber server and wants three selectable interfaces (1: remote chamber full UI; 2: current Solid app, unchanged; 3: our vendored direct-connect build) plus a launch/selector screen, a four-finger-swipe-up (iOS) return gesture, and per-UI server routing.

**D8.1 — Selector placement: local HTML selector page + native launch routing & gesture (hybrid). RECOMMENDED.**
- Options: (a) fully native selector screens (Swift view + Android native view); (b) pure web boot-router that stays resident with UIs in overlay WebViews; (c) **hybrid: a tiny local `selector.html` (no framework, ~one screen) loaded into the single WebView; native code owns launch routing, the gesture, and a `selectUI`/`getSelectedUI` bridge; choosing an entry navigates the WebView to the target (local bundle or remote URL)**.
- Rationale: the gesture *must* be native (remote UI 1 pages can't dispatch our window events — user's own constraint), so native code already sits in the perfect position to trigger the selector — showing it is then just "navigate to `selector.html`", not a second native UI toolkit to build and style in two languages. One selector implementation shared by both platforms, styled with web tech, able to call the existing bridges (it's local content) to read/write selection and per-UI server config. Option (a) doubles native UI code asymmetrically; option (b) either dies once the WebView navigates remote or forces overlay WebViews (memory + lifecycle pain).
- **D8.2 — WebView model: single WebView, navigation-based switching.** Only one JS runtime alive (chamber full UI is desktop-class heavy; three live runtimes is unacceptable on device). Cost: reload on switch + draft loss — accepted, noted in selector copy.
- **D8.3 — Gesture: four-finger swipe-up primary (both platforms), four-finger double-tap alternate, deliberate thresholds.** iOS: `UIGestureRecognizer` (4 touches, upward velocity/distance gates) attached to the WKWebView; iPad system-multitasking conflict documented (§3.20). Android: extend the existing `mobile-bridge` Kotlin plugin with touch interception (pointer count ≥ 4 + gesture math); avoid 3-finger (OEM screenshot conflicts). Fallbacks: the alternate recognizer, plus relaunch (selector shows at cold start when no selection is remembered or on a "confirm on launch" setting).
- **D8.4 — Per-UI server config: UI 1 → chamber server URL (native-stored, editable on the selector; chamber's own auth in-page); UIs 2/3 → shared opencode default server** (existing `defaultServerUrl` settings; UI 3 additionally reads the P3-migrated instance list). Selection remembered in native storage (UserDefaults / the Kotlin plugin's SharedPreferences) so launch routing works before any web content loads.
- **D8.5 — Remote-content security: origin-gate every native capability** (§3.19) — local scheme only; pen-test from a chamber-server-served page in P9.
- **D8.6 — i18n scope: UI 3 ships chamber's stock 12 locales; the 18-locale gate is dropped.** Rationale: UI 2 permanently covers all 18; porting/authoring 6 net-new languages for UI 3 was Rev 1's biggest non-shell cost and now protects nobody. Net-new languages become demand-driven backlog. (Supersedes the Rev 1 D5 i18n bullet; see P6.)
- **What D8 supersedes:** Rev 1 P9 (cutover) — dissolved; Rev 1 P10 (deletion) → P11 docs-only; Rev 1 D4's `FRONTEND` either/or switch → combined bundle; Rev 1 D5 i18n gate → D8.6; Rev 1 §2.3 "reimplement later" items → "available via UI 1".

---

## 5. Phased Implementation Plan

> Conventions for every phase: run commands from repo root unless noted; never run tests from repo root (`bunfig.toml` guard); scope unit tests with the direct `bun test --conditions=…` command (`test:unit` passes `--only-failures` and cannot be scoped by appending a path); commit each phase separately; `bun run typecheck` green before moving on.

### Phase mapping (Rev 1 → Rev 2)

| Rev 1 phase | Rev 2 phase | Disposition |
|---|---|---|
| P0 spikes | P0 | **EXECUTED** (historical record below) |
| P1 vendor | P1 | **EXECUTED** |
| P2 connection runtime | P2 | **EXECUTED** |
| P3 native adapter | P3 | **EXECUTED** |
| P4 feature registry | P4 | **EXECUTED** |
| P5 push | P5 | unchanged scope; device refs renumbered to P10 |
| P6 i18n parity (all 18) + theming | P6 | **rescoped** — theming + 12-locale hardening + "available in UI 1" copy (D8.6) |
| P7 e2e smoke | P7 | unchanged |
| P8 mobile build switch + device verify | P8 + P9 + P10 | **absorbed & expanded** — P8 selector/gesture/launch routing + combined bundle; P9 UI 1 remote surface; P10 three-UI device verification |
| P9 cutover | — | **DISSOLVED** (no cutover; default = remembered selection, initial Classic) |
| P10 cleanup/deletion | P11 | **softened** — attribution/sync docs, dead code, housekeeping; NO package deletions |

---

## EXECUTED PHASES 0–4 (historical record — do not modify when executing later phases; results appended at execution time are preserved verbatim)

### Phase 0 — Spikes & de-risking (docs only, no product code) — **EXECUTED** (results in plan commit `37b8697`)

**Goal:** Kill the three biggest unknowns before any vendoring: v2 completeness of target backends, CORS/origin behavior from a WebView-style origin, and a reproducible upstream mobile build.

**Files:** `docs/plans/openchamber-ui-migration.md` (append spike results), nothing else.

**Steps:**
- Probe the persistent backend `:42447` and a fresh `opencode serve --port 4096` (CLI 1.18.25): confirm `/api/health`, `/api/config`, `/v2` session/event endpoints return JSON with correct content-types (reuse the probe technique from `packages/app/src/utils/server-protocol-resilient.ts`; issue raw HTTP via Node `net`/sandbox per AGENTS.md rules — `curl`/`fetch` are blocked).
- CORS spike: from a non-localhost origin (any static server), verify preflight/actual responses for `/api/config` and the SSE endpoint; record which headers the backend sends; consult the recently added webview CORS debugging skill (commit `e43d25412`). Record whether the current Solid app relies on a Tauri origin exemption we must replicate.
- In `/tmp/opencode/openchamber` (read-only reference): run their `packages/mobile` build (`bun install`, `bun run --cwd packages/web build`, `node scripts/prepare-web-assets.mjs`) to confirm the mobile HTML entry builds and to capture the asset layout we will reproduce.
- Record all results in this plan file under a "Phase 0 results" heading.

**Verify:** findings appended; no repo code changed (`git status` shows only the plan file + pre-existing voice work).

**Rollback:** N/A (docs).

### Phase 1 — Vendor `packages/chamber-ui` + standalone browser render — **EXECUTED** (`37b8697`, `ec0d6d38`)

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

### Phase 2 — Anemos connection runtime + v2 boot guard — **EXECUTED** (`72db8a70b`; live-verified against `:42447`, SSE working)

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

### Phase 3 — Native adapter (Tauri/Swift shells) — **EXECUTED** (`5c6d196ac`, `8500cc7c6`; typecheck + 16 unit tests + build PASS)

**Goal:** `renderMobileApp` runs inside our native shells with the right surface, no auth gate, our notifications/storage/deep-links/resume/haptics/share.

**Files:** `packages/chamber-ui/src/anemos/{runtime-apis.ts,platform-adapter.ts,deep-links.ts,storage.ts}`, `packages/chamber-ui/src/lib/runtimeSurface.ts` or `src/lib/platform.ts` (`// ANEMOS-PATCH:` native detection extension), `packages/chamber-ui/src/apps/renderMobileApp.tsx` (detection patch only), `packages/chamber-ui/src/apps/deepLinks.ts` + `deepLinkNavigation.ts` (scheme remap).

**Steps:**
1. Extend native-shell detection: recognize Tauri (`'__TAURI_INTERNALS__' in window` / `location.protocol === 'tauri:'` / `http://tauri.localhost` origin) and the iOS WKWebView (our Swift bridge sets a marker, e.g. `window.__ANEMOS_SHELL__ = 'ios' | 'android'`) alongside the existing Capacitor check, so `SessionAuthGate` is skipped and the notifications no-op branch is replaced by our injected API.
2. Implement `anemosRuntimeAPIs`: `notifications.notifyAgentCompletion` / `canNotify` over our Platform `notify` (+ `NotifyOpts` semantics); remaining `RuntimeAPIs` members mapped or stubbed per the interface at `src/lib/api/types`.
3. Storage adapter: implement chamber's persistence needs (instances, appearance, prefs) over `createBridgeStorage` (iOS) / `createTauriStorage` (Android) — both verified framework-agnostic. **Migrate** `opencode.settings.dat:defaultServerUrl` into the chamber instance list on first boot (one-way, idempotent; keep the old key untouched for the Solid app during coexistence).
4. Deep links: remap `openchamber://` → `opencode://` in `deepLinks.ts`/`deepLinkNavigation.ts` and locale strings; feed `detail.urls` from our native events into chamber's navigation.
5. `opencode:resume` window event → trigger chamber's reconnect path (sync reconnect-recovery); haptics/share/openExternal via bridge calls mirroring the current `entry-*.tsx` logic (read both entry files as the porting checklist — 218 + 254 lines).

**Constraints:** the vendored edits stay marked and minimal; prefer adapter files under `src/anemos/` over in-place rewrites.

**Reuse:** `packages/ios/src/{bridge.ts,ios-storage.ts}`, `packages/android/src/{bridge.ts,storage.ts}`; Platform method semantics from `packages/app/src/context/platform.tsx`; resume/deep-link handling patterns from `packages/app/src/context/server-sdk.tsx` + `pages/layout/deep-links.ts`.

**Verify:** browser (with a `window.__ANEMOS_SHELL__` shim + `?surface=mobile`): auth gate absent, connect flow uses migrated default server, `opencode:resume` dispatch reconnects; unit: storage migration + scheme remap.

**Rollback:** revert commit; Phase 1–2 behavior unaffected.

### Phase 4 — Feature registry & cuts — **EXECUTED** (`ee2d56cbb`, `72aa96310`; registry = 13 enabled / 23 cut; bundle audit clean)

**Goal:** No reachable UI surface calls a chamber-Express route; the app presents the phase-1 core cleanly.

**Files:** new `packages/chamber-ui/src/features/registry.ts`; `// ANEMOS-PATCH:` hooks in `src/lib/router/` (route gating), the mobile nav surfaces (`src/apps/MobileApp.tsx`, `MobileFilesSurface`/`MobileChangesSurface`/etc. lazy-import wrappers), settings sections; new stub component `src/features/unavailable.tsx`.

**Steps:**
1. Define the registry with the §2.3 dispositions encoded (all `enabled: false` with reasons; core features `true`).
2. Gate routes + nav entries + settings sections through it; lazy-import wrappers render the stub for deep links into cut surfaces.
3. Sweep for eager imports of cut features from the mobile entry (bundle analyzer) — especially `ghostty-web`, `@xenova/transformers`, `simple-git`, `express` transitively; force lazy or stub.
4. Confirm appearance/typography/model prefs persistence survives without the chamber config routes.

**Verify:** browser pass over every remaining nav surface with the network tab clean of non-opencode requests; build with a manifest audit showing no express/simple-git/ghostty chunks in the mobile entry graph.

**Rollback:** flip registry entries to `true` individually.

---

## EXECUTION RESULTS RECORD (Phases 0–4, preserved verbatim — appended at execution time)

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
| `https://app.opencode.ai` (regex `^https:\/\/([a-z0-9-]+\.)*opencode\.ai$`) | ✅ echoed |
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
1. **Root-absolute asset URLs** (`/assets/…`) and `crossorigin` attributes — our mobile vite configs must override `base: "./"` (the WKWebView scheme handler serves from a bundle root, and our current iOS/Android configs already use `base: "./"`).
2. The PWA plugin rides along (`sw.js`, manifest, icons) — harmless in a webview, but the vendored config can drop it.
3. Their `dist` bundles **three** entry graphs (desktop/mobile/mini-chat) with duplicated grammar/theme chunks — our mobile-entry-only vendored build is substantially smaller.
4. Heaviest chunks to watch in the Phase 4 lazy/stub sweep: `useAppFontEffects` 3.5 MB, `vendor-elkjs` 1.4 MB, `vendor-heic2any` 1.35 MB, `vendor-ghostty-web` 625 KB (cut features), `useAppFontEffects`/heic2any are the surprises not on the §2.2 list.

**Impact on later phases:** Phase 1 reproduces the single mobile entry (`mobile.html` + `src/mobile-main.tsx`), `worker.format: 'es'`, and the `process.env`/`global` defines; the mobile packaging phases reproduce the `index.html := mobile.html` convention into `WebAssets/` / `dist/`. No toolchain blockers (host bun already satisfies their pin; no env vars or version flags needed).

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

## REMAINING PHASES (Rev 2 — restructured per D8)

### Phase 5 — Push notifications for UI 3 (fork relay/pairing) — unchanged scope

**Goal:** Feature parity with `settings-mobile-notifications.tsx` inside UI 3: permission, relay URL, pairing flow, preferences, test push.

**Estimate:** M (2–4 days).

**Files:** new `packages/chamber-ui/src/anemos/push/*` (pairing state machine ported from `packages/app/src/utils/push-pair.ts` + `context/push-pair.tsx`, settings UI component), registry entry `push: true` (fork-specific), wiring the `notifications` runtime API → push relay.

**Steps:**
1. Port `push-pair.ts` state machine verbatim (framework-neutral logic; adapt the reactive shell to React).
2. Port the settings UI into chamber's settings surface under an "anemos" section; call the Platform push methods through the P3 adapter.
3. Map chamber's notification triggers (agent completion, etc.) to our `notify` + `PushPrefs` (approval/question/error semantics).
4. Unit tests for the pairing machine (port `packages/app/src/utils/push-pair.test.ts`).

**Constraints:** no changes to `packages/app` (port, don't share source); all edits in `packages/chamber-ui` marked `// ANEMOS-PATCH:`.

**Verify:** direct `bun test` for ported tests; browser walkthrough of the pairing UI against a scratch relay; device verification happens in **P10** (renumbered from old P8).

**Rollback:** registry `push: false` hides the section.

### Phase 6 — Theming + locale hardening (RESCOPED per D8.6)

**Goal:** `anemos` brand theme in UI 3; UI 3's shipped locale set (chamber's stock 12) verified key-complete with a parity gate; cut-feature stubs point users to UI 1. **The all-18-locale requirement is dropped** — UI 2 permanently covers the 6 remaining languages (`ar, ru, th, no, da, bs` become demand-driven backlog).

**Estimate:** S–M (1–2 days — down from Rev 1's largest non-shell phase).

**Files:** `packages/chamber-ui/src/lib/theme/themes/anemos-{light,dark}.json`, new `packages/chamber-ui/src/lib/i18n/parity.test.ts` (ported concept from `packages/app/src/i18n/parity.test.ts`), stub copy updates in `src/features/unavailable.tsx`, PROVENANCE note recording the D8.6 rescope.

**Steps:**
1. Create `anemos` theme JSONs from `packages/ui` token values; register alongside built-ins; default for the mobile surface.
2. Port the parity test over the **shipped** set (chamber's 12): every locale must define the union of keys actually referenced by the UI 3 build (including any ANEMOS-PATCH-added strings); missing → fail. This guards future upstream syncs from silently breaking locales.
3. Copy pass on cut-feature stub screens: "Not available in anemos — available in **Chamber Full** (UI 1) or **Classic** (UI 2)" wording (registry `reason` fields updated).
4. Record in PROVENANCE: 6 net-new languages deferred (D8.6); no gate blocks on them.

**Constraints:** do NOT delete chamber's locale files; do not author the 6 net-new languages in this phase.

**Verify:** direct `bun test` parity green (12 locales); browser visual check of the anemos theme; stub screens show the pointer to UI 1.

**Rollback:** theme is selectable; parity test is additive.

### Phase 7 — UI 3 e2e smoke suite (browser) — unchanged scope

**Goal:** Playwright coverage of UI 3 against a real backend, using our e2e conventions.

**Estimate:** M (2–3 days).

**Files:** new `packages/chamber-ui/e2e/` — `fixtures` (port conventions from `packages/app/e2e/AGENTS.md`: `withSession`/`trackSession`/`trackDirectory`, own `test`/`expect` re-exports), `playwright.config.ts` (env contract `PLAYWRIGHT_SERVER_HOST/PORT`, `PLAYWRIGHT_PORT`; chamber dev server on its port), `smoke/*.spec.ts`.

**Steps:**
1. Stand up UI 3 against a scratch `opencode serve` (default `:4096`).
2. Smoke specs: boot + connect; session create → send prompt → timeline renders streamed parts; composer model/agent selection; settings opens; boot-guard screen (unreachable backend, per the P2 verification technique with `playwright-core`/chromium).
3. Add `test:e2e` script to `packages/chamber-ui`; wire into turbo alongside `@opencode-ai/app#test`.

**Verify:** `bun run --cwd packages/chamber-ui test:e2e -- e2e/smoke/boot.spec.ts` (narrowest first, then full smoke).

**Rollback:** additive; delete specs.

### Phase 8 — Shell integration I: UI selector + launch routing + native gesture (UIs 2 & 3; default stays Classic) — **NEW (absorbs old P8 build mechanics)**

**Goal:** Both mobile apps ship **one combined asset bundle** containing `selector.html` + the Classic bundle + the chamber bundle; a native launch router picks the remembered UI (initial default **Classic**); the four-finger-swipe-up gesture (plus alternate) navigates to the selector from either local UI. UI 1 is present but **disabled** (hidden on the selector) until P9.

**Estimate:** L (4–7 days — two native gesture implementations, combined build wiring, selector page).

**Files:**
- New `packages/shared/selector/selector.html` (or per-shell copies of one source file — decide at implementation; single source, no framework, inline CSS/JS) — three cards (Anemos Chamber / Classic / Chamber Full-disabled), per-UI server labels, "remembered" highlight, calls `selectUI(id)` bridge command.
- `packages/ios/vite.config.ts` + `packages/android/vite.config.ts` — combined inputs: `selector.html`, `classic.html` (renamed current entry html), `chamber.html` (from `packages/chamber-ui`), **distinct `assetsDir`s** (`assets/classic/`, `assets/chamber/`, `assets/selector/`), `base: "./"`; outDirs unchanged (`WebAssets/` / `dist/`).
- `packages/chamber-ui` — export/build target for the `chamber.html` entry (mobile entry already exists; add a root-level html output path).
- iOS Swift: `packages/ios/OpenCode/**` — launch router (read remembered selection from UserDefaults → load `tauri://localhost/{classic|chamber|selector}.html`), `UIGestureRecognizer`s (4-finger swipe-up + 4-finger double-tap with deliberate thresholds) → navigate to `selector.html`, tiny `selectUI`/`getSelectedUI` message handlers on the existing bridge (origin-checked — §3.19 pattern established here, extended in P9).
- Android: `packages/android/src-tauri/mobile-bridge/**` (Kotlin + Rust) — touch interception (pointer count ≥ 4, up-gesture math with velocity/distance gates) on the WebView, same launch routing (SharedPreferences), same two bridge commands (follow the existing permission'd-command pattern — permissions TOMLs regenerate).
- **No changes to `packages/app` source** (the Classic build is re-emitted from the existing entry with a renamed html + assetsDir — shell-level only; call this out in the commit message).

**Steps:**
1. **Combined build:** rework both shells' vite configs to the three-entry layout; verify the Solid app and chamber bundle both boot from `tauri://localhost/classic.html` / `chamber.html` (relative asset URLs; iOS scheme handler path resolution — Phase 0 spike 3 said `base: "./"` is required and sufficient) and `http://tauri.localhost/…` on Android.
2. **Selector page:** implement `selector.html` (server labels read via bridge: opencode default server for 2/3; UI 1 slot disabled/hidden), `selectUI` persists natively and navigates.
3. **Launch router (both shells):** remembered selection → target html; no memory → `selector.html`; a `--reset-ui`/long-press dev escape to force the selector.
4. **Gesture (both shells):** implement per D8.3; from Classic and chamber bundles, gesture → `selector.html`. Threshold tuning on device simulators early.
5. **Deep-link routing rule:** `opencode://` deep links open the **remembered UI if it is 2 or 3, else UI 3** (never UI 1 — remote page can't consume them; OQ 7 confirms).
6. **Notification-tap routing:** tapping a fork push notification routes to a UI-2/3 target (same rule as deep links; OQ 7).
7. Measure the combined bundle size (iOS WebAssets are git-committed — record growth; P11 flags the gitignore question again).

**Constraints:** **the voice-removal work MUST be landed before this phase starts** (shared files: `entry-*.tsx` neighbors, `bridge.ts`, `mobile-bridge` Kotlin/Rust, `WebAssets` deletions). Default behavior with no remembered selection = Classic, so a shipped build with the selector feature-flagged off behaves exactly like today (escape hatch: a shell-level `ANEMOS_SELECTOR=0` build flag that routes launch straight to `classic.html` and disables the recognizers).

**Verify:** `bun run typecheck`; `bun run --cwd packages/ios build` and `bun run --cwd packages/android build` produce combined bundles; packaged-build smoke (simulator/sideload): launch→selector→Classic→gesture→selector→chamber→gesture→selector; remembered selection honored across relaunch; `bun run --cwd packages/app test` (classic suite) still green — proof of zero UI 2 regression.

**Rollback:** `ANEMOS_SELECTOR=0` build (or revert the phase commit) restores today's single-frontend builds byte-for-byte.

### Phase 9 — Shell integration II: UI 1 "Chamber Full" remote surface + per-UI server config — **NEW**

**Goal:** Enable the third interface: the selector's UI 1 card navigates the WebView to the user's configured OpenChamber server URL; chamber's own auth/features apply; our native bridge is provably inaccessible to that remote origin.

**Estimate:** M (2–4 days).

**Files:** `selector.html` (enable UI 1 card + URL edit field + reachability hint), iOS Swift (remote navigation handling + ATS config + origin-gate audit of every bridge/WKScriptMessageHandler), Android Kotlin/Rust (`mobile-bridge`: remote URL load + Tauri IPC capability audit — no remote-domain IPC granted), `packages/ios/OpenCode/Info.plist` (ATS exception policy for LAN-http chamber URLs, if the user's server is http on LAN — OQ 8).

**Steps:**
1. UI 1 URL config: stored natively (alongside the selection), editable on the selector card; validate scheme (`https://` preferred; `http://<lan>` triggers the ATS decision) and reachability (native HEAD/GET probe with short timeout → card shows ok/unreachable).
2. Navigate the single WebView to the URL (D8.2); verify chamber's SPA boots, its `SessionAuthGate` (UI password) works in-webview, cookies persist per-origin across switches, and its service worker doesn't break our navigation lifecycle (§3.22 — if `sw.js` causes trouble, scope-block it in the webview settings).
3. **Security pen-test (D8.5, §3.19):** from a page served by the chamber server (its own UI, or a trivial page), attempt every native capability — bridge invokes, `selectUI`, notification/push/storage/share calls — **all must fail**. Fix any leak before enabling UI 1 in any shipped build. Also verify the gesture still fires over remote content and doesn't fight chamber's own touch handling (swipe-back, sheets).
4. Resume behavior for UI 1: `opencode:resume` is a no-op for remote content (chamber handles its own reconnect); verify backgrounding/foregrounding mid-stream.
5. Selector copy: label servers per UI (§3.23) — "Chamber Full → <chamber URL>", "Classic / Anemos Chamber → <opencode server>".

**Constraints:** no anemos code runs inside UI 1 (no user scripts injected into remote origin beyond what iOS/Android inject for ALL pages — and those must be origin-gated); gesture recognizers are attached at the native view level, not page level.

**Verify:** device/simulator: connect to the user's real chamber server; full-chat smoke inside UI 1; gesture returns to selector; pen-test checklist signed off; typecheck + both shell builds green; UI 2/3 smoke unchanged.

**Rollback:** selector hides the UI 1 card (config flag) — ships inert.

### Phase 10 — Device verification & burn-in across all three UIs — **NEW (absorbs old P8 device checklist)**

**Goal:** Signed-off device verification matrix on iOS (TestFlight via `beam`, sideload via `scripts/deploy-ipa.mjs`) and Android (`ANDROID_BUILD.md` toolchain) for all three UIs + the selector.

**Estimate:** M (2–3 days + burn-in calendar time).

**Checklist (matrix: {iOS, Android} × {selector, UI 1, UI 2, UI 3}):**
- **Selector/launch:** remembered selection across relaunch and OS restart; gesture from every UI (incl. remote UI 1) with thresholds that don't false-trigger during typing/scrolling; alternate gesture works; deep links route per the P8 rule.
- **UI 1:** auth/session persistence; SSE streams + reconnect on background/foreground; gesture over chamber's own touch handling; unreachable-server path (native error → return to selector); https + LAN-http ATS behavior.
- **UI 2 (regression proof):** behaves exactly as today — existing e2e suite green, spot device pass, **zero diffs in `packages/app`** (verify `git diff --stat packages/app` is empty).
- **UI 3:** boot + Basic auth + SSE live updates; markdown worker loads (custom scheme/CSP — §3.4); deep-link cold start; haptics/share; i18n spot-check (incl. RTL via `?lang=ar` if shipped — else note deferred).
- **Cross-cutting:** memory profile switching between the three UIs repeatedly (no leak growth — one runtime at a time, D8.2); bundle size recorded; `bun run typecheck` + both shell builds green on the final commit.

**Verify:** checklist fully signed; failures fixed with marked patches and re-verified.

**Rollback:** per-UI: selector cards are individually hideable; whole phase: `ANEMOS_SELECTOR=0`.

### Phase 11 — Attribution, sync docs, housekeeping (SOFTENED — no deletions) — replaces old P10

**Goal:** Documentation and hygiene for the three-UI end state. **`packages/app`, `packages/session-ui`, `packages/ui` are NOT deleted** — UI 2 is permanent.

**Estimate:** S (≤1 day).

**Files:** `packages/chamber-ui/PROVENANCE.md` (final local-change ledger; note that UI 1 uses no upstream code — only a URL), `docs/chamber-sync-checklist.md` (regenerate against a fresh upstream tag; run `script/chamber-sync.sh`), root `AGENTS.md` (document the three-UI architecture, selector gesture, per-UI server semantics, and which UI future feature work targets — D8.24), delete stray `chamber-mobile-*.yml` snapshots, decide the WebAssets-gitignore question (flagged, not assumed — OQ 9), dead-code sweep limited to genuinely unused artifacts the new architecture orphaned (e.g. any Rev-1-era `FRONTEND=chamber` build scripts superseded by the combined bundle).

**Verify:** `bun run typecheck`; docs reviewed; `git status` clean of strays.

**Rollback:** docs-only; revert.

---

## 6. Testing Strategy (summary, Rev 2)

- **Unit (per phase):** push pairing machine (P5), i18n parity over the shipped 12 (P6) — direct `bun test` invocations from within `packages/chamber-ui`.
- **Integration/e2e (P7):** Playwright smoke for UI 3 against a real `opencode serve` backend using the fork's fixture conventions. UI 1 is external content — covered by the P9/P10 manual device matrix, not by our e2e (OQ 10 notes an optional uptime probe). UI 2 keeps its existing suites untouched.
- **Device (P10):** the three-UI × two-platform matrix (selector, gesture, per-UI server routing, security pen-test, memory profile) via `beam`, `ANDROID_BUILD.md`, sideload.
- **Always:** `bun run typecheck` before push (husky-enforced); browser dev loop before device, per AGENTS.md; `git diff --stat packages/app` must stay empty from P8 onward (UI 2 zero-change invariant).

## 7. Risks & Mitigations (Rev 2)

- **Risk:** Chamber's UI silently requires an Express route we missed on a core path. **Mitigation:** P4 registry + audit (done); P7 e2e runs without any chamber server; residual features reachable via UI 1.
- **Risk:** CORS/origin breakage on device. **Resolved by Phase 0 spike 2** (allow-list mapped; scheme-preservation rule in P10 checklist).
- **Risk:** Worker/CSP failures in WKWebView/Android WebView. **Mitigation:** worker bundling proven in builds; on-device check is a P10 matrix line; fallback is the synchronous markdown renderer path.
- **Risk:** Upstream drift makes syncs painful. **Mitigation:** PROVENANCE + sync script + ANEMOS-PATCH markers; pressure lowered by D8 (full features come from the user's own server in UI 1).
- **Risk:** v1-only servers strand users. **Dissolved by D8** — UI 2 (Classic) is permanent and speaks v1 today; UI 3's guard screen will point users at Classic (P6 copy).
- **Risk (NEW):** **Three-surface maintenance burden** — selector glue × two native shells, plus two anemos frontends. **Mitigation:** UI 2 frozen at zero changes (enforced by the P8+ `git diff --stat packages/app` invariant); shell glue confined to small additive native modules; every feature decision states its target UI.
- **Risk (NEW):** **WebView memory with remote UI 1** (desktop-class SPA). **Mitigation:** single-WebView navigation model (D8.2) — exactly one runtime alive; P10 memory profile line; never overlay WebViews.
- **Risk (NEW):** **Gesture conflicts** — iPad system 4-finger multitasking wins; OEM touch quirks; chamber's own touch handling inside UI 1. **Mitigation:** alternate 4-finger double-tap recognizer; deliberate thresholds; relaunch always reaches the selector; early on-device threshold tuning (P8 step 4); P9 gesture-over-remote check.
- **Risk (NEW):** **Native bridge exposure to remote content** (security). **Mitigation:** origin-gating at the bridge boundary on both shells (P8 establishes the pattern, P9 extends + pen-tests); no remote-domain Tauri IPC.
- **Risk (NEW):** **Selector UX confusion** — accidental triggers, wrong-server expectations, draft loss on switch. **Mitigation:** thresholds; per-UI server labels + reachability hints on the selector (§3.23); switch-cost note in selector copy.
- **Risk:** Interleaving with the uncommitted voice work. **Mitigation:** Phases 0–4 never touched it; **P8 hard-requires it landed**; flagged in §3.1 and P8 constraints.

## 8. Success Criteria (Rev 2)

- [x] Chamber mobile surface renders in browser against `:42447` and `:4096` over SSE (P1–2, executed)
- [x] v1-only/unreachable backend produces a clear error screen (P2, executed — copy updated to point at Classic in P6)
- [x] Zero chamber-Express requests from UI 3's core path (P4 audit, executed)
- [ ] UI 3 push pairing parity (P5) and 12-locale parity gate + anemos theme (P6)
- [ ] UI 3 e2e smoke green (P7)
- [ ] Combined bundle ships selector + Classic + chamber; default (no memory) = Classic; builds green throughout (P8)
- [ ] Gesture returns to the selector from **all three** UIs on **both** platforms, including remote UI 1 content (P8–10)
- [ ] UI 1 connects to the user's chamber server with its own auth; full feature surface usable (P9)
- [ ] Bridge pen-test: remote origin cannot invoke any native capability (P9)
- [ ] `git diff --stat packages/app` empty from P8 onward — UI 2 provably unchanged (P8–11)
- [ ] Three-UI device matrix signed off on iOS + Android; memory profile clean (P10)
- [ ] Attribution/sync docs current; housekeeping done; **no packages deleted** (P11)

## 9. Open Questions (Rev 2)

1. ~~v1-only backends~~ — **resolved by D8**: UI 2 (Classic) is the permanent v1 surface. (Only revisit if you ever want UI 3 itself to speak v1.)
2. **Locale scope (confirm recommendation):** UI 3 ships chamber's stock 12; `ar, ru, th, no, da, bs` deferred and added on demand (D8.6). Which of the 6, if any, have real users today and should jump the queue?
3. **Git/diff review, terminal, fs browsing:** now available via UI 1 against your chamber server — confirm no UI 3 port is wanted in the near term.
4. **Gesture confirmation:** four-finger swipe-up despite the iPad system-multitasking overlap (iPhone unaffected), with 4-finger double-tap as the alternate — acceptable, or prefer a different primary?
5. **UI 1 server config:** single chamber server URL for v1 of the selector (planned), or multiple chamber instances from day one? And is your chamber server `https://` or LAN `http://` (drives the iOS ATS exception decision, OQ §3.22)?
6. **Notification-tap routing when the remembered UI is 1:** planned rule is "fork push taps open the remembered UI if it is 2/3, else UI 3" (never UI 1) — confirm.
7. **`opencode://` deep links when remembered UI is 1:** same rule as 6 (route to UI 3) — confirm.
8. **Selector localization:** ship English-only at first (planned) or inherit the device language from chamber's locale files?
9. **WebAssets in git (decision recorded in P11):** the combined bundle (three entries) grows the committed iOS tree. **Recommendation: leave the assets committed for now** because the sideload flow depends on the packaged WebAssets being in-tree; revisit only with an equivalent artifact-delivery flow. The existing gitignore policy is unchanged.
10. **UI 1 health monitoring (optional):** add a lightweight uptime/reachability probe of the chamber server to the selector card (planned: on-demand check when the card is visible) — enough, or want background monitoring?

### Phase 5 results

- Added the UI 3 fork-relay pairing machine and React shell under `packages/chamber-ui/src/anemos/push/`, including permission, host-plugin activation, relay polling, repair/clear, and Bun tests.
- Added native adapter push method shapes and bridge forwarding, relay URL and PushPrefs persistence, and notification trigger mapping for completion, approval, question, and error events.
- Added the registry-gated Anemos Notifications settings section with relay URL, permission, pairing, preferences, diagnostics state, and test push controls.
- Build and test commands were not run by the implementation agent per the repository agent boundary; build-fixer owns execution verification.

### Phase 7 results

- Added the UI 3 Playwright smoke harness under `packages/chamber-ui/e2e/`, with a scratch `opencode serve` on `:4096`, the chamber dev server on `:4456`, iPhone-sized Chromium emulation, and fixture-managed SDK session cleanup.
- Added smoke coverage for boot/session listing, chat submission and streamed timeline rendering (with an explicit modelless-server branch), Anemos Notifications settings, and the unreachable-backend boot guard.
- Added the chamber e2e scripts, `@playwright/test` workspace dependency, and the `@openchamber/ui#test:e2e` Turbo task.
- Browser execution and post-run port teardown verification remain deferred to the build-fixer pass per the implementation-agent boundary.

### Phase 8 results

- Added the single-source, framework-free selector at `packages/shared/selector/selector.html`; both shell Vite configs consume it directly and emit the selector build-time configuration.
- Renamed the shell Classic entry to `classic.html` and added the three-entry combined layout. The Chamber package now emits a root-level `dist/chamber.html`; shell builds copy its assets under `assets/chamber/`, keep Classic assets under `assets/classic/`, and materialize `assets/selector/`.
- Added native remembered-UI routing, selector bridge commands, local-origin checks, deep-link/notification-intent routing, and development reset escapes on iOS and Android. The iOS gestures are attached to the `WKWebView`; Android observes the `WebView` touch stream with four-pointer distance/velocity gates.
- `ANEMOS_SELECTOR=0` is carried into the bundle as `selector-config.json`; native launch routing falls back directly to `classic.html` and does not install the selector recognizers.
- Build, typecheck, unit-test, device, and bundle-size verification remain deferred to build-fixer/device phases per the implementation-agent boundary.

### Phase 9 results

- Enabled the selector's `Chamber Full` card with a persisted native URL, HTTPS/private-LAN-HTTP validation, an explicit unencrypted-LAN hint, and a short native HEAD/GET reachability probe. `Classic` and `Anemos Chamber` now both identify their shared OpenCode server; Chamber Full identifies its configured URL.
- UI 1 selection now persists as `1` and navigates the one existing WebView directly to that URL on both shells. Missing or invalid configuration returns to the selector. `opencode://` deep links and notification/deep-link intents still target only Classic or Anemos Chamber, never the remote surface. Resume events and deep-link JavaScript injection are local-bundle-only, so remote Chamber content receives no Anemos injection.
- ATS choice: `NSAllowsLocalNetworking` remains enabled for the LAN-HTTP case. The pre-existing `NSAllowsArbitraryLoads` and `NSAllowsArbitraryLoadsInWebContent` fallback remains unchanged because a user-supplied host cannot be represented by a static `NSExceptionDomains` list and UI 2 already supports arbitrary HTTP/Tailscale servers; UI 1 itself accepts HTTP only for RFC1918/loopback/link-local IPv4 and prefers HTTPS. Android retains the generated `usesCleartextTraffic=true` needed for dynamic LAN IPs; the same native URL validation prevents UI 1 from selecting arbitrary cleartext hosts, since Network Security Config cannot express a user-supplied private-IP CIDR.
- Cookie/service-worker decision: no data-store reset or service-worker disable was added. WKWebView and Android WebView isolate cookies and service-worker registrations by origin; `tauri://localhost` and `http://tauri.localhost` cannot be intercepted by a remote Chamber origin. Remote service workers remain available to Chamber for its own PWA lifecycle.

#### D8.5 / §3.19 pen-test checklist

The scratch page at `packages/shared/selector/remote-bridge-pen-test.html` enumerates the native calls and is intended to be served from a non-local origin. `remote-bridge-pen-test.mjs` headlessly checks the exact local-origin allowlist and the source/capability gates without requiring a real WebView.

| Surface | Gate | Verdict |
| --- | --- | --- |
| iOS `WKScriptMessageHandler` (`opencode`) | Exact `tauri://localhost` or `http://tauri.localhost` frame security origin | **GATED** |
| iOS platform bridge: opener, notify, haptic, share, server config, UI selection, storage | Reached only after the handler origin gate | **GATED** |
| iOS `evaluateJavaScript` responses/events | `isLocalPage(webView.url)` before every bridge callback | **GATED** |
| iOS deep-link JavaScript injection | `isLocalPage(webView.url)`; remote pages are never injected | **GATED** |
| iOS packaged asset scheme handler | Rejects non-local `Origin`, removes wildcard CORS, and confines paths to `WebAssets` | **GATED** |
| iOS gestures, keyboard toolbar, and native event callbacks | View-level recognizers remain active remotely; callbacks use the local-only evaluator gate | **GATED** |
| Android mobile-bridge commands: scan, share, selection/config, probe | `rejectRemote` requires `http://tauri.localhost` | **GATED** |
| Android inherited mobile-bridge listener/permission commands | Overrides apply `rejectRemote` before the base implementation | **GATED** |
| Android Tauri IPC and haptics/notification/opener/store/deep-link plugins | `default` capability is local-only; no `remote.urls` capability or dangerous remote IPC grant exists | **GATED** |
| Android `evaluateJavascript` deep-link injection | `isLocalOrigin()` before evaluation | **GATED** |
| Android deep-link/notification intent routing | `1` is normalized to the Chamber UI 3 target; only `2`/`3` receive local injection | **GATED** |

Static origin-policy and source-gate checks are signed off by the harness; real remote-page and gesture/device verification remains in Phase 10.

### Phase 11 results

- Finalized `packages/chamber-ui/PROVENANCE.md` with the upstream pin, the UI 1 no-upstream-code boundary, the D8.6 12-locale rescope, the P5 push-verification deferral to the packaged sideload/device pass, and a counted source-marker ledger: 148 source markers across 93 files (149 summed matches when the ledger's one literal count reference is included).
- Regenerated `docs/chamber-sync-checklist.md` as the fresh-tag sync runbook. `script/chamber-sync.sh` now validates the pinned commit and requires the provenance ledger before recopying, then points the operator to the re-apply and gate steps.
- Added the three-UI architecture guidance to root `AGENTS.md`: selector/gesture behavior, per-UI server semantics, the `ANEMOS_SELECTOR=0` escape hatch, and the UI 2 zero-diff invariant.
- Deleted the two stray root Playwright snapshots `chamber-mobile-initial.yml` and `chamber-mobile-noenv.yml`. No packages were deleted and no gitignore rule was changed; OQ 9 now recommends keeping WebAssets committed for sideload delivery.
- Dead-code sweep found no Rev-1 `FRONTEND=chamber` build script or other superseded sync skeleton to remove. The current sync script is functional and was retained with only ledger/gate guidance updates.
- Build and typecheck execution remains assigned to the build-fixer/device verification pass; this documentation phase was verified by inspection.

### Phase 10 results (headless portion)

- UI 2 zero-change invariant: `git diff --stat origin/main...HEAD -- packages/app` reports the six-file, `3 insertions(+), 171 deletions(-)` voice-removal diff from the sanctioned pre-P8 commit `75a621323` (`feat: remove whisper voice input from ios/android shells`). `git log origin/main..HEAD -- packages/app` identifies no other commit. The post-P8 worktree check, `git diff --stat -- packages/app`, is empty. The shell-phase boundary check, `git diff --stat f34d14c2f^..HEAD -- packages/app`, is also empty; `f34d14c2f` is the Phase 8 shell landing and `HEAD` is `c78dd7ed4`.
- Build readiness: the SDK package has a `build` script, and the chamber and shell packages expose the requested build scripts. The latest supplied gates are green for the combined iOS and Android shell builds; current artifact sizes are `packages/ios/WebAssets` 71M, `packages/android/dist` 71M, and `packages/chamber-ui/dist` 38M. The implementation-agent boundary does not permit executing builds; build execution remains assigned to build-fixer.
- No untracked `chamber-mobile-*.yml` strays are present.
- The physical iOS/Android × selector/UI 1/UI 2/UI 3 matrix is handed to the user in [`docs/plans/device-verification-checklist.md`](device-verification-checklist.md), including TestFlight, sideload, Android toolchain, and `ANEMOS_SELECTOR=0` control-build commands. Headless gates recorded as DONE there are e2e 4/4, the pen-test harness, parity, and the supplied shell-build results.

### Review remediation (2026-09-02)

- **Track A — push disposition and reviewer small fixes:** keep the P5 push
  implementation intact but disable its registry visibility for the sideload era;
  gate the upstream web-push settings behind `push-web`; add the locale marker
  headers and sync-runbook exception; wire the chamber package test script and
  Turbo task; update the settings smoke expectation; and document the deferred
  proper-distribution push verification.
- **Track B — adapter attachment and migration/credentials:** MAJOR-1 adapter
  attachment and MAJOR-2 migration/credentials are being implemented in parallel
  by Agent B across the Anemos adapters, mobile entry, and native bridges.
- **Track C — URL policy and permissions:** MAJOR-3 URL policy and MINOR-3
  permissions TOMLs are being implemented in parallel by Agent C across the
  native server configuration, selector, Android bridge, and permission files.

## Rev 3 — UI 3 on hold

The user directive for Rev 3 is to ship only **UI 1 — Chamber Full** (the
configured remote Chamber server) and **UI 2 — Classic** (direct opencode),
with the selector. UI 3 — Anemos Chamber is on hold, not deleted: its vendored
source, package scripts, tests, and documentation remain parked in
`packages/chamber-ui` for cheap revival.

### Removed from the shipped shells

- The Anemos Chamber selector card and UI 3 server label were removed from
  `packages/shared/selector/selector.html`.
- iOS and Android no longer accept or route the remembered `chamber` selection;
  an existing value falls back to the selector, while deep-link and push-tap
  handling falls back to Classic and never opens UI 1.
- The shell Vite inputs and build scripts no longer build or copy `chamber.html`
  or `assets/chamber/`; the generated shell assets contain only the selector,
  Classic, and the remote Chamber Full route.

### Parked for revival

`packages/chamber-ui` keeps its own `dev`, `build`, `typecheck`, `test`, and
`test:e2e` scripts and remains covered by Turbo typecheck. Its independent
package build and source tests are not part of the shipped shell build chain.

### Exact revival checklist

1. Restore the Anemos Chamber card and its `data-ui="3"` selection behavior in
   `packages/shared/selector/selector.html`, including the UI 3 server label.
2. Restore the UI 3 routing target in `packages/ios/OpenCode/Config/UISelection.swift`,
   `packages/ios/OpenCode/WebView/BridgeController.swift`, and
   `packages/android/src-tauri/mobile-bridge/android/src/main/java/MobileBridgePlugin.kt`;
   reinstate the remembered-selection and deep-link rules for the local Chamber
   page.
3. Restore the shell build-chain copy step and scripts in
   `packages/ios/package.json`, `packages/android/package.json`,
   `packages/ios/scripts/copy-chamber.mjs`, and
   `packages/android/scripts/copy-chamber.mjs`; restore the shell-to-`@openchamber/ui`
   build dependency in `turbo.json`.
4. Build `packages/chamber-ui`, then rebuild both shells so
   `chamber.html` and `assets/chamber/` return to `packages/ios/WebAssets/` and
   `packages/android/dist/`; verify both local Chamber routes and their assets.
5. Re-run the parked package's source tests and the shell/browser/device gates
   before treating UI 3 as shipped again.
