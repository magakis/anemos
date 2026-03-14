import { createSimpleContext } from "@opencode-ai/ui/context"
import type { AsyncStorage, SyncStorage } from "@solid-primitives/storage"
import type { Accessor } from "solid-js"

type PickerPaths = string | string[] | null
type OpenDirectoryPickerOptions = { title?: string; multiple?: boolean }
type OpenFilePickerOptions = { title?: string; multiple?: boolean }
type SaveFilePickerOptions = { title?: string; defaultPath?: string }
type UpdateInfo = { updateAvailable: boolean; version?: string }
export type PushKind = "complete" | "error" | "approval" | "question" | "test"
export type PushPerm = "unsupported" | "not-determined" | "denied" | "authorized" | "provisional" | "ephemeral"
export type PushCred = {
  channel: string
  device?: string
  secret?: string
}
export type PairState = "pending" | "claimed" | "active" | "expired" | "failed"
export type PairInfo = {
  id: string
  status: PairState
  command?: string
  expires?: string
  channel?: string
  device?: string
  message?: string
}
export type PushPrefs = {
  complete: boolean
  approval: boolean
  question: boolean
  error: boolean
}
export type PushState = {
  supported: boolean
  permission: PushPerm
  allowed: boolean
  registered: boolean
  paired: boolean
  generic: boolean
  channel?: string
}
export type NotifyOpts = {
  kind?: PushKind
  generic?: boolean
}
export type VoiceState = "prewarming" | "ready" | "recording" | "processing" | "error"
export type VoiceStatus = {
  state: VoiceState
  ready: boolean
  message?: string
}
export type VoiceStartResult = {
  ok: boolean
  code?: string
  message?: string
}
export type VoiceStopResult = {
  text: string
  code?: string
  message?: string
}

export type Platform = {
  /** Platform discriminator */
  platform: "web" | "desktop" | "ios" | "android"

  /** Desktop OS (Tauri only) */
  os?: "macos" | "windows" | "linux" | "ios" | "android"

  /** App version */
  version?: string

  /** Open a URL in the default browser */
  openLink(url: string): void

  /** Open a local path in a local app (desktop only) */
  openPath?(path: string, app?: string): Promise<void>

  /** Restart the app  */
  restart(): Promise<void>

  /** Navigate back in history */
  back(): void

  /** Navigate forward in history */
  forward(): void

  /** Send a system notification (optional deep link) */
  notify(title: string, description?: string, href?: string, opts?: NotifyOpts): Promise<void>

  /** Open directory picker dialog (native on Tauri, server-backed on web) */
  openDirectoryPickerDialog?(opts?: OpenDirectoryPickerOptions): Promise<PickerPaths>

  /** Open native file picker dialog (Tauri only) */
  openFilePickerDialog?(opts?: OpenFilePickerOptions): Promise<PickerPaths>

  /** Save file picker dialog (Tauri only) */
  saveFilePickerDialog?(opts?: SaveFilePickerOptions): Promise<string | null>

  /** Storage mechanism, defaults to localStorage */
  storage?: (name?: string) => SyncStorage | AsyncStorage

  /** Current push notification state (optional native platforms) */
  pushState?: Accessor<PushState | undefined>

  /** Read push notification state (optional native platforms) */
  getPushState?(): Promise<PushState>

  /** Request push notification permission (optional native platforms) */
  requestPushPermission?(): Promise<PushState>

  /** Open the platform system settings app (optional native platforms) */
  openSystemSettings?(): Promise<void>

  /** Schedule a test push notification (optional native platforms) */
  testPush?(href?: string): Promise<boolean>

  /** Begin the hosted push pairing flow (optional native platforms) */
  beginPushPairing?(): Promise<PairInfo>

  /** Poll the hosted push pairing flow (optional native platforms) */
  getPushPairing?(): Promise<PairInfo | undefined>

  /** Update relay-backed push delivery preferences (optional native platforms) */
  setPushPreferences?(prefs: PushPrefs): Promise<void>

  /** Update the relay URL used by native push flows (optional native platforms) */
  setPushRelayURL?(url?: string): Promise<void>

  /** Store paired push credentials (optional native platforms) */
  setPushCredentials?(input: PushCred): Promise<PushState>

  /** Clear paired push credentials (optional native platforms) */
  clearPushPairing?(): Promise<PushState>

  /** Check for updates (Tauri only) */
  checkUpdate?(): Promise<UpdateInfo>

  /** Install updates (Tauri only) */
  update?(): Promise<void>

  /** Fetch override */
  fetch?: typeof fetch

  /** Get the configured default server URL (platform-specific) */
  getDefaultServerUrl?(): Promise<string | null>

  /** Set the default server URL to use on app startup (platform-specific) */
  setDefaultServerUrl?(url: string | null): Promise<void> | void

  /** Get the configured WSL integration (desktop only) */
  getWslEnabled?(): Promise<boolean>

  /** Set the configured WSL integration (desktop only) */
  setWslEnabled?(config: boolean): Promise<void> | void

  /** Get the preferred display backend (desktop only) */
  getDisplayBackend?(): Promise<DisplayBackend | null> | DisplayBackend | null

  /** Set the preferred display backend (desktop only) */
  setDisplayBackend?(backend: DisplayBackend): Promise<void>

  /** Parse markdown to HTML using native parser (desktop only, returns unprocessed code blocks) */
  parseMarkdown?(markdown: string): Promise<string>

  /** Webview zoom level (desktop only) */
  webviewZoom?: Accessor<number>

  /** Check if an editor app exists (desktop only) */
  checkAppExists?(appName: string): Promise<boolean>

  /** Read image from clipboard (desktop only) */
  readClipboardImage?(): Promise<File | null>

  /** Start voice input (mobile only) */
  startVoiceInput?(): Promise<VoiceStartResult> | VoiceStartResult

  /** Stop voice input and return transcription (mobile only) */
  stopVoiceInput?(): Promise<VoiceStopResult> | VoiceStopResult

  /** Current voice input status (mobile only) */
  voiceStatus?: Accessor<VoiceStatus>

  /** Haptic feedback (mobile only) */
  haptic?(style: "light" | "medium" | "heavy" | "success" | "warning" | "error"): void

  /** Share content (mobile only) */
  share?(data: { text?: string; url?: string }): Promise<boolean>
}

export type DisplayBackend = "auto" | "wayland"

export const { use: usePlatform, provider: PlatformProvider } = createSimpleContext({
  name: "Platform",
  init: (props: { value: Platform }) => {
    return props.value
  },
})
