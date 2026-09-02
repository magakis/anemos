# Phase 10 Device Verification Checklist

> Runbook for the Rev 3 two-interface burn-in. Prepared against `3741959081`.
> The headless gates below are complete; the platform matrix is the physical-device
> handoff. Switching interfaces reloads the single WebView, so unsaved drafts are
> expected to be discarded.

## Headless gates — DONE

- ~~[x] UI 3 Playwright smoke: 4/4 green (`c78dd7ed4`).~~ **DEFERRED — UI 3 is on hold (Rev 3).**
- [x] D8.5 remote-bridge pen-test harness: static origin-policy and source/capability gates signed off.
- ~~[x] UI 3 12-locale parity and Anemos theme gate: green.~~ **DEFERRED — UI 3 is on hold (Rev 3).**
- [x] Combined iOS and Android shell builds: green; selector, Classic, and Chamber Full route present; UI 3 assets absent.
- [x] UI 2 invariant: the only `packages/app` diff from `origin/main` is the sanctioned pre-P8 voice-removal commit `75a621323`; the worktree and all shell-phase changes are empty. Exact results are recorded in the migration plan.

## Build and packaging commands

Run from the repository root unless a command block says otherwise. Keep signing
credentials local; never add `.beam.env`, keystores, or API keys to git.

### Build readiness

These package scripts exist and are the final readiness commands:

```bash
bun run --cwd packages/sdk/js build
bun run --cwd packages/chamber-ui build
bun run --cwd packages/ios build
bun run --cwd packages/android build
```

Control build with the selector disabled (routes directly to Classic and disables
the recognizers):

```bash
ANEMOS_SELECTOR=0 bun run --cwd packages/ios build
ANEMOS_SELECTOR=0 bun run --cwd packages/android build
```

Observed Rev 3 current-tree asset sizes:

| Artifact | `du -sh` |
|---|---:|
| `packages/ios/WebAssets` | 34M |
| `packages/android/dist` | 34M |
| `packages/chamber-ui/dist` | 38M |

### iOS TestFlight

Configure `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH`, and `IOS_BUNDLE_ID`
in the shell environment or `packages/ios/.beam.env` as described in
[`IOS_BEAM.md`](../../IOS_BEAM.md), then run:

```bash
bun run --cwd packages/ios beam
```

For a selector-disabled control upload:

```bash
ANEMOS_SELECTOR=0 bun run --cwd packages/ios beam
```

### iOS sideload

From the repository root, deploy the IPA through the documented workflow:

```bash
node scripts/deploy-ipa.mjs deploy
```

### Android

First produce the combined web bundle:

```bash
bun run --cwd packages/android build
```

For the signed arm64 APK, use the toolchain and release command from
[`ANDROID_BUILD.md`](../../ANDROID_BUILD.md):

```bash
cd packages/android
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/27.0.12077973"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
bun run tauri android build --apk --target aarch64
```

The documented APK output is
`packages/android/src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`.

## Physical-device matrix

For every row, check exactly one of PASS or FAIL and record the device/build in
the notes column. Repeat the matrix on the normal build and, where useful, the
`ANEMOS_SELECTOR=0` control build.

### iOS

| Surface | PASS | FAIL | Verification item | Notes |
|---|:---:|:---:|---|---|
| Selector | [ ] | [ ] | Cold launch defaults to Classic when no selection is stored; cards identify each target server. | |
| Selector | [ ] | [ ] | Remembered selection survives relaunch and a full OS restart. | |
| Selector | [ ] | [ ] | Deep links route to Classic; UI 1 is never used for an `opencode://` link. | |
| UI 1 — Chamber Full | [ ] | [ ] | Real Chamber server auth and session persistence work across navigation and relaunch. | |
| UI 1 — Chamber Full | [ ] | [ ] | Real Chamber SSE stream remains usable and reconnects after backgrounding/foregrounding. | |
| UI 1 — Chamber Full | [ ] | [ ] | Four-finger swipe-up works over remote Chamber content without breaking Chamber touch handling. | |
| UI 1 — Chamber Full | [ ] | [ ] | Unreachable-server path shows the native error and returns to the selector. | |
| UI 1 — Chamber Full | [ ] | [ ] | HTTPS works; the intended private-LAN HTTP ATS behavior is confirmed. | |
| UI 2 — Classic | [ ] | [ ] | Spot-check launch, server connection, session list, prompt, streaming, and resume behavior against today’s app. | |
| ~~UI 3 — Anemos Chamber~~ | — | — | **DEFERRED — UI 3 is on hold (Rev 3):** boot, Basic auth, and live SSE updates against the opencode server. | |
| ~~UI 3 — Anemos Chamber~~ | — | — | **DEFERRED — UI 3 is on hold (Rev 3):** Markdown worker from the `tauri://localhost` custom scheme. | |
| ~~UI 3 — Anemos Chamber~~ | — | — | **DEFERRED — UI 3 is on hold (Rev 3):** cold-start `opencode://` deep link and intended session/location. | |
| ~~UI 3 — Anemos Chamber~~ | — | — | **DEFERRED — UI 3 is on hold (Rev 3):** haptics and share actions from the native shell. | |
| ~~Cross-cutting~~ | — | — | **DEFERRED — UI 3 is on hold (Rev 3):** repeatedly switch selector → UI 1 → UI 2 → UI 3 and check memory. | |
| Cross-cutting | [ ] | [ ] | Primary four-finger swipe-up does not false-trigger during typing/scrolling; four-finger double-tap fallback works. | |

**iOS platform notes:** On iPad, system multitasking may win the four-finger
swipe-up gesture. Record whether the double-tap fallback and relaunch path remain
usable. Confirm the custom origin stays exactly `tauri://localhost`.

### Android

| Surface | PASS | FAIL | Verification item | Notes |
|---|:---:|:---:|---|---|
| Selector | [ ] | [ ] | Cold launch defaults to Classic when no selection is stored; cards identify each target server. | |
| Selector | [ ] | [ ] | Remembered selection survives relaunch and a full OS restart. | |
| Selector | [ ] | [ ] | Deep links route to Classic; UI 1 is never used for an `opencode://` link. | |
| UI 1 — Chamber Full | [ ] | [ ] | Real Chamber server auth and session persistence work across navigation and relaunch. | |
| UI 1 — Chamber Full | [ ] | [ ] | Real Chamber SSE stream remains usable and reconnects after backgrounding/foregrounding. | |
| UI 1 — Chamber Full | [ ] | [ ] | Four-finger swipe-up works over remote Chamber content without breaking Chamber touch handling. | |
| UI 1 — Chamber Full | [ ] | [ ] | Unreachable-server path shows the native error and returns to the selector. | |
| UI 1 — Chamber Full | [ ] | [ ] | HTTPS works; the intended private-LAN HTTP cleartext behavior is confirmed. | |
| UI 2 — Classic | [ ] | [ ] | Spot-check launch, server connection, session list, prompt, streaming, and resume behavior against today’s app. | |
| ~~UI 3 — Anemos Chamber~~ | — | — | **DEFERRED — UI 3 is on hold (Rev 3):** boot, Basic auth, and live SSE updates against the opencode server. | |
| ~~UI 3 — Anemos Chamber~~ | — | — | **DEFERRED — UI 3 is on hold (Rev 3):** Markdown worker under Android WebView CSP and the `http://tauri.localhost` origin. | |
| ~~UI 3 — Anemos Chamber~~ | — | — | **DEFERRED — UI 3 is on hold (Rev 3):** cold-start `opencode://` deep link and intended session/location. | |
| ~~UI 3 — Anemos Chamber~~ | — | — | **DEFERRED — UI 3 is on hold (Rev 3):** haptics and share actions from the native shell. | |
| ~~Cross-cutting~~ | — | — | **DEFERRED — UI 3 is on hold (Rev 3):** repeatedly switch selector → UI 1 → UI 2 → UI 3 and check memory. | |
| Cross-cutting | [ ] | [ ] | Four-finger swipe-up does not false-trigger during typing/scrolling; four-finger double-tap fallback works. | |

## Deferred until proper distribution (sideload era)

Remote push delivery is intentionally disabled for SideStore/sideloaded builds.
The P5 implementation remains in UI 3 for a future proper-distribution build.
When APNs is available and push is re-enabled in the feature registry, verify:

- [ ] **Pairing flow:** request notification permission, start pairing, complete
      relay pairing, and confirm repair/clear flows recover cleanly.
- [ ] **Relay URL:** confirm the configured relay URL is validated, persisted,
      restored after relaunch, and used by pairing and relay requests.
- [ ] **Preferences:** confirm completion, error, question, and subtask
      preferences persist and the corresponding event mappings honor them.
- [ ] **Test push:** send the settings test push and confirm delivery while the
      app is foregrounded, backgrounded, and relaunched on both platforms.

## How to report failures back

For a failure, record platform, device/OS, build or commit, selected UI, exact
steps, expected result, actual result, and whether it reproduces after relaunch.
Re-run with the relevant debug option/logging enabled, capture device logs
(Xcode/Console for iOS; `adb logcat` and Android Studio logs for Android), and
attach screenshots or a screen recording when the failure is gesture, routing,
or rendering related. Do not attach credentials or private server tokens.
