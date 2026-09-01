# Chamber Sync Checklist — Phase 1 Vendor

> Vendored OpenChamber `packages/ui` and mobile browser entry at commit
> `2c8ae9adc116376da1e6bb7ac09d8807f1f3b120` (`v1.22.0-3`). Regenerate the
> copied files with `script/chamber-sync.sh` only after reviewing the pinned
> upstream ref.

## Before syncing

- [ ] Confirm the upstream clone is `/tmp/opencode/openchamber` or set `OPENCHAMBER_ROOT`.
- [ ] Confirm `OPENCHAMBER_REF` points to the intended reviewed upstream commit.
- [ ] Confirm the working tree is clean apart from the planned chamber changes.
- [ ] Read the current `packages/chamber-ui/PROVENANCE.md` and migration plan.
- [ ] Review all current `// ANEMOS-PATCH:` markers before recopying.

## Re-copy procedure

- [ ] Run `OPENCHAMBER_REF=<pinned-commit> script/chamber-sync.sh`.
- [ ] Confirm the script copied `packages/ui/src`, its `tsconfig.json`, and the
      selected `packages/web` mobile entry/API files.
- [ ] Re-apply the standalone mobile path and `VITE_OPENCODE_URL` wiring.
- [ ] Re-apply the Vite aliases, `base: './'`, worker format, and browser
      defines in `packages/chamber-ui/vite.config.ts`.
- [ ] Re-apply every `// ANEMOS-PATCH:` marker; do not silently overwrite local
      behavior while resolving upstream changes.
- [ ] Remove any copied test runner wiring until the Phase 7 test phase.

## Divergence audit

| Area | Action | Result |
|---|---|---|
| Vendored source | Compare the recopy against the previous vendor tree | ☐ |
| Mobile HTML/entry | Verify the package-local entry path and runtime URL wiring | ☐ |
| Browser neutrality | Check node-only imports and Vite stubs/aliases | ☐ |
| Runtime client | Confirm the `process.cwd()` browser guard remains present | ☐ |
| i18n/theme | Confirm `src/lib/i18n` and `src/lib/theme/themes/*.json` are complete | ☐ |
| Attribution | Update `PROVENANCE.md` with the new ref and date | ☐ |

## Verification gate

- [ ] `bun install` completes from the repository root.
- [ ] `bun run --cwd packages/chamber-ui build` passes.
- [ ] `bun run typecheck` passes.
- [ ] Browser render against the target OpenCode backend passes before any
      native-shell work begins.
- [ ] Phase-specific verification output is recorded in the migration plan or
      the sync commit description.
