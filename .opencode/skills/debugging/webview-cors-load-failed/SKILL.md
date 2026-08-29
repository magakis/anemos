---
name: "Webview CORS Load Failed"
description: "Apply when a WKWebView/Tauri/Capacitor mobile app's fetch throws 'Load failed' (WebKit) or 'Failed to fetch' (Chromium) with NO status code and NO body against a server that works from another client — the response is CORS-blocked; diagnose by inspecting the server's Access-Control-Allow-Origin header, not the app code. If the error carries a status code or the server is unreachable from every client, skip."
confidence: 0.8
domain: "debugging"
source: "session-extraction"
version: 1.0.0
created: "2026-08-01"
last_confirmed: "2026-08-01"
metadata:
  opencode:
    tags: [cors, wkwebview, load-failed, fetch, mobile, ats, tauri]
    related_skills: [local-http-net-probe]
---

# Webview CORS Load Failed

## When to Apply

Apply when a mobile webview app (WKWebView/Tauri/Capacitor) throws `Load failed` (WebKit) or `Failed to fetch` (Chromium) with NO status code and NO response body, against a server that demonstrably works from another client (a different app, or a direct probe returns 200). If the error carries a status code, or the server is unreachable from every client, this is not the right skill — skip.

## Overview

`Load failed` is WebKit's opaque catch-all: a CORS block, an App Transport Security (ATS) block, and network-unreachable all produce the identical, detail-free message. The reflex is to debug the app's fetch code (headers, endpoint, body parsing) — but when the server returns 200 to other clients, the failure is almost always a response-level block (CORS) or a connection-level block (ATS), neither of which the app code can fix. The decisive move is to inspect the actual HTTP response headers the server sends — specifically `Access-Control-Allow-Origin` — by probing the server directly from a context where CORS/ATS do not apply (raw TCP). This also discriminates CORS from ATS: a CORS block means the request reached the server; an ATS block means it never left the device.

Many API servers (including opencode) ship a DEFAULT CORS whitelist of allowed webview origins. For opencode that whitelist is `tauri://localhost` plus dev origins (`http://localhost:3000`, `http://localhost:1421`). A mobile app whose webview content scheme is NOT on that list (e.g. `app-local://localhost`, `capacitor://localhost`) has every cross-origin fetch silently dropped — even though the server is healthy and returns `200 {"healthy":true}`.

## Action

1. **Confirm the server is healthy from a non-webview context.** Reach it via raw TCP — a Node `net.createConnection` GET (curl/wget/fetch are blocked in the opencode sandbox; see the `local-http-net-probe` skill). For opencode, `GET /global/health` should return `200 {"healthy":true,"version":"..."}`. If it does, the server is fine and the failure is client-side.
2. **Replay the webview's Origin and inspect `Access-Control-Allow-Origin`.** Send the same raw probe WITH an `Origin: <webview-origin>` header. Find the webview's content scheme in the iOS `BridgeController.swift` — the `setURLSchemeHandler(..., forURLScheme:)` string and the start-page URL (e.g. `app-local://localhost` or `tauri://localhost`). Check whether the server echoes an `Access-Control-Allow-Origin` matching that origin.
   - Header present and matches → CORS is fine; the problem is elsewhere (likely ATS — go to step 4).
   - Header ABSENT → CORS is the cause: the webview origin is not on the server's whitelist.
3. **Discover which origins the server DOES whitelist** by probing candidate origins (`tauri://localhost`, `http://localhost:3000`, `capacitor://localhost`, …). The ones that return a matching `Access-Control-Allow-Origin` are the default whitelist. (opencode: `tauri://localhost` yes; `app-local://localhost` and `capacitor://localhost` no.)
4. **Discriminate CORS from ATS** (only if step 2 showed CORS is fine but the app still fails): determine whether the request reached the server. opencode logs (`~/.local/share/opencode/log/opencode.log`) are agent logs, not HTTP access logs, so they won't show it — reason from the step-1 probe and check the iOS `Info.plist` ATS config. Plain-HTTP to non-loopback hosts needs ATS relaxation; `NSAllowsArbitraryLoadsInWebContent` exempts only WKWebView, not a native `URLSession`.
5. **Fix by aligning the webview origin with the server's whitelist** (preferred — no server change, mirrors proven upstream apps): change the webview content scheme so the origin matches a whitelisted entry (e.g. `app-local` → `tauri`). This is a one-string change in `setURLSchemeHandler` plus the start-page URL. Alternatively, if you control the server and cannot change the scheme, start it with the matching CORS flag (opencode: `--cors app-local://localhost`). Do NOT build a native `URLSession` fetch bridge unless the server genuinely cannot cooperate — it is far more complex (must re-plumb SSE streaming through the bridge) and unnecessary when the origin can be aligned.

## Common Pitfalls

- **"`Load failed" looks like a network/code bug:** WebKit collapses CORS, ATS, and DNS failures into one opaque message with no status. Do not start editing the app's fetch headers/endpoint/body-parsing — inspect the server's response headers first.
- **Gating on the wrong ATS key:** `NSAllowsArbitraryLoadsInWebContent` exempts only WKWebView, not native `URLSession`. `NSAllowsLocalNetworking` does NOT cover Tailscale/CGNAT `100.64.0.0/10` — use `NSAllowsArbitraryLoads` if the app connects over Tailscale.
- **Building a native fetch bridge when the server cooperates:** Before writing URLSession plumbing, confirm the server cannot be made to send `Access-Control-Allow-Origin` for the webview origin. A native bridge is a last resort and MUST support a streaming `response.body`, or SSE/token-streaming silently breaks ("No body in SSE response").
- **opencode logs don't show HTTP requests:** `~/.local/share/opencode/log/opencode.log` records agent/permission activity, not HTTP access lines — you cannot confirm request-arrival from it. Use the raw-TCP probe.

## Evidence

- anemos iOS app threw `fetch threw: Load failed` connecting to `http://<lan-ip>:42447`; the upstream WhisperCode app connected to the identical server fine.
- Raw-TCP probe (`net.createConnection`) of `GET /global/health` returned `200 {"healthy":true,"version":"1.18.8"}` — server healthy.
- Probing with `Origin: tauri://localhost` → server returned `Access-Control-Allow-Origin: tauri://localhost`; with `Origin: app-local://localhost` → header ABSENT. Confirmed CORS root cause and the default whitelist.
- Fix: switched the anemos webview scheme `app-local` → `tauri` (`BridgeController.swift`) and matched WhisperCode's ATS config. User confirmed: "Whatever you just did, it worked."
- User corrected the ATS-first hypothesis ("our other project with the exact same setup makes HTTP requests fine") and directed study of WhisperCode — both steered toward the origin/CORS answer.

## Verification Checklist

- [ ] Raw-TCP probe of the server's health endpoint returns 200 with a valid body.
- [ ] Probe WITH `Origin: <webview-origin>` shows whether `Access-Control-Allow-Origin` is present and matches.
- [ ] Webview content scheme (`setURLSchemeHandler` + start-page URL) matches a server-whitelisted origin.
- [ ] After the scheme change, the app connects AND streams (SSE/token streaming works — proving `response.body` isn't broken).
- [ ] `Info.plist` ATS config permits plain-HTTP to the target host class (LAN/Tailscale) when non-loopback HTTP is used.
