# Anemos — Sideload & iPhone Onboarding Runbook

**Signed on-device by SideStore using your free Apple ID.**  
CI produces an unsigned `.ipa`; SideStore mints the 7-day signature when you install it.

---

## Prerequisites (one-time)

### 1. iPhone requirements

- **iOS 17+** — the app targets iOS 17.0 APIs.
- **Developer Mode = ON** — Settings → Privacy & Security → **Developer Mode** → toggle on.  
  ⚠️ On iOS 16+, this requires a wired reboot the first time. On iOS 17+ it can be enabled without a reboot.

### 2. Install SideStore

SideStore installs and re-signs sideloaded apps on-device without a Mac.

- Go to [**sidestore.io**](https://sidestore.io) on your iPhone and follow their install guide.
- The first-time setup requires a computer (Windows/Mac/Linux) to install the SideStore utility app and a WireGuard VPN profile. After that, SideStore works wirelessly.
- **Linux users:** Use the SideStore pairing helper (`JitterBugPair` or `SideStoreLoader`) over USB via `libimobiledevice` (`idevicepair pair`).

### 3. Apple ID

- Any **free Apple ID** works. No Developer Program ($99/year) required for v1.
- If you have **two-factor authentication** (2FA) enabled, generate an **app-specific password**:
  1. Go to [appleid.apple.com](https://appleid.apple.com) → Sign In → **App-Specific Passwords**.
  2. Generate one for "SideStore" and save it somewhere safe.

---

## Install Anemos (per build)

### 1. Build the `.ipa` — push to `main`

The **iOS Sideload** workflow (`.github/workflows/ios-sideload.yml`) builds the unsigned `.ipa` on every push to `main` (and can be triggered manually from the Actions tab). `node scripts/deploy-ipa.mjs deploy` handles the push for you — it fetches `origin/main`, rebases your local commits onto it, pushes them to `main`, then waits for the CI build, downloads the `.ipa`, and serves it in one step.

Pushing manually is optional — use it if you prefer to review before deploying (you can then run the deploy script's `wait`, `download`, and `serve` steps instead of `deploy`):

```bash
git push origin main
```

Then wait for the workflow to finish (~10–15 min on `macos-15`).

### 2. Download & serve with the deploy script

Use the deploy script's LAN server instead of downloading from GitHub Artifacts directly — GitHub wraps artifacts in a `.zip`, which triggers the `.ipa.zip` rename problem (see Troubleshooting). On your Linux machine:

```bash
node scripts/deploy-ipa.mjs deploy
```

This waits for the latest successful CI build, downloads `Anemos.ipa` into `~/.local/share/anemos/builds/`, and starts a local HTTP server (auto-shuts down after 15 min). It prints the URL to open on your iPhone, e.g.:

```
📱 Open this URL on your iPhone Safari:
   http://192.168.1.50:8765/
```

The page shows a one-tap **Install** button (a `sidestore://` link) plus a plain download link. Both stream the raw `.ipa` bytes directly — no `.zip` wrapper.

### 3. Install via SideStore

- **Easiest:** open the deploy page in Safari on your iPhone and tap **Install**.
- **Manual:** open SideStore → tap **+** (plus) or **Browse** / **Install App** → navigate to the `.ipa` and select it.
- Enter your **Apple ID** email and **app-specific password** when prompted.
  - SideStore signs the app on-device using your Apple ID — this is the 7-day signature.
- Wait for the install to complete. The app appears on your home screen with an "Anemos" icon.

---

## Trust the developer profile (first time after each install)

This is required every time you install a new `.ipa` (including re-installs):

1. Open **Settings** → **General** → **VPN & Device Management**.
2. Under **Developer App**, tap your **Apple ID**.
3. Tap **Trust `[your email]`**.
4. Confirm **Trust** in the dialog.

If you skip this step, the app won't launch.

---

## First launch — what to expect

### Push notifications are disabled

The sideload build has **push notifications disabled** — a free Apple ID cannot use APNS, and notifications are not part of the sideload signing setup. If you don't get push notifications, or the app shows pairing/notification features as unavailable, that is expected — not a bug.

The **permanent fix** is the $99/year Apple Developer Program, which enables APNS; push can then be re-enabled via a native bridge.

### Server pairing: connect to an `opencode serve` backend

Anemos is a WKWebView app that talks to an **`opencode serve`** backend over your local network:

- Start the backend on your computer (the same machine that runs the deploy script):
  ```bash
  opencode serve --port 4096
  ```
- The phone and the server must be on the **same network**. The app stores the server URL in its settings (`opencode.defaultServerUrl`) — point it at `http://<your-computer-ip>:4096`.
- The app includes the `NSLocalNetworkUsageDescription` permission string, so iOS prompts about local-network access the first time it connects.

---

## The 7-day refresh

**This is the most important operational detail. Read it carefully.**

### Why 7 days?

Free Apple ID certificates expire **7 days** after signing. After expiry, the app stops launching until refreshed. This is an Apple-imposed limit — it applies to **all** sideloaded apps, not just Anemos.

### Automatic refresh (recommended)

SideStore can refresh apps wirelessly when:

- The phone is **unlocked** and connected to **Wi-Fi**.
- SideStore's **WireGuard VPN** profile is enabled (it is, if you followed the SideStore setup).
- SideStore can reach Apple's validation servers.

SideStore typically auto-refreshes within a day or two of expiry. **It does not refresh when the phone is locked.**

### Manual refresh

1. Open **SideStore** on your iPhone.
2. Tap **Anemos** in the app list.
3. Tap **Refresh**.
4. Enter your Apple ID password or app-specific password if prompted.

### Fallback: reinstall

If refresh fails (common after long periods of inactivity or network changes):

1. Re-run `node scripts/deploy-ipa.mjs refresh` (re-downloads the latest `Anemos.ipa` and serves it — same LAN page as install).
2. Open SideStore → tap **+** → select the `.ipa` → install fresh.
3. Re-trust the developer profile and re-enter any app settings.

### The permanent fix

The **$99/year Apple Developer Program** removes this limitation — certificates last 1 year, no weekly refresh. Consider it if:

- You use Anemos daily and the 7-day cycle becomes annoying.
- You want push notifications (APNS) — free Apple IDs can't use APNS.
- You want to share Anemos with others without asking them to sideload.

---

## The deploy script

`scripts/deploy-ipa.mjs` (Node, zero dependencies) fetches `Anemos.ipa` artifacts from GitHub Actions, stores them in a versioned history under `~/.local/share/anemos/builds/<runId>/`, and serves them over LAN HTTP for SideStore. It reads the same GitHub token `gh` uses (e.g. `~/.config/opencode/gh-token`).

| Subcommand | What it does |
|------------|-------------|
| `deploy` | Push → wait for CI build → download → serve (the main command) |
| `push` | Push local commits to `origin/main` (rebases first); prints the resulting SHA |
| `serve` | Start the LAN HTTP server from already-downloaded builds (auto-shutdown window, default 15 min; override with `ANEMOS_SERVE_MIN`) |
| `refresh` | Re-download the latest `Anemos.ipa` + serve |
| `list` | List locally stored builds (roll back to an older one on the phone if the latest is broken) |
| `list-remote` | List the last N successful CI runs on GitHub |
| `prune` | Delete old builds beyond the retention count (default 10) |

Typical cycle: **`node scripts/deploy-ipa.mjs deploy` → tap Install on the phone.** (Run `node scripts/deploy-ipa.mjs push` standalone first if you want to review the pushed commit before deploying.)

---

## Troubleshooting

### SideStore won't refresh

- **WireGuard VPN is off:** SideStore needs its VPN profile active for refresh. Check in Settings → General → VPN & Device Management → ensure **SideStore** (WireGuard) is connected.
- **No network:** Refresh requires internet access to reach Apple's servers. Try over **Wi-Fi**, not cellular.
- **Phone was locked for too long:** SideStore only refreshes when the phone is unlocked. Leave the phone unlocked on Wi-Fi for ~10 minutes.
- **Apple ID password changed:** Update credentials in SideStore → Settings → Apple ID.

### App crashes on launch

- **Signature expired:** The 7-day certificate has lapsed. Reinstall or refresh via SideStore.
- **Developer profile not trusted:** Settings → General → VPN & Device Management → tap your Apple ID → **Trust**.
- **Corrupt install:** Delete the app, download a fresh `.ipa` (deploy script or GitHub), and reinstall.

### `.ipa` downloads as a `.zip` from GitHub

GitHub sometimes wraps artifacts in a `.zip` container. If you download `Anemos.ipa` but get `Anemos.ipa.zip`:

- **Avoid it entirely:** use the deploy script's direct-stream route (`deploy` / `serve`) — the LAN server streams the raw `.ipa` bytes, so SideStore never sees a `.zip`.
- On iPhone in Files app: tap to extract, then select the inner `.ipa`.
- In SideStore: navigate to the extracted `.ipa` inside the unzipped folder.

---

## Appendix: CI workflow summary

The GitHub Actions workflow (`.github/workflows/ios-sideload.yml`) runs on `macos-15` on every push to `main`:

| Step | What it does |
|------|-------------|
| `Build web assets` | `bun run --cwd packages/ios build` → `WebAssets/index.html` |
| `Generate Xcode project` | `xcodegen generate` → `OpenCode.xcodeproj` |
| `Build (unsigned, Release)` | `xcodebuild` with `CODE_SIGNING_ALLOWED=NO`, `SYMROOT=build` |
| `Strip debug dylibs` | Removes `*.debug.dylib` / `__preview.dylib` from `Anemos.app` |
| `Package .ipa` | Copies `Anemos.app` into `Payload/` → `zip -r Anemos.ipa` |
| `Upload .ipa` | `Anemos.ipa` artifact (7-day retention) available in the run's **Artifacts** |

**No signing secrets are needed in CI.** The `.ipa` is unsigned/ad-hoc. SideStore signs it on-device at install time.
