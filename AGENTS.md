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

## Local UI Development

`opencode dev web` proxies `https://app.opencode.ai`, so local UI/CSS changes won't appear there. For local UI work, run the backend and the app separately:

```bash
opencode serve --port 4096                     # backend (the opencode CLI)
bun run --cwd packages/app dev -- --port 4444  # app, targets backend at 4096
```

Never manually restart the app or server process during debugging.

## Mobile Builds

Authoritative docs: `IOS_BEAM.md` and `ANDROID_BUILD.md` at repo root.

- `packages/ios`: `bun run --cwd packages/ios beam` uploads a **private TestFlight** build, not a public App Store release. See `IOS_BEAM.md` for required env vars (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH`, `IOS_BUNDLE_ID`).
- `packages/android`: Tauri Android build; requires Android NDK `27.0.12077973`, JDK 21, and a release keystore. See `ANDROID_BUILD.md`.

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
