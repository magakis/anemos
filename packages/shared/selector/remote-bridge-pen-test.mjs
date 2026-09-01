import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const isLocalOrigin = (value) => {
  try {
    const url = new URL(value);
    return (url.protocol === "tauri:" && url.hostname === "localhost")
      || (url.protocol === "http:" && url.hostname === "tauri.localhost");
  } catch {
    return false;
  }
};

const localOrigins = ["tauri://localhost/selector.html", "http://tauri.localhost/selector.html"];
const remoteOrigins = [
  "https://chamber.example/",
  "http://192.168.1.20:4096/",
  "http://tauri.localhost.example/",
  "tauri://evil/",
];

for (const origin of localOrigins) assert.equal(isLocalOrigin(origin), true, `expected local: ${origin}`);
for (const origin of remoteOrigins) assert.equal(isLocalOrigin(origin), false, `expected remote: ${origin}`);

const page = read("packages/shared/selector/remote-bridge-pen-test.html");
const bridgeController = read("packages/ios/OpenCode/WebView/BridgeController.swift");
const androidBridge = read("packages/android/src-tauri/mobile-bridge/android/src/main/java/MobileBridgePlugin.kt");
const capabilities = JSON.parse(read("packages/android/src-tauri/capabilities/default.json"));

for (const method of [
  "openLink",
  "notify",
  "haptic",
  "share",
  "selectUI",
  "getSelectedUI",
  "getDefaultServerUrl",
  "getChamberServerUrl",
  "setChamberServerUrl",
  "probeChamberServerUrl",
  "storageGet",
  "storageSet",
  "storageRemove",
  "storageClear",
  "storageKey",
  "storageLength",
]) assert.match(page, new RegExp(`"${method}"`), `missing iOS method in pen-test: ${method}`);

for (const command of [
  "scan_network",
  "cancel_scan",
  "share",
  "select_ui",
  "get_selected_ui",
  "get_default_server_url",
  "set_default_server_url",
  "get_chamber_server_url",
  "set_chamber_server_url",
  "probe_chamber_server_url",
  "register_listener",
  "remove_listener",
  "check_permissions",
  "request_permissions",
]) assert.match(page, new RegExp(`"${command}"`), `missing Android method in pen-test: ${command}`);

assert.match(bridgeController, /guard isLocalOrigin\(message\.frameInfo\.securityOrigin\) else \{ return \}/);
assert.match(bridgeController, /guard isLocalPage\(webView\.url\) else \{ return \}/);
assert.match(androidBridge, /private fun rejectRemote\(invoke: Invoke\)/);
assert.match(androidBridge, /if \(rejectRemote\(invoke\)\) return/);
assert.equal(capabilities.remote, undefined, "Android capability must not grant remote URLs");

console.log("PASS: origin policy accepts only tauri://localhost and http://tauri.localhost");
console.log("PASS: pen-test page enumerates iOS handler, Android mobile-bridge, and official plugin calls");
console.log("PASS: native source guards and local-only Android capability are present");
