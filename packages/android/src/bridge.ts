import { addPluginListener, invoke } from "@tauri-apps/api/core"

declare global {
  interface Window {
    __ANEMOS_SHELL__?: "ios" | "android" | "web"
  }
}

// ANEMOS-PATCH: mark only the local Tauri page so the native shell identity
// cannot leak into a remote Chamber Full server.
if (typeof window !== "undefined"
  && window.location.protocol === "http:"
  && window.location.host === "tauri.localhost") {
  window.__ANEMOS_SHELL__ = "android"
}

const commands = {
  scanNetwork: "scan_network",
  cancelScan: "cancel_scan",
  share: "share",
  openLink: "open_link",
  notify: "notify",
  haptic: "haptic",
  readLegacySettings: "read_legacy_settings",
  selectUI: "select_ui",
  getSelectedUI: "get_selected_ui",
  getDefaultServerUrl: "get_default_server_url",
  setDefaultServerUrl: "set_default_server_url",
} as const

const resolve = (method: string) => {
  if (method in commands) return commands[method as keyof typeof commands]
}

export const bridge = {
  available: () => true,
  send: (method: string, params?: unknown) => {
    void bridge.sendAsync(method, params)
  },
  sendAsync: <T = unknown>(method: string, params?: unknown) => {
    const command = resolve(method)
    if (!command) return Promise.resolve(null)
    return invoke<T>(`plugin:mobile-bridge|${command}`, params as Record<string, unknown>)
      .then((value) => value ?? null)
      .catch(() => null)
  },
  on: (type: string, handler: (payload: unknown) => void) => {
    let active = true
    let listener: { unregister: () => Promise<void> } | null = null

    void addPluginListener("mobile-bridge", type, (payload) => {
      if (!active) return
      handler(payload)
    })
      .then((value) => {
        if (active) {
          listener = value
          return
        }
        void value.unregister().catch(() => undefined)
      })
      .catch(() => undefined)

    return () => {
      active = false
      if (!listener) return
      void listener.unregister().catch(() => undefined)
    }
  },
}
