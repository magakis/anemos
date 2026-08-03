// @refresh reload
import { render } from "solid-js/web"
import { createResource, createSignal, onCleanup, onMount, Show } from "solid-js"
import { AppBaseProviders, AppInterface, PlatformProvider, ServerConnection, type NotifyOpts, type Platform, type VoiceStartResult, type VoiceStopResult } from "@opencode-ai/app"
import { bridge } from "./bridge"
import { createBridgeStorage } from "./ios-storage"
import { Onboarding } from "./onboarding"
import { VoiceInputOverlay } from "./voice-input"
import pkg from "../package.json"

const DEFAULT_SERVER_URL_KEY = "defaultServerUrl"
const DEFAULT_SERVER_DISPLAY_NAME_KEY = "defaultServerDisplayName"
const DEFAULT_SERVER_USERNAME_KEY = "defaultServerUsername"
const DEFAULT_SERVER_PASSWORD_KEY = "defaultServerPassword"
const settingsStore = createBridgeStorage("settings.dat")

type ServerConfig = { url: string; displayName?: string; username?: string; password?: string }

const normalizeServerUrl = (input: string) => {
  const trimmed = input.trim()
  if (!trimmed) return
  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`
  return withProtocol.replace(/\/+$/, "")
}

const getDefaultServerConfig = async (): Promise<ServerConfig | null> => {
  const url = await settingsStore.getItem(DEFAULT_SERVER_URL_KEY).catch(() => null)
  if (typeof url !== "string") return null
  const displayName = await settingsStore.getItem(DEFAULT_SERVER_DISPLAY_NAME_KEY).catch(() => null)
  const username = await settingsStore.getItem(DEFAULT_SERVER_USERNAME_KEY).catch(() => null)
  const password = await settingsStore.getItem(DEFAULT_SERVER_PASSWORD_KEY).catch(() => null)
  return {
    url,
    displayName: typeof displayName === "string" ? displayName : undefined,
    username: typeof username === "string" ? username : undefined,
    password: typeof password === "string" ? password : undefined,
  }
}

const setDefaultServerConfig = async (config: ServerConfig | null) => {
  if (config) {
    await settingsStore.setItem(DEFAULT_SERVER_URL_KEY, config.url).catch(() => undefined)
    if (config.displayName)
      await settingsStore.setItem(DEFAULT_SERVER_DISPLAY_NAME_KEY, config.displayName).catch(() => undefined)
    else await settingsStore.removeItem(DEFAULT_SERVER_DISPLAY_NAME_KEY).catch(() => undefined)
    if (config.username)
      await settingsStore.setItem(DEFAULT_SERVER_USERNAME_KEY, config.username).catch(() => undefined)
    else await settingsStore.removeItem(DEFAULT_SERVER_USERNAME_KEY).catch(() => undefined)
    if (config.password)
      await settingsStore.setItem(DEFAULT_SERVER_PASSWORD_KEY, config.password).catch(() => undefined)
    else await settingsStore.removeItem(DEFAULT_SERVER_PASSWORD_KEY).catch(() => undefined)
  } else {
    await settingsStore.removeItem(DEFAULT_SERVER_URL_KEY).catch(() => undefined)
    await settingsStore.removeItem(DEFAULT_SERVER_DISPLAY_NAME_KEY).catch(() => undefined)
    await settingsStore.removeItem(DEFAULT_SERVER_USERNAME_KEY).catch(() => undefined)
    await settingsStore.removeItem(DEFAULT_SERVER_PASSWORD_KEY).catch(() => undefined)
  }
}

const getDefaultServerUrl = async () => {
  const config = await getDefaultServerConfig()
  return config?.url ? ServerConnection.Key.make(config.url) : null
}

const setDefaultServerUrl = async (url: ServerConnection.Key | null) => {
  if (url) {
    await setDefaultServerConfig({ url })
  } else {
    await setDefaultServerConfig(null)
  }
}

const root = document.getElementById("root")
if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error("Root element not found")
}

const App = () => {
  const [recording, setRecording] = createSignal(false)

  const emitTranscription = (text: string, isFinal?: boolean) => {
    if (!text) return
    window.dispatchEvent(new CustomEvent("opencode:transcription", { detail: { text, isFinal } }))
  }

  const emitResume = () => {
    window.dispatchEvent(new Event("opencode:resume"))
  }

  const startVoiceInput = () => {
    setRecording(true)
    bridge.send("startRecording")
    return { ok: true } satisfies VoiceStartResult
  }

  const stopVoiceInput = async () => {
    const text = await bridge.sendAsync<string>("stopRecording")
    setRecording(false)
    if (text) emitTranscription(text, true)
    return { text: text ?? "" } satisfies VoiceStopResult
  }

  // SIDELOAD: push methods intentionally omitted — free Apple ID has no APNS. Re-enable via native bridge in the paid Apple Developer Program build.
  const platform: Platform = {
    platform: "ios",
    os: "ios",
    version: pkg.version,
    openExternal: (url: string) => bridge.send("openLink", { url }),
    openLink: (url: string) => bridge.send("openLink", { url }),
    notify: async (title: string, description?: string, opts?: NotifyOpts) => {
      await bridge.sendAsync("notify", { title, description, href: opts?.href })
    },
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    restart: async () => window.location.reload(),
    startVoiceInput,
    stopVoiceInput,
    haptic: (style: "light" | "medium" | "heavy" | "success" | "warning" | "error") => {
      bridge.send("haptic", { style })
    },
    share: async (data: { text?: string; url?: string }) => {
      const result = await bridge.sendAsync<boolean>("share", data)
      return result ?? false
    },
    getDefaultServer: getDefaultServerUrl,
    setDefaultServer: setDefaultServerUrl,
    storage: (name?: string) => createBridgeStorage(name),
  }

  const [defaultConfig] = createResource(getDefaultServerConfig)

  const [completedConfig, setCompletedConfig] = createSignal<ServerConfig | null>(null)

  const handleOnboardingComplete = async (server: {
    url: string
    displayName?: string
    username?: string
    password?: string
  }) => {
    const normalized = normalizeServerUrl(server.url)
    if (!normalized) return
    const config: ServerConfig = {
      url: normalized,
      displayName: server.displayName,
      username: server.username,
      password: server.password,
    }
    await setDefaultServerConfig(config)
    setCompletedConfig(config)
  }

  onMount(() => {
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest("a.external-link") as HTMLAnchorElement | null
      if (!link?.href) return
      event.preventDefault()
      platform.openLink(link.href)
    }

    const stopListening = bridge.on("transcription", (payload) => {
      if (!payload || typeof payload !== "object") return
      const detail = payload as { text?: string; isFinal?: boolean }
      if (typeof detail.text !== "string") return
      emitTranscription(detail.text, detail.isFinal)
    })

    const stopKeyboardNav = bridge.on("keyboardNavigation", (payload) => {
      if (!payload || typeof payload !== "object") return
      const { direction } = payload as { direction?: string }
      if (direction !== "up" && direction !== "down") return
      const key = direction === "up" ? "ArrowUp" : "ArrowDown"
      document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }))
    })

    const stopKeyboardClear = bridge.on("keyboardClear", () => {
      const el = document.activeElement
      if (!el || !(el instanceof HTMLElement) || !el.isContentEditable) return
      el.focus()
      document.execCommand("selectAll")
      document.execCommand("delete")
    })

    const stopKeyboardNewline = bridge.on("keyboardNewline", () => {
      const el = document.activeElement
      if (!el || !(el instanceof HTMLElement) || !el.isContentEditable) return
      document.execCommand("insertLineBreak")
    })

    const onFocus = () => emitResume()
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      emitResume()
    }

    document.addEventListener("click", handleClick)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisible)
    onCleanup(() => {
      document.removeEventListener("click", handleClick)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisible)
      stopListening()
      stopKeyboardNav()
      stopKeyboardClear()
      stopKeyboardNewline()
    })
  })

  return (
    <PlatformProvider value={platform}>
      <AppBaseProviders>
        <VoiceInputOverlay active={recording} onStop={() => void stopVoiceInput()} />
        <Show when={!defaultConfig.loading}>
          <Show
            when={defaultConfig() || completedConfig()}
            fallback={<Onboarding onComplete={handleOnboardingComplete} platform={platform} />}
          >
            <AppInterface
              {...(() => {
                const config = (defaultConfig() || completedConfig())!
                const conn: ServerConnection.Http = {
                  type: "http",
                  displayName: config.displayName,
                  http: { url: config.url, username: config.username, password: config.password },
                }
                return {
                  defaultServer: ServerConnection.key(conn),
                  canonicalLocalServer: ServerConnection.key(conn),
                  servers: [conn],
                }
              })()}
            />
          </Show>
        </Show>
      </AppBaseProviders>
    </PlatformProvider>
  )
}

if (root instanceof HTMLElement) {
  render(() => <App />, root)
}
