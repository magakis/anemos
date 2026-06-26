import { createSimpleContext } from "@opencode-ai/ui/context"
import type { AsyncStorage, SyncStorage } from "@solid-primitives/storage"
import type { Accessor } from "solid-js"
import { ServerConnection } from "./server"

// UPSTREAM-DIVERGENCE-FILE: This platform contract is extended by the fork's iOS/Android wrappers.
// When merging upstream platform changes, preserve the push pairing, relay, and notification metadata
// additions introduced after upstream sync 6b9ce5e63.

// UPSTREAM-DIVERGENCE: These exported types are consumed across packages/app, packages/ios, and
// packages/android to keep push notification permission, pairing, and relay state aligned.
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
  token?: string
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
export type PushDiag = {
  token?: boolean
  tokenPending?: boolean
  relay?: string
  device?: string
  pairID?: string
  pairStatus?: PairState
  pairExpires?: string
  lastCode?: string
  lastError?: string
}
export type PushState = {
  supported: boolean
  permission: PushPerm
  allowed: boolean
  registered: boolean
  paired: boolean
  generic: boolean
  channel?: string
  diag?: PushDiag
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

  /** Restart the app  */
  restart(): Promise<void>

  /** Navigate back in history */
  back(): void

  /** Navigate forward in history */
  forward(): void

  /** UPSTREAM-DIVERGENCE: Fork mobile builds attach notification kind metadata so native bridges can
      choose generic push payloads while the web implementation safely ignores the extra options. */
  notify(title: string, description?: string, href?: string, opts?: NotifyOpts): Promise<void>

  /** Storage mechanism, defaults to localStorage */
  storage?: (name?: string) => SyncStorage | AsyncStorage

  /** UPSTREAM-DIVERGENCE: Fork-only push methods keep the shared app package aware of native mobile
      permission, relay, and pairing state. Preserve this surface when reconciling upstream changes. */
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

  /** Fetch override */
  fetch?: typeof fetch

  /** Get the configured default server URL (platform-specific) */
  getDefaultServer?(): Promise<ServerConnection.Key | null>

  /** Set the default server URL to use on app startup (platform-specific) */
  setDefaultServer?(url: ServerConnection.Key | null): Promise<void> | void

  /** Start voice input (mobile only) */
  startVoiceInput?(): Promise<VoiceStartResult> | VoiceStartResult

  /** Stop voice input and return transcription (mobile only) */
  stopVoiceInput?(): Promise<VoiceStopResult> | VoiceStopResult

  /** Current voice input status (mobile only) */
  voiceStatus?: Accessor<VoiceStatus>

  /** List supported speech locales (mobile only) */
  getSpeechLocales?(): Promise<string[]>

  /** Set active speech locale and return the applied locale (mobile only) */
  setSpeechLocale?(locale: string): Promise<string> | string

  /** Haptic feedback (mobile only) */
  haptic?(style: "light" | "medium" | "heavy" | "success" | "warning" | "error"): void

  /** Share content (mobile only) */
  share?(data: { text?: string; url?: string }): Promise<boolean>
}

export const { use: usePlatform, provider: PlatformProvider } = createSimpleContext({
  name: "Platform",
  init: (props: { value: Platform }) => {
    return props.value
  },
})
