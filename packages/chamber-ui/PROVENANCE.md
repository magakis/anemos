# OpenChamber UI Provenance

## Upstream source

- Repository: https://github.com/openchamber/openchamber
- Vendored commit: `2c8ae9adc116376da1e6bb7ac09d8807f1f3b120` (`v1.22.0-3`)
- OpenChamber version: `1.22.0`
- Reference clone: `/tmp/opencode/openchamber`
- Upstream runtime requirement: Node.js `>=22`
- Vendored on: 2026-09-01

## Scope

This package contains the upstream `packages/ui/src` tree, including its i18n
messages and theme JSON files, plus the browser mobile entry pieces from
`packages/web`: `mobile.html`, `src/mobile-main.tsx`, `src/runtimeConfig.ts`,
and the web API adapters required by that entry. The upstream MIT `LICENSE` is
included verbatim. No OpenChamber server or desktop entry is vendored.

UI 1 (Chamber Full) is not a vendored implementation. It is a native WebView
navigation to the user's configured Chamber server URL; no upstream code from
this package runs in that surface. UI 3 is the vendored direct-connect surface
documented below, while UI 2 remains the separate Classic application.

## Local changes ledger

| Phase | Local divergence | Scope |
|---|---|---|
| P1 | Standalone mobile entry and package-local build wiring; browser-only shims keep server dependencies out of the mobile graph. | `mobile/`, `tsconfig.json`, `vite.config.ts`, `src/shims/` |
| P2 | Direct OpenCode URL resolution, Basic authorization, v2 runtime route handling, and reconnect behavior. | `mobile/`, `src/lib/opencode/`, `src/lib/runtime-*`, `src/sync/`, `src/stores/` |
| P3 | Anemos shell-neutral platform, storage, deep-link, native detection, and lifecycle adapters. | `src/anemos/`, `src/apps/`, `src/lib/platform.ts`, `src/lib/runtimeSurface.ts` |
| P4 | Registry-gated feature cuts, unavailable deep-link stubs, direct SDK data paths, and removal of Chamber-only routes from UI 3. | `src/features/`, `src/apps/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/stores/` |
| P5 | UI 3 fork-relay push pairing, preferences, event mapping, native adapter methods, and settings surface. | `src/anemos/push/`, `src/anemos/platform-adapter.ts`, `src/anemos/runtime-apis.ts`, `src/components/sections/openchamber/`, `src/hooks/` |
| P6 | Anemos light/dark themes, shipped-12 locale hardening, and translated deep-link guidance. | `src/lib/theme/`, `src/lib/i18n/` |
| P8 | Combined-bundle mobile HTML output and the package-local `chamber.html` entry. | `vite.config.ts`, `mobile/index.html` |
| P9 | No UI 1 code was added here; UI 1 is only the configured remote URL described above. | Native selector and shell code outside this package |
| P11 | This attribution ledger and sync documentation; no upstream package or application package is deleted. | This file and `docs/chamber-sync-checklist.md` |

### D8.6 and push-verification amendments

UI 3 ships OpenChamber's stock 12 locales. The six net-new locales `ar`, `ru`,
`th`, `no`, `da`, and `bs` are deferred to a demand-driven backlog, as decided
by D8.6; they are not a UI 3 parity gate because UI 2 permanently retains all
18 existing locales.

The P5 push pairing and relay implementation is covered by local unit tests.
End-to-end notification delivery and native push verification are deferred until
proper distribution (TestFlight/App Store with APNs); SideStore/sideloaded builds
cannot receive remote push. This is a verification and visibility deferral, not
a removal of the UI 3 push surface.

### Review remediation ledger (2026-09-02)

- The `push` registry entry is disabled for the sideload era because remote push
  requires proper APNs distribution; the P5 implementation remains retained for
  the future TestFlight/App Store build.
- Each shipped locale dictionary carries the standardized `+2 unavailable-feature
  keys (see PROVENANCE)` header marker, with the reviewed exception recorded in
  `docs/chamber-sync-checklist.md`.
- `OpenChamberPage` gates the upstream web-push `NotificationSettings` component
  through `push-web`, alongside the existing registry gate for the Anemos push
  settings, so the cut mobile settings surface exposes no push controls.

## Counted source patch inventory

On 2026-09-02, the tracked vendor-source marker inventory contains **160 source
marker occurrences in 105 files**; the one literal reference in this sentence
makes **161** matches when the ledger itself is included. The table below is the
complete source ledger; counts are grouped by area and multiple sites in one
file are listed in the reason column.

| Area | Files | Source markers |
|---|---:|---:|
| `mobile/` | 3 | 5 |
| package root | 2 | 6 |
| `src/anemos/` | 17 | 25 |
| `src/apps/` | 11 | 25 |
| `src/components/` | 23 | 40 |
| `src/contexts/` | 1 | 1 |
| `src/features/` | 2 | 2 |
| `src/hooks/` | 2 | 2 |
| `src/lib/` | 36 | 45 |
| `src/shims/` | 1 | 1 |
| `src/stores/` | 5 | 6 |
| `src/sync/` | 2 | 2 |
| **Total** | **105** | **160** |

### `mobile/` — 5 sites in 3 files

| File | Sites | One-line reason for each site |
|---|---:|---|
| `mobile/index.html` | 1 | Keep the standalone package's mobile entry beside this HTML file. |
| `mobile/mobile-main.tsx` | 2 | Resolve the direct OpenCode target before Chamber bootstrap; route browser development to the configured OpenCode backend. |
| `mobile/runtimeConfig.ts` | 2 | Use stored base64 `user:pass` credentials as Basic auth; skip Chamber's cookie/URL-token endpoint for direct OpenCode servers. |

### Package root — 6 sites in 2 files

| File | Sites | One-line reason for each site |
|---|---:|---|
| `tsconfig.json` | 2 | Include Vite `import.meta.env` types and typecheck the standalone mobile entry with the vendored UI. |
| `vite.config.ts` | 4 | Emit a root-level combined-bundle entry; order the output plugin after Vite; resolve package/source aliases; keep server-only dependencies out of the browser graph. |

### `src/anemos/` — 25 sites in 17 files

| File | Sites | One-line reason for each site |
|---|---:|---|
| `src/anemos/deep-links.test.ts` | 1 | Cover native scheme remapping and typed deep-link parsing. |
| `src/anemos/deep-links.ts` | 1 | Replace OpenChamber's registered URL scheme while accepting legacy links. |
| `src/anemos/platform-adapter.ts` | 5 | Define the shell-neutral platform contract; keep fork relay methods local to UI 3; make relay methods optional and browser-safe; keep the relay native-only; forward native push methods through the shared adapter. |
| `src/anemos/push/AnemosPushSettings.tsx` | 1 | Expose fork-relay permission, pairing, preferences, and test delivery in UI 3. |
| `src/anemos/push/index.ts` | 1 | Provide the public UI 3 push surface. |
| `src/anemos/push/push-pair.test.ts` | 3 | Cover the pairing machine with Bun; use Bun-supported rejection and undefined matchers. |
| `src/anemos/push/push-pair.ts` | 1 | Port the framework-neutral fork-relay pairing state machine for UI 3. |
| `src/anemos/push/push-plugin.ts` | 1 | Keep host-side fork-relay command generation local to UI 3. |
| `src/anemos/push/push-preferences.ts` | 1 | Share relay notification preferences between settings and runtime triggers. |
| `src/anemos/push/push-relay.ts` | 1 | Persist the fork-relay URL without coupling React UI to Solid persistence. |
| `src/anemos/push/push-test.ts` | 1 | Keep test-push dispatch independent from the settings component. |
| `src/anemos/push/push-triggers.test.ts` | 1 | Verify Chamber event kinds map to fork-relay preference keys. |
| `src/anemos/push/push-triggers.ts` | 1 | Normalize Chamber notification events to the fork PushPrefs contract. |
| `src/anemos/push/use-push-pair.ts` | 1 | Provide the React shell for the fork-relay pairing state machine. |
| `src/anemos/runtime-apis.ts` | 1 | Map Chamber injectable RuntimeAPIs onto the Anemos shell platform contract. |
| `src/anemos/storage.test.ts` | 3 | Cover one-way idempotent migration and assert migrated fields with Bun-supported matchers. |
| `src/anemos/storage.ts` | 1 | Provide one storage contract for browser, WKWebView, and Tauri persistence. |

### `src/apps/` — 25 sites in 11 files

| File | Sites | One-line reason for each site |
|---|---:|---|
| `src/apps/deepLinkNavigation.ts` | 2 | Normalize legacy native events and consume deep-link events from Swift and Tauri shells. |
| `src/apps/deepLinks.ts` | 1 | Accept older OpenChamber links while routing new navigation through `opencode://`. |
| `src/apps/MobileApp.tsx` | 8 | Start on SDK-backed MCP; use `opencode://`; route mobile URLs through stubs; expose supported settings; avoid Chamber auth probing on direct runtimes; route completion notifications through the adapter; use the native scheme; cut update routes from the mobile shell. |
| `src/apps/mobileConnections.ts` | 3 | Use injected storage for instance metadata; persist instances through shell storage; hydrate synchronous connection state before auto-connect. |
| `src/apps/MobileConnectionWelcome.tsx` | 3 | Accept legacy/current schemes; replace Chamber pairing with direct URL/token or password; render direct-entry UI instead of QR pairing. |
| `src/apps/MobileInstancesSurface.tsx` | 1 | Replace Chamber QR pairing with direct URL/token entry. |
| `src/apps/mobileNativeChrome.ts` | 1 | Share centralized native-shell detection with Tauri and Swift WebViews. |
| `src/apps/mobileQrScan.ts` | 2 | Accept old and current pairing links; normalize the scheme before the old WebView parser. |
| `src/apps/MobileSessionsSheet.tsx` | 2 | Cut filesystem/git project discovery; hide project-folder browsing from mobile navigation. |
| `src/apps/MobileWorkspaceDrawer.tsx` | 1 | Hide cut tabs while retaining a deep-link stub tab. |
| `src/apps/renderMobileApp.tsx` | 1 | Use the injected Anemos platform instead of Chamber's Capacitor no-op in native shells. |

### `src/components/` — 40 sites in 23 files

| File | Sites | One-line reason for each site |
|---|---:|---|
| `src/components/chat/ChatContainer.tsx` | 1 | Remove the Chamber session-recap route from the core timeline. |
| `src/components/chat/ChatInput.tsx` | 5 | Avoid Chamber Git probes; cut filesystem-backed file mentions; close the mention loop after gating filesystem work; cut project/worktree pickers; pass draft state for composer action gating. |
| `src/components/chat/CommandAutocomplete.tsx` | 1 | Hide cached skills while Chamber config routes are cut. |
| `src/components/chat/composer/ui/ComposerAttachmentControls.tsx` | 1 | Apply GitHub/Linear cuts to integration attachment actions. |
| `src/components/chat/composer/ui/ComposerFooter.tsx` | 3 | Remove Chamber dictation controls and preserve draft-open state in both composer layouts. |
| `src/components/chat/composer/ui/MobilePillComposer.tsx` | 1 | Keep the mobile pill free of a Chamber dictation trigger. |
| `src/components/chat/FileMentionAutocomplete.tsx` | 1 | Keep file-mention search inside the cut filesystem surface. |
| `src/components/chat/message/MessageBody.tsx` | 1 | Route native image sharing through the shell adapter. |
| `src/components/chat/message/ToolOutputDialog.tsx` | 1 | Keep local-file Mermaid sources behind the cut filesystem route. |
| `src/components/chat/SkillAutocomplete.tsx` | 1 | Prevent cached skills from exposing a cut Chamber config surface. |
| `src/components/chat/SnippetAutocomplete.tsx` | 1 | Keep snippets unavailable as a cut Chamber config surface. |
| `src/components/layout/ContextPanel.tsx` | 1 | Render persisted cut tabs as stubs before any Chamber surface mounts. |
| `src/components/layout/ContextPanelRail.tsx` | 1 | Do not expose a rail surface backed by a cut route. |
| `src/components/layout/ContextRailSurfacesDialog.tsx` | 1 | Apply the cut-surface filter to rail configuration. |
| `src/components/mcp/McpDropdown.tsx` | 3 | Keep MCP status SDK-backed; defer Chamber-config OAuth; avoid probing the cut `/api/config/mcp` route. |
| `src/components/sections/mcp/McpOAuthCallbackPage.tsx` | 1 | Return to the app through its registered deep-link scheme. |
| `src/components/sections/mcp/startMcpAuthorization.ts` | 1 | Defer MCP OAuth callback/config routes with the Chamber config cut. |
| `src/components/sections/openchamber/OpenChamberPage.tsx` | 4 | Keep fork-relay settings beside Chamber notifications; omit session-knowledge/filesystem/Git preferences; include fork-relay settings; gate them through the registry. |
| `src/components/sections/openchamber/OpenChamberVisualSettings.tsx` | 1 | Restore appearance settings from local storage instead of the Chamber config route. |
| `src/components/sections/providers/ProvidersPage.tsx` | 3 | Use SDK provider data; exclude Chamber source metadata; keep provider auth writes SDK-backed without Chamber reload. |
| `src/components/sections/providers/ProvidersSidebar.tsx` | 1 | Keep provider data SDK-backed and source-file provenance out of the mobile surface. |
| `src/components/ui/CommandPalette.tsx` | 3 | Prevent cut Git probes; remove actions for cut surfaces; apply the feature registry to settings entries. |
| `src/components/views/SettingsView.tsx` | 3 | Hide cut-route settings; render cut deep links as stubs without booting stores; keep removed settings out of blank split stages. |

### `src/contexts/`, `src/features/`, `src/hooks/`, and `src/shims/` — 6 sites in 6 files

| File | Sites | One-line reason for each site |
|---|---:|---|
| `src/contexts/ThemeSystemContext.tsx` | 1 | Replace Chamber's custom-theme route with built-in themes and local preferences. |
| `src/features/registry.ts` | 1 | Centralize reversible Phase 4 feature dispositions. |
| `src/features/unavailable.tsx` | 1 | Provide a reversible fallback surface for cut deep links. |
| `src/hooks/useRouter.ts` | 1 | Preserve cut settings links as unavailable stubs rather than route calls. |
| `src/hooks/useWebNotificationStream.ts` | 1 | Preserve event semantics so fork PushPrefs can distinguish notification kinds. |
| `src/shims/browser-stub.ts` | 1 | Provide a browser-safe fallback if a server-only module enters the mobile graph. |

### `src/lib/` — 45 sites in 36 files

| File | Sites | One-line reason for each site |
|---|---:|---|
| `src/lib/connectionPayload.test.ts` | 3 | Cover the registered scheme, case-insensitive parsing, and authority-path parsing. |
| `src/lib/connectionPayload.ts` | 4 | Emit `opencode://` links; accept legacy OpenChamber links; parse the registered scheme; normalize legacy links for URL-API-free WebViews. |
| `src/lib/i18n/messages/de.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/de.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/en.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/en.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/es.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/es.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/fr.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/fr.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/ja.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/ja.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/ko.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/ko.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/pl.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/pl.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/pt-BR.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/pt-BR.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/tr.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/tr.ts` | 1 | Complete Turkish translations for the Git discovery labels added in Phase 6; retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/uk.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/uk.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/zh-CN.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/zh-CN.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/i18n/messages/zh-TW.settings.ts` | 1 | Use the app's registered scheme in connection guidance. |
| `src/lib/i18n/messages/zh-TW.ts` | 1 | Retain the two local unavailable-feature keys across upstream locale syncs. |
| `src/lib/opencode/client.ts` | 2 | Use the fork's direct URL only when Anemos env is active while preserving Chamber `/api` defaults; keep plain v2 routes out of `/api`. |
| `src/lib/persistence.ts` | 1 | Preserve client-side appearance, typography, and model preferences without Chamber config routes. |
| `src/lib/platform.ts` | 1 | Centralize native-shell detection for Capacitor, Tauri, and Swift WKWebView. |
| `src/lib/runtime-auth.ts` | 3 | Retain raw Basic credentials; inject HTTP Basic without bearer conversion; expose the Basic header to transports that cannot use bearer auth. |
| `src/lib/runtime-fetch.ts` | 1 | Support v2 plain `/global`, `/config`, `/session`, and `/mcp` routes. |
| `src/lib/runtimeSurface.ts` | 1 | Use the same mobile surface for Tauri and Swift WKWebView shells as for Capacitor. |
| `src/lib/settings/search.ts` | 1 | Prevent settings search from reopening a cut page. |
| `src/lib/theme/themes/index.ts` | 1 | Set Anemos brand defaults for the mobile UI 3 surface. |
| `src/lib/url.ts` | 2 | Prevent OpenCode/legacy app schemes from relaunching from chat content; route external links through the native adapter. |

### `src/stores/` and `src/sync/` — 8 sites in 7 files

| File | Sites | One-line reason for each site |
|---|---:|---|
| `src/stores/useAgentsStore.ts` | 1 | Take agent definitions from the SDK while treating scope metadata as a Chamber config route. |
| `src/stores/useCommandsStore.ts` | 1 | Take slash commands from the SDK while treating scope metadata as a Chamber config route. |
| `src/stores/useConfigStore.ts` | 2 | Avoid Chamber settings routes on direct runtimes; keep the mobile entry graph on the configured OpenCode runtime. |
| `src/stores/useSkillsStore.ts` | 1 | Do not load the Chamber skills/config route. |
| `src/stores/useSnippetsStore.ts` | 1 | Keep snippets unavailable as a Chamber config surface. |
| `src/sync/event-pipeline.ts` | 1 | Carry direct OpenCode auth in fetch headers and use SSE because browser WebSockets cannot carry Basic headers. |
| `src/sync/reconnect-recovery.ts` | 1 | Expose the event-pipeline reconnect trigger to native lifecycle adapters. |

## Sync contract

Use `script/chamber-sync.sh` to recopy only the pinned upstream paths. The
script intentionally does not merge local changes: after every recopy, follow
`docs/chamber-sync-checklist.md` and re-apply every source site listed above,
then update this file's upstream ref, date, counts, and reasons before
committing. Never treat UI 1's remote URL as a reason to vendor or modify
OpenChamber server code.
