# OpenChamber Sync Runbook

> This runbook covers a fresh upstream-tag sync for UI 3. The current vendor
> pin is OpenChamber `v1.22.0-3` at
> `2c8ae9adc116376da1e6bb7ac09d8807f1f3b120`. The complete local-divergence
> ledger is `packages/chamber-ui/PROVENANCE.md`.

The sync script copies only the reviewed OpenChamber UI/mobile-entry inputs.
It does not merge local changes. A sync is incomplete until the ledger has
been re-applied and all gates below pass.

## 1. Before syncing

- [ ] Work from the repository root on a branch where the intended chamber
      changes are isolated.
- [ ] Confirm the upstream clone is `/tmp/opencode/openchamber`, or set
      `OPENCHAMBER_ROOT` to a clone you control.
- [ ] Set `OPENCHAMBER_REF` to the reviewed tag or full commit; do not sync a
      moving branch name.
- [ ] Fetch tags and confirm the new ref resolves to the reviewed commit:

      ```bash
      git -C "${OPENCHAMBER_ROOT:-/tmp/opencode/openchamber}" fetch --tags --prune
      git -C "${OPENCHAMBER_ROOT:-/tmp/opencode/openchamber}" show --no-patch --format='%H %D' "$OPENCHAMBER_REF"
      ```

- [ ] Read the current `packages/chamber-ui/PROVENANCE.md` and the
      [Phase 11 plan](plans/openchamber-ui-migration.md#phase-11--attribution-sync-docs-housekeeping-softened--no-deletions--replaces-old-p10).
- [ ] Record the old vendor ref and current source-marker count before running
      the script.
- [ ] Confirm no unrelated work is staged. The sync must not touch
      `packages/app`, `packages/session-ui`, `packages/ui`, the native shells,
      or the selector/combined-bundle glue.

## 2. Pin bump and recopy

1. Review the upstream delta for the exact paths that the script imports:

      ```bash
      git -C "${OPENCHAMBER_ROOT:-/tmp/opencode/openchamber}" diff \
        "$OLD_OPENCHAMBER_REF" "$OPENCHAMBER_REF" -- \
        packages/ui/src packages/ui/tsconfig.json \
        packages/web/mobile.html packages/web/src/mobile-main.tsx \
        packages/web/src/runtimeConfig.ts packages/web/src/api LICENSE
      ```

2. Run the pin-bump through the repository script. `OPENCHAMBER_REF` is
   required for a bump; `OPENCHAMBER_ROOT` is optional:

      ```bash
      OPENCHAMBER_ROOT=/tmp/opencode/openchamber \
      OPENCHAMBER_REF=<reviewed-tag-or-commit> \
      script/chamber-sync.sh
      ```

3. Confirm the script copied `packages/ui/src`, its `tsconfig.json`, the
   selected `packages/web` mobile entry/API files, and the upstream MIT
   `LICENSE` into `packages/chamber-ui`. It preserves the package's local
   browser shims but intentionally replaces the copied source tree.
4. Check `git diff --stat -- packages/chamber-ui` and inspect the full diff.
   Reject unexpected upstream paths, generated test-runner wiring, server
   entries, or changes outside the selected copy set.

## 3. Re-apply the local ledger

- [ ] Re-apply every source site listed in
      `packages/chamber-ui/PROVENANCE.md`; do not rely on a blind recopy.
- [ ] Restore the standalone `mobile/index.html` path and direct
      `VITE_OPENCODE_URL`/host/port wiring.
- [ ] Restore the package Vite aliases, `base: './'`, root `chamber.html`
      output, `worker.format: 'es'`, and browser defines.
- [ ] Restore the Anemos adapter, Basic-auth, SSE/reconnect, storage,
      deep-link, feature-registry, push, theme, locale, and unavailable-stub
      changes.
- [ ] Restore the package-local tests and remove any copied upstream test
      runner wiring that is not part of the UI 3 test setup.
- [ ] Update the upstream ref/date and the counted area/file totals in
      `PROVENANCE.md`. Recount source sites; a changed count requires a
      reviewed ledger diff, not just an updated number.

### Caveats to re-check after every sync

| Caveat | Re-check |
|---|---|
| CORS / WebView origin | The server allow-list covers `http://localhost:*`, `http://127.0.0.1:*`, `tauri://localhost`, `http(s)://tauri.localhost`, `oc://renderer*`, and `*.opencode.ai`; `Authorization` must remain allowed in preflight. Keep iOS exactly `tauri://localhost`; never change it to `https://localhost`. `capacitor://localhost` is not an accepted production origin. |
| Worker bundling | Markdown/diff workers remain `?worker&url` module workers, and Vite keeps `worker.format: 'es'`. Recheck loading under the iOS custom scheme and Android WebView CSP. |
| `process.cwd()` | The browser guard in the vendored OpenCode client and the `process.env`/`globalThis` Vite defines must remain intact. |
| Browser-neutral aliases | `express`, `http-proxy-middleware`, and `simple-git` must resolve to the browser stub for UI 3. Re-run the mobile import-graph audit: no eager server/terminal dependency; `heic2any` may remain lazy only. |
| UI 1 boundary | UI 1 is a remote URL, not copied source. Keep native bridge origin gates and never add Chamber-server domains to remote IPC capabilities. |
| Combined bundle | Do not replace the package's root `chamber.html` output or asset-relative paths; both iOS and Android copy it under their `assets/chamber/` tree. |

## 4. Verification gates

Run the focused package tests from the repository root using Bun's `--cwd`
option. Run the e2e smoke against a real v2-capable `opencode serve` backend.

- [ ] Install/update dependencies with the repository's locked Bun version:
      `bun install --frozen-lockfile`
- [ ] Package typecheck: `bun run --cwd packages/chamber-ui typecheck`
- [ ] i18n parity over the shipped 12 locales:
      `bun --cwd packages/chamber-ui test src/lib/i18n/parity.test.ts`
- [ ] UI 3 fork-relay push tests:
      `bun --cwd packages/chamber-ui test src/anemos/push/push-pair.test.ts src/anemos/push/push-triggers.test.ts`
- [ ] UI 3 browser smoke (boot, connect, streamed session, settings, and
      boot-guard path):
      `bun run --cwd packages/chamber-ui test:e2e -- e2e/smoke/boot.spec.ts`
- [ ] Full UI 3 e2e smoke: `bun run --cwd packages/chamber-ui test:e2e`
- [ ] Repository typecheck: `bun run typecheck`
- [ ] Build the combined bundle through both shells:
      `bun run --cwd packages/ios build` and
      `bun run --cwd packages/android build`
- [ ] Confirm the UI 2 zero-change invariant:
      `git diff --stat packages/app` is empty.
- [ ] Run the existing Classic regression suite without changing its files.
- [ ] On device/simulator, verify selector launch, remembered selection,
      four-finger swipe-up and double-tap return gestures, UI 1 remote
      navigation/bridge denial, UI 3 SSE/workers, and UI 2 regression.
- [ ] Complete native push delivery verification through the packaged
      sideload/device path; unit push tests alone do not sign off APNs/relay
      delivery.
- [ ] Finish with `git status --short`: only the reviewed sync, ledger, and
      intended generated WebAssets changes may remain.

## 5. Review and rollback

- Review the source diff and the updated ledger together. Preserve the
  upstream MIT `LICENSE`; do not copy the OpenChamber server or desktop entry.
- Keep UI 2 (`packages/app`) permanent and unchanged. UI 1 remains the user's
  independently updated Chamber server, so an upstream sync never updates it.
- If a gate fails, do not commit a partial recopy. Restore the prior vendor
  ref and re-apply its ledger, or revert the sync commit, then investigate the
  specific upstream delta.
- Do not delete packages as part of this process. The three-UI architecture,
  its invariants, and the Phase 11 no-deletions decision are recorded in the
  migration plan linked above.
