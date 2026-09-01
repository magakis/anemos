# AGENTS.md

Root guide for agentic coding assistants in this repository (the **anemos** mobile fork of `sst/opencode`).
Scope: applies to the whole repo unless a deeper `AGENTS.md` exists.

## Quick Rules

- Use Bun `1.3.13` (enforced by `packageManager` in root `package.json` and the `.husky/pre-push` hook)
- Default branch is `dev`; a local `main` may or may not exist
- Run package scripts from repo root with `bun run --cwd <package> <script>`
- Use parallel tool calls when tasks don't depend on each other
- Prefer automation: do the work unless blocked by missing info or a safety concern
- Never run tests from repo root — `bunfig.toml` points `test.root` at `./do-not-run-tests-from-root` and the root `test` script exits 1
- `.husky/pre-push` runs `bun typecheck`; pushes are blocked on typecheck failure

## Respect Deeper Guides

More specific instructions override this file where they exist:

- `packages/app/AGENTS.md`
- `packages/app/e2e/AGENTS.md`

## Repo Map

Actual packages in this fork. The upstream `packages/opencode`, `packages/desktop`, `packages/desktop-electron`, `packages/web`, `packages/console`, and `packages/storybook` are **not** present here — don't assume they exist.

- `packages/app` — SolidJS web/mobile app; the primary frontend and the target of root `bun dev`. Unit + Playwright e2e tests.
- `packages/ui` — shared UI primitives (Tailwind; run `generate:tailwind` after token changes).
- `packages/sdk/js` — generated TypeScript SDK client. **Generated** — do not hand-edit `src/gen/` or `src/v2/gen/`.
- `packages/ios`, `packages/android` — Tauri-based mobile wrappers.
- `packages/plugin`, `packages/shared` — shared logic.
- `packages/push`, `packages/push-relay` — push notification services.
- `packages/containers`, `packages/identity`, `packages/extensions`, `packages/docs`, `packages/script` — infra and supporting packages.
- `sdks/vscode` — VS Code extension.

There is no `packages/opencode` in this fork; the `opencode` runtime is used as an installed CLI, not a local package.

## Commands

Root scripts (`bun run <name>`):

```bash
bun install
bun dev                 # runs `packages/app` dev (Vite) — the default dev entrypoint
bun run lint            # oxlint at repo root (NOT eslint)
bun run typecheck       # `bun turbo typecheck` across packages
```

Per-package build / dev:

```bash
bun run --cwd packages/app dev
bun run --cwd packages/app build
bun run --cwd packages/ui dev
bun run --cwd packages/ui generate:tailwind
bun run --cwd packages/sdk/js build
bun run --cwd packages/ios build
bun run --cwd packages/android build
bun run --cwd packages/plugin build
```

Tests:

```bash
# app unit (Bun test, preloads happy-dom)
bun run --cwd packages/app test:unit
bun run --cwd packages/app test:unit -- ./src/utils/server-health.test.ts
bun run --cwd packages/app test:unit -- -t "reports healthy"

# app e2e (Playwright, chromium only)
bun run --cwd packages/app test:e2e
bun run --cwd packages/app test:e2e -- e2e/app/home.spec.ts
bun run --cwd packages/app test:e2e -- -g "home renders"
bun run --cwd packages/app test:e2e:local   # full local server setup
bun run --cwd packages/app test:e2e:ui      # interactive Playwright UI
bun run --cwd packages/app test:e2e:report

# push / push-relay
bun run --cwd packages/push test
bun run --cwd packages/push-relay test

# VS Code extension
bun run --cwd sdks/vscode test
bun run --cwd sdks/vscode check-types
bun run --cwd sdks/vscode lint
```

Notes:

- No repo-wide lint beyond root `oxlint`; `sdks/vscode` has its own eslint.
- Prefer the narrowest command that proves a change (a file path or `-t` filter) before running a whole suite.
- Turbo (`turbo.json`) makes `@opencode-ai/app#test` depend on upstream `^build`, so a clean build may be required before app tests pass.

## Codegen

- The SDK client is generated from the OpenAPI spec.
- Entry: `./script/generate.ts`; generator: `./packages/sdk/js/script/build.ts`.
- Generated outputs: `packages/sdk/js/src/gen/` and `packages/sdk/js/src/v2/gen/` — **never hand-edit**.
- Re-run codegen whenever the API/SDK surface changes.

## Local UI Development & Pre-Push Testing

`packages/app` is a SolidJS web app wrapped in iOS/Android Tauri WebViews, so almost every bug — UI, state, network, content-type — reproduces in a desktop browser with a mobile viewport. Browser iteration is seconds; the CI → TestFlight → device loop is 10+ minutes and shows only a one-line toast. **Always test in the browser before pushing to CI/device** — treat device builds as verification, not experimentation.

### Start the browser dev loop

The app resolves its backend at boot from `VITE_OPENCODE_SERVER_HOST` / `VITE_OPENCODE_SERVER_PORT` (`packages/app/src/entry.tsx`; default `localhost:4096`). There is no Vite proxy — requests go direct to the backend. To target an already-running opencode server (the persistent one runs on `:42447`):

```bash
VITE_OPENCODE_SERVER_PORT="42447" bun run --cwd packages/app dev -- --port 4445
```

To start your own backend instead: `opencode serve --port 4096` and drop the env var (the app defaults to `:4096`). (`opencode dev web` proxies `https://app.opencode.ai`, so local UI/CSS changes won't appear there — always use the separate dev server above.) To keep the dev server alive after the shell exits, detach it: `setsid bash -c '… dev …' >/tmp/vite.log 2>&1 </dev/null &`.

Open `http://127.0.0.1:4445`, enable the DevTools device toolbar, and pick an iPhone preset. Don't manually restart the app or server during debugging — Vite HMR handles reloads.

## Three-UI Mobile Architecture

The iOS and Android shells ship one navigation-based bundle with a local
`selector.html` and exactly one WebView runtime:

- **UI 1 — Chamber Full:** the user's configured Chamber server loaded as a
  remote URL; Chamber owns its auth and feature surface, and native bridges
  are origin-gated away from it.
- **UI 2 — Classic:** the existing Solid app in `packages/app`, unchanged and
  permanently retained; it talks to the opencode server.
- **UI 3 — Anemos Chamber:** the vendored `packages/chamber-ui` direct-connect
  surface; it also talks to the opencode server and is the active development
  target.

Launch routing honors the remembered selection and otherwise opens Classic.
The native four-finger swipe-up gesture (with four-finger double-tap
fallback) returns from any UI, including remote UI 1, to the selector. Build
with `ANEMOS_SELECTOR=0` to route directly to Classic and disable the selector
recognizers. UI 2 work is frozen except deliberate bug fixes: after shell or
UI 3 changes, `git diff --stat packages/app` must remain empty. Route future
feature work to UI 3; UI 2 is the compatibility floor, and UI 1 follows the
user's upstream Chamber server.

### Verify before pushing

1. **Reproduce/confirm in the browser** with the DevTools console + network tab — full stack traces, response headers, and content-types, far more than the device toast.
2. **Run the narrowest test that proves the change** (see Testing Conventions):
   - Unit (run from within `packages/app`): `bun test --conditions=solid --preload ./happydom.ts ./src/<file>.test.ts`. The `test:unit` script passes `--only-failures`, so appending a path does not scope it — use the direct command.
   - E2e: `bun run --cwd packages/app test:e2e -- e2e/<spec>.spec.ts`.
   - Never run tests from the repo root (`bunfig.toml` redirects `test.root`).
3. **Only then** commit and push to CI/device.

### Diagnostics when something looks wrong

- **Two backends may be running** (`:4096` default, `:42447` persistent). A dev server started without `VITE_OPENCODE_SERVER_PORT` silently targets `:4096` — confirm which one you're hitting before trusting a result.
- **Probe the backend directly** to inspect endpoint behaviour. `curl`/`wget`/`fetch`/`http.get` are blocked in the opencode sandbox; issue raw HTTP/1.1 via Node `net.createConnection` inside `ctx_execute(language: "javascript")` and print only status + content-type + body-shape. This is how a `text/html` response from a JSON endpoint (e.g. an incomplete v2 migration) gets spotted.
- **Rendered-page inspection** — use `playwright-cli snapshot` (auto-saves to `.playwright-cli/page-*.yml`), then `ctx_index(path=…, source=…)` + `ctx_search(queries=…)`. Never `Read`/`grep` raw snapshot files (they flood context). Load the `playwright-cli` skill for the full pattern.
- **Protocol-detection gotcha** — the app negotiates v1 vs v2 at boot (`packages/app/src/utils/server-protocol.ts`). A transient `/global/health` probe failure flips it to "default v2", and the server's v2 migration may be incomplete (e.g. `/api/config`, `/api/mcp` not yet registered → SPA `text/html`). If you see `UnsupportedContentType` / "Failed to reload", suspect this; the fork's resilient detector (`packages/app/src/utils/server-protocol-resilient.ts`) downgrades to v1 when v2 endpoints serve non-JSON.
- **An "empty" session list may be correct** — the app shows sessions only for the directory it's scoped to. Before treating emptiness as a bug, check `GET /session` on the backend and compare directories; the active session may simply live elsewhere.

## Mobile Builds

Authoritative docs: `IOS_BEAM.md` and `ANDROID_BUILD.md` at repo root.

- `packages/ios`: `bun run --cwd packages/ios beam` uploads a **private TestFlight** build, not a public App Store release. See `IOS_BEAM.md` for required env vars (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH`, `IOS_BUNDLE_ID`).
- `packages/android`: Tauri Android build; requires Android NDK `27.0.12077973`, JDK 21, and a release keystore. See `ANDROID_BUILD.md`.

### Sideload deploy (`scripts/deploy-ipa.mjs`)

`node scripts/deploy-ipa.mjs deploy` auto-pushes local commits to `main` (fetches `origin/main`, rebases, then pushes `HEAD:main` using the gh-token credential helper), waits for the `ios-sideload.yml` GitHub Actions run whose `head_sha` matches the pushed commit, then downloads and serves the `Anemos.ipa` over HTTP for SideStore installation. It polls the Actions API every 10 s for 15 min. A standalone `push` subcommand is available to push without deploying; on a rebase conflict it aborts with a clear error directing you to resolve manually.

## Style

- **Formatting**: Prettier config lives inline in root `package.json` (`semi: false`, `printWidth: 120`); 2-space indent, LF. There is no `.prettierrc`.
- **Imports**: keep at the top; prefer `import type`. `packages/app` uses the `@/*` alias (→ `src/*`, configured in both `tsconfig.json` and `vite.js`).
- **Types**: avoid `any`; precise types at exported boundaries; prefer Bun APIs when a natural fit.
- **`packages/app`**: prefer `createStore` over many `createSignal` calls.
- **Errors**: avoid `try/catch` when a clearer flow exists; prefer explicit checks or `.catch(...)`.

## Testing Conventions

- In `packages/app` e2e, import `test`/`expect` from `../fixtures`, not `@playwright/test`. See `packages/app/e2e/AGENTS.md`.
- Prefer fixture-managed cleanup: `withSession`, `trackSession`, `trackDirectory`. Avoid calling `sdk.session.delete(...)` directly.
- Select via `data-component`, `data-action`, or semantic roles — not CSS classes or IDs.
- Use `modKey` (from `e2e/utils`) for cross-platform keyboard shortcuts.
- Playwright env: `PLAYWRIGHT_SERVER_HOST`/`PLAYWRIGHT_SERVER_PORT` (backend, default `localhost:4096`), `PLAYWRIGHT_PORT` (Vite, default `3000`), `PLAYWRIGHT_BASE_URL`.

## Notes

- This is a mobile fork of `sst/opencode`; preserve `packages/ios`, `packages/android`, and mobile platform integrations (resume, storage, share, voice) in `packages/app` when merging upstream.
- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` exist. If added later, treat them as authoritative.
- `.opencode/opencode.jsonc` disables the `github-triage` and `github-pr-search` tools.
