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

## Local changes ledger

| Date | Change | Files / marker |
|---|---|---|
| 2026-09-02 | Phase 6: added the Anemos themes and shipped-locale parity gate. Per D8.6, the six net-new locales `ar`, `ru`, `th`, `no`, `da`, and `bs` are deferred to a demand-driven backlog; they are not a gate for UI 3. | `src/lib/theme/`, `src/lib/i18n/`, `src/features/` (`// ANEMOS-PATCH:`) |
| | | |
