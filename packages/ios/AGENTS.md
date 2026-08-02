# packages/ios

Custom WKWebView wrapper (not stock Tauri) for the anemos app. The SolidJS UI is served into the webview via a registered custom URL scheme. Swift native code is under `OpenCode/`; the TS entry/bridge is under `src/`.

## Webview origin & CORS (critical)

The WKWebView loads its UI from a **custom URL scheme** — currently **`tauri://localhost`**. This scheme string IS the webview's *origin*, and it must stay `tauri://localhost`:

- The opencode server ships a **default CORS whitelist** that includes `tauri://localhost` (plus dev origins `http://localhost:3000`, `http://localhost:1421`) but **NOT** arbitrary schemes like `app-local://localhost` or `capacitor://localhost`.
- If the scheme is changed away from `tauri`, every cross-origin `fetch` to the server is CORS-blocked and the app fails with WebKit's opaque **`Load failed`** (no status, no body) — even though the server returns `200`. This regression shipped once (scheme was `app-local://`); do not reintroduce it.
- The scheme is set in **`OpenCode/WebView/BridgeController.swift`** in two places that must agree: `config.setURLSchemeHandler(handler, forURLScheme: "tauri")` and the start-page URL `"tauri://localhost/index.html"`.

There is **no native fetch bridge** and none is needed — the app relies on the webview's own `fetch` passing CORS via the whitelisted origin. `platform.fetch` is intentionally undefined on iOS. (A URLSession bridge is a last resort that must also re-plumb SSE streaming; see the `debugging/webview-cors-load-failed` skill before going down that path.)

## App Transport Security (ATS)

`OpenCode/Info.plist` `NSAppTransportSecurity` carries all three relaxations (mirrors the upstream WhisperCode app): `NSAllowsArbitraryLoads`, `NSAllowsArbitraryLoadsInWebContent`, `NSAllowsLocalNetworking`. Plain-HTTP to LAN **and Tailscale** depends on `NSAllowsArbitraryLoads` — keep it, because `NSAllowsLocalNetworking` alone does NOT cover the Tailscale/CGNAT range `100.64.0.0/10`.

## Diagnosing connection failures

If the app can't reach a server that works elsewhere, the first check is CORS (webview origin vs the server's `Access-Control-Allow-Origin`), not the app code — see the `debugging/webview-cors-load-failed` skill.
