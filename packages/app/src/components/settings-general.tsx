import { Component, Show, createEffect, createMemo, createResource, onCleanup, type JSX } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { Select } from "@opencode-ai/ui/select"
import { Switch } from "@opencode-ai/ui/switch"
import { TextField } from "@opencode-ai/ui/text-field"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useTheme, type ColorScheme } from "@opencode-ai/ui/theme"
import { showToast } from "@opencode-ai/ui/toast"
import { useGlobalSync } from "@/context/global-sync"
import { useLanguage } from "@/context/language"
import { usePlatform, type PairInfo, type PairState, type PushState } from "@/context/platform"
import { usePushRelay } from "@/context/push-relay"
import { useSettings, monoFontFamily } from "@/context/settings"
import { addPush, dropPush, hasPush, installPush } from "@/utils/push-plugin"
import { Persist, persisted } from "@/utils/persist"
import { playSound, SOUND_OPTIONS } from "@/utils/sound"
import { Link } from "./link"

let demoSoundState = {
  cleanup: undefined as (() => void) | undefined,
  timeout: undefined as NodeJS.Timeout | undefined,
}

// To prevent audio from overlapping/playing very quickly when navigating the settings menus,
// delay the playback by 100ms during quick selection changes and pause existing sounds.
const stopDemoSound = () => {
  if (demoSoundState.cleanup) {
    demoSoundState.cleanup()
  }
  clearTimeout(demoSoundState.timeout)
  demoSoundState.cleanup = undefined
}

const playDemoSound = (src: string | undefined) => {
  stopDemoSound()
  if (!src) return

  demoSoundState.timeout = setTimeout(() => {
    demoSoundState.cleanup = playSound(src)
  }, 100)
}

type PushAction = {
  label: string
  disabled: boolean
  run?: () => Promise<void>
}

export const SettingsGeneral: Component = () => {
  const theme = useTheme()
  const language = useLanguage()
  const platform = usePlatform()
  const relay = usePushRelay()
  const settings = useSettings()
  const sync = useGlobalSync()

  const [store, setStore] = createStore({
    checking: false,
    asking: false,
    testing: false,
    clearing: false,
    pairing: false,
    installing: false,
    copying: false,
    removing: false,
  })
  const [pair, setPair, , pairReady] = persisted(
    Persist.global("push.pair", ["push.pair.v1"]),
    createStore({
      id: undefined as string | undefined,
      status: undefined as PairState | undefined,
      command: undefined as string | undefined,
      expires: undefined as string | undefined,
      channel: undefined as string | undefined,
      device: undefined as string | undefined,
      message: undefined as string | undefined,
      updated: 0,
    }),
  )

  const linux = createMemo(() => platform.platform === "desktop" && platform.os === "linux")
  const push = createMemo(() => platform.pushState?.())
  const installed = createMemo(() => hasPush(sync.data.config.plugin))
  const updating = createMemo(() => sync.data.reload === "pending")

  const pushDesc = (value?: PushState) => {
    if (!value) return language.t("settings.general.notifications.push.permission.pending")
    if (value.allowed && !value.registered) {
      return language.t("settings.general.notifications.push.permission.registering")
    }
    switch (value.permission) {
      case "authorized":
        return language.t("settings.general.notifications.push.permission.authorized")
      case "provisional":
        return language.t("settings.general.notifications.push.permission.provisional")
      case "ephemeral":
        return language.t("settings.general.notifications.push.permission.ephemeral")
      case "denied":
        return language.t("settings.general.notifications.push.permission.denied")
      case "unsupported":
        return language.t("settings.general.notifications.push.permission.unsupported")
      default:
        return language.t("settings.general.notifications.push.permission.notDetermined")
    }
  }

  const askPush = async () => {
    if (!platform.requestPushPermission) return
    setStore("asking", true)
    await platform
      .requestPushPermission()
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setStore("asking", false))
  }

  const openPush = async () => {
    if (!platform.openSystemSettings) return
    setStore("asking", true)
    await platform
      .openSystemSettings()
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setStore("asking", false))
  }

  const testPush = async () => {
    if (!platform.testPush) return
    setStore("testing", true)
    await platform
      .testPush(window.location.pathname + window.location.search + window.location.hash)
      .then((ok) => {
        if (!ok) {
          showToast({
            title: language.t("settings.general.notifications.push.toast.failed.title"),
            description: language.t("settings.general.notifications.push.toast.failed.description"),
            variant: "error",
          })
          return
        }
        showToast({
          title: language.t("settings.general.notifications.push.toast.sent.title"),
          description: language.t("settings.general.notifications.push.toast.sent.description"),
          variant: "success",
        })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setStore("testing", false))
  }

  const setPairInfo = (value?: PairInfo) => {
    setPair({
      id: value?.id,
      status: value?.status,
      command: value?.command,
      expires: value?.expires,
      channel: value?.channel,
      device: value?.device,
      message: value?.message,
      updated: value ? Date.now() : 0,
    })
  }

  const startPair = async () => {
    if (!platform.beginPushPairing || store.pairing) return
    setStore("pairing", true)
    await platform
      .beginPushPairing()
      .then((value) => {
        setPairInfo(value)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setStore("pairing", false))
  }

  const clearPair = async () => {
    if (!platform.clearPushPairing) return
    setStore("clearing", true)
    await platform
      .clearPushPairing()
      .then(() => {
        showToast({
          title: language.t("settings.general.notifications.push.pairing.toast.cleared.title"),
          description: language.t("settings.general.notifications.push.pairing.toast.cleared.description"),
          variant: "success",
        })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setStore("clearing", false))
  }

  const installHost = async () => {
    setStore("installing", true)
    await sync
      .updateConfig({ plugin: addPush(sync.data.config.plugin) })
      .then(() => {
        showToast({
          title: language.t("settings.general.notifications.push.host.toast.installed.title"),
          description: language.t("settings.general.notifications.push.host.toast.installed.description"),
          variant: "success",
        })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setStore("installing", false))
  }

  const copyHost = async () => {
    const clip = typeof navigator === "undefined" ? undefined : navigator.clipboard
    if (!clip?.writeText) {
      showToast({
        title: language.t("settings.general.notifications.push.host.toast.copyFailed.title"),
        description: language.t("settings.general.notifications.push.host.toast.copyFailed.description"),
        variant: "error",
      })
      return
    }
    setStore("copying", true)
    await clip
      .writeText(pair.command ?? installPush())
      .then(() => {
        showToast({
          title: language.t("settings.general.notifications.push.host.toast.copied.title"),
          description: language.t("settings.general.notifications.push.host.toast.copied.description"),
          variant: "success",
        })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setStore("copying", false))
  }

  const removeHost = async () => {
    setStore("removing", true)
    await sync
      .updateConfig({ plugin: dropPush(sync.data.config.plugin) })
      .then(() => {
        showToast({
          title: language.t("settings.general.notifications.push.host.toast.removed.title"),
          description: language.t("settings.general.notifications.push.host.toast.removed.description"),
          variant: "success",
        })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setStore("removing", false))
  }

  const hostDesc = createMemo(() => {
    if (updating()) return language.t("settings.general.notifications.push.host.description.updating")
    if (installed()) return language.t("settings.general.notifications.push.host.description.installed")
    return language.t("settings.general.notifications.push.host.description.missing")
  })

  const relayDesc = createMemo(() => {
    if (relay.custom()) {
      return language.t("settings.general.notifications.push.relay.description.custom", {
        url: relay.current() ?? relay.custom() ?? "",
      })
    }
    if (relay.guess()) {
      return language.t("settings.general.notifications.push.relay.description.guess", {
        url: relay.guess() ?? "",
      })
    }
    return language.t("settings.general.notifications.push.relay.description.empty")
  })

  const pairDesc = createMemo(() => {
    const value = push()
    if (store.pairing || !pairReady()) return language.t("home.push.install.status.preparing")
    if (!value) return language.t("settings.general.notifications.push.pairing.pending")
    if (value.paired) return language.t("settings.general.notifications.push.pairing.paired")
    if (pair.status === "claimed") return language.t("home.push.install.status.claimed")
    if (pair.status === "expired") return language.t("home.push.install.status.expired")
    if (pair.status === "failed") return pair.message || language.t("home.push.install.status.failed")
    if (pair.command) return language.t("home.push.install.status.pending")
    return language.t("settings.general.notifications.push.pairing.unpaired")
  })

  createEffect(() => {
    if (push()?.paired) {
      setPairInfo({
        id: pair.id ?? "active",
        status: "active",
        channel: push()?.channel,
        device: pair.device,
      })
      return
    }
    if (pair.status !== "active") return
    setPairInfo()
  })

  createEffect(() => {
    if (!platform.getPushPairing || !pair.id || push()?.paired) return
    if (pair.status !== "pending" && pair.status !== "claimed") return

    let active = true
    const tick = async () => {
      if (!active) return
      await platform
        .getPushPairing?.()
        .then((value) => {
          if (!active || !value) return
          setPairInfo(value)
          if (value.status === "active") {
            void platform.getPushState?.()
          }
        })
        .catch(() => undefined)
    }

    void tick()
    const timer = window.setInterval(() => {
      void tick()
    }, 3000)
    onCleanup(() => {
      active = false
      window.clearInterval(timer)
    })
  })

  const pushAction = createMemo<PushAction>(() => {
    const value = push()
    if (!value) {
      return {
        label: language.t("settings.general.notifications.push.action.checking"),
        disabled: true,
      }
    }
    if (value.permission === "authorized" || value.permission === "provisional" || value.permission === "ephemeral") {
      return {
        label: language.t("settings.general.notifications.push.action.enabled"),
        disabled: true,
      }
    }
    if (value.permission === "denied") {
      return {
        label: language.t("settings.general.notifications.push.action.openSettings"),
        disabled: !platform.openSystemSettings,
        run: openPush,
      }
    }
    if (value.permission === "unsupported") {
      return {
        label: language.t("settings.general.notifications.push.action.unavailable"),
        disabled: true,
      }
    }
    return {
      label: language.t("settings.general.notifications.push.action.enable"),
      disabled: !platform.requestPushPermission,
      run: askPush,
    }
  })

  const check = () => {
    if (!platform.checkUpdate) return
    setStore("checking", true)

    void platform
      .checkUpdate()
      .then((result) => {
        if (!result.updateAvailable) {
          showToast({
            variant: "success",
            icon: "circle-check",
            title: language.t("settings.updates.toast.latest.title"),
            description: language.t("settings.updates.toast.latest.description", { version: platform.version ?? "" }),
          })
          return
        }

        const actions =
          platform.update && platform.restart
            ? [
                {
                  label: language.t("toast.update.action.installRestart"),
                  onClick: async () => {
                    await platform.update!()
                    await platform.restart!()
                  },
                },
                {
                  label: language.t("toast.update.action.notYet"),
                  onClick: "dismiss" as const,
                },
              ]
            : [
                {
                  label: language.t("toast.update.action.notYet"),
                  onClick: "dismiss" as const,
                },
              ]

        showToast({
          persistent: true,
          icon: "download",
          title: language.t("toast.update.title"),
          description: language.t("toast.update.description", { version: result.version ?? "" }),
          actions,
        })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setStore("checking", false))
  }

  const themeOptions = createMemo(() =>
    Object.entries(theme.themes()).map(([id, def]) => ({ id, name: def.name ?? id })),
  )

  const colorSchemeOptions = createMemo((): { value: ColorScheme; label: string }[] => [
    { value: "system", label: language.t("theme.scheme.system") },
    { value: "light", label: language.t("theme.scheme.light") },
    { value: "dark", label: language.t("theme.scheme.dark") },
  ])

  const languageOptions = createMemo(() =>
    language.locales.map((locale) => ({
      value: locale,
      label: language.label(locale),
    })),
  )

  const fontOptions = [
    { value: "ibm-plex-mono", label: "font.option.ibmPlexMono" },
    { value: "cascadia-code", label: "font.option.cascadiaCode" },
    { value: "fira-code", label: "font.option.firaCode" },
    { value: "hack", label: "font.option.hack" },
    { value: "inconsolata", label: "font.option.inconsolata" },
    { value: "intel-one-mono", label: "font.option.intelOneMono" },
    { value: "iosevka", label: "font.option.iosevka" },
    { value: "jetbrains-mono", label: "font.option.jetbrainsMono" },
    { value: "meslo-lgs", label: "font.option.mesloLgs" },
    { value: "roboto-mono", label: "font.option.robotoMono" },
    { value: "source-code-pro", label: "font.option.sourceCodePro" },
    { value: "ubuntu-mono", label: "font.option.ubuntuMono" },
    { value: "geist-mono", label: "font.option.geistMono" },
  ] as const
  const fontOptionsList = [...fontOptions]

  const noneSound = { id: "none", label: "sound.option.none", src: undefined } as const
  const soundOptions = [noneSound, ...SOUND_OPTIONS]

  const soundSelectProps = (
    enabled: () => boolean,
    current: () => string,
    setEnabled: (value: boolean) => void,
    set: (id: string) => void,
  ) => ({
    options: soundOptions,
    current: enabled() ? (soundOptions.find((o) => o.id === current()) ?? noneSound) : noneSound,
    value: (o: (typeof soundOptions)[number]) => o.id,
    label: (o: (typeof soundOptions)[number]) => language.t(o.label),
    onHighlight: (option: (typeof soundOptions)[number] | undefined) => {
      if (!option) return
      playDemoSound(option.src)
    },
    onSelect: (option: (typeof soundOptions)[number] | undefined) => {
      if (!option) return
      if (option.id === "none") {
        setEnabled(false)
        stopDemoSound()
        return
      }
      setEnabled(true)
      set(option.id)
      playDemoSound(option.src)
    },
    variant: "secondary" as const,
    size: "small" as const,
    triggerVariant: "settings" as const,
  })

  const AppearanceSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.appearance")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.general.row.language.title")}
          description={language.t("settings.general.row.language.description")}
        >
          <Select
            data-action="settings-language"
            options={languageOptions()}
            current={languageOptions().find((o) => o.value === language.locale())}
            value={(o) => o.value}
            label={(o) => o.label}
            onSelect={(option) => option && language.setLocale(option.value)}
            variant="secondary"
            size="small"
            triggerVariant="settings"
          />
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.appearance.title")}
          description={language.t("settings.general.row.appearance.description")}
        >
          <Select
            data-action="settings-color-scheme"
            options={colorSchemeOptions()}
            current={colorSchemeOptions().find((o) => o.value === theme.colorScheme())}
            value={(o) => o.value}
            label={(o) => o.label}
            onSelect={(option) => option && theme.setColorScheme(option.value)}
            onHighlight={(option) => {
              if (!option) return
              theme.previewColorScheme(option.value)
              return () => theme.cancelPreview()
            }}
            variant="secondary"
            size="small"
            triggerVariant="settings"
          />
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.theme.title")}
          description={
            <>
              {language.t("settings.general.row.theme.description")}{" "}
              <Link href="https://opencode.ai/docs/themes/">{language.t("common.learnMore")}</Link>
            </>
          }
        >
          <Select
            data-action="settings-theme"
            options={themeOptions()}
            current={themeOptions().find((o) => o.id === theme.themeId())}
            value={(o) => o.id}
            label={(o) => o.name}
            onSelect={(option) => {
              if (!option) return
              theme.setTheme(option.id)
            }}
            onHighlight={(option) => {
              if (!option) return
              theme.previewTheme(option.id)
              return () => theme.cancelPreview()
            }}
            variant="secondary"
            size="small"
            triggerVariant="settings"
          />
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.font.title")}
          description={language.t("settings.general.row.font.description")}
        >
          <Select
            data-action="settings-font"
            options={fontOptionsList}
            current={fontOptionsList.find((o) => o.value === settings.appearance.font())}
            value={(o) => o.value}
            label={(o) => language.t(o.label)}
            onSelect={(option) => option && settings.appearance.setFont(option.value)}
            variant="secondary"
            size="small"
            triggerVariant="settings"
            triggerStyle={{ "font-family": monoFontFamily(settings.appearance.font()), "min-width": "180px" }}
          >
            {(option) => (
              <span style={{ "font-family": monoFontFamily(option?.value) }}>
                {option ? language.t(option.label) : ""}
              </span>
            )}
          </Select>
        </SettingsRow>
      </div>
    </div>
  )

  const FeedSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.feed")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.general.row.reasoningSummaries.title")}
          description={language.t("settings.general.row.reasoningSummaries.description")}
        >
          <div data-action="settings-feed-reasoning-summaries">
            <Switch
              checked={settings.general.showReasoningSummaries()}
              onChange={(checked) => settings.general.setShowReasoningSummaries(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.shellToolPartsExpanded.title")}
          description={language.t("settings.general.row.shellToolPartsExpanded.description")}
        >
          <div data-action="settings-feed-shell-tool-parts-expanded">
            <Switch
              checked={settings.general.shellToolPartsExpanded()}
              onChange={(checked) => settings.general.setShellToolPartsExpanded(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.editToolPartsExpanded.title")}
          description={language.t("settings.general.row.editToolPartsExpanded.description")}
        >
          <div data-action="settings-feed-edit-tool-parts-expanded">
            <Switch
              checked={settings.general.editToolPartsExpanded()}
              onChange={(checked) => settings.general.setEditToolPartsExpanded(checked)}
            />
          </div>
        </SettingsRow>
      </div>
    </div>
  )

  const NotificationsSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.notifications")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.general.notifications.agent.title")}
          description={language.t("settings.general.notifications.agent.description")}
        >
          <div data-action="settings-notifications-agent">
            <Switch
              checked={settings.notifications.agent()}
              onChange={(checked) => settings.notifications.setAgent(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.notifications.permissions.title")}
          description={language.t("settings.general.notifications.permissions.description")}
        >
          <div data-action="settings-notifications-permissions">
            <Switch
              checked={settings.notifications.permissions()}
              onChange={(checked) => settings.notifications.setPermissions(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.notifications.errors.title")}
          description={language.t("settings.general.notifications.errors.description")}
        >
          <div data-action="settings-notifications-errors">
            <Switch
              checked={settings.notifications.errors()}
              onChange={(checked) => settings.notifications.setErrors(checked)}
            />
          </div>
        </SettingsRow>

        <Show when={platform.platform === "ios" && platform.requestPushPermission}>
          <SettingsRow
            title={language.t("settings.general.notifications.push.permission.title")}
            description={pushDesc(push())}
          >
            <div data-action="settings-push-permission">
              <Button
                size="small"
                variant="secondary"
                disabled={store.asking || pushAction().disabled}
                onClick={() => void pushAction().run?.()}
              >
                {store.asking ? language.t("settings.general.notifications.push.action.checking") : pushAction().label}
              </Button>
            </div>
          </SettingsRow>

          <SettingsRow
            title={language.t("settings.general.notifications.push.generic.title")}
            description={language.t("settings.general.notifications.push.generic.description")}
          >
            <span class="text-12-medium text-text-dimmed">
              {language.t("settings.general.notifications.push.generic.value")}
            </span>
          </SettingsRow>

          <SettingsRow
            title={language.t("settings.general.notifications.push.test.title")}
            description={language.t("settings.general.notifications.push.test.description")}
          >
            <div data-action="settings-push-test">
              <Button
                size="small"
                variant="secondary"
                disabled={store.testing || !platform.testPush || !push()?.allowed}
                onClick={() => void testPush()}
              >
                {store.testing
                  ? language.t("settings.general.notifications.push.action.sending")
                  : language.t("settings.general.notifications.push.action.test")}
              </Button>
            </div>
          </SettingsRow>

          <SettingsRow title={language.t("settings.general.notifications.push.relay.title")} description={relayDesc()}>
            <div class="flex w-full max-w-[460px] items-center justify-end gap-2" data-action="settings-push-relay">
              <TextField
                type="text"
                value={relay.custom() ?? ""}
                placeholder={relay.guess() ?? "http://host:8787"}
                onChange={(value) => relay.set(value)}
                class="w-full min-w-0"
              />
              <Button size="small" variant="secondary" disabled={!relay.custom()} onClick={() => relay.clear()}>
                {language.t("settings.general.notifications.push.relay.action.auto")}
              </Button>
            </div>
          </SettingsRow>

          <SettingsRow title={language.t("settings.general.notifications.push.pairing.title")} description={pairDesc()}>
            <div class="flex flex-wrap items-center justify-end gap-2" data-action="settings-push-pairing">
              <Button
                size="small"
                variant="secondary"
                disabled={store.pairing || !platform.beginPushPairing || !push()?.allowed}
                onClick={() => void startPair()}
              >
                {store.pairing
                  ? language.t("home.push.install.action.preparing")
                  : language.t("settings.general.notifications.push.pairing.action.repair")}
              </Button>
              <Button
                size="small"
                variant="secondary"
                disabled={store.clearing || !platform.clearPushPairing || !push()?.paired}
                onClick={() => void clearPair()}
              >
                {store.clearing
                  ? language.t("settings.general.notifications.push.pairing.action.clearing")
                  : language.t("settings.general.notifications.push.pairing.action.clear")}
              </Button>
            </div>
          </SettingsRow>

          <SettingsRow title={language.t("settings.general.notifications.push.host.title")} description={hostDesc()}>
            <div class="flex flex-wrap items-center justify-end gap-2" data-action="settings-push-host">
              <Button size="small" variant="secondary" disabled={store.copying} onClick={() => void copyHost()}>
                {store.copying
                  ? language.t("settings.general.notifications.push.host.action.copying")
                  : language.t("settings.general.notifications.push.host.action.copy")}
              </Button>
              <Show
                when={installed()}
                fallback={
                  <Button size="small" disabled={store.installing || updating()} onClick={() => void installHost()}>
                    {store.installing || updating()
                      ? language.t("settings.general.notifications.push.host.action.installing")
                      : language.t("settings.general.notifications.push.host.action.install")}
                  </Button>
                }
              >
                <Button
                  size="small"
                  variant="secondary"
                  disabled={store.removing || updating()}
                  onClick={() => void removeHost()}
                >
                  {store.removing || updating()
                    ? language.t("settings.general.notifications.push.host.action.removing")
                    : language.t("settings.general.notifications.push.host.action.remove")}
                </Button>
              </Show>
            </div>
          </SettingsRow>
        </Show>
      </div>
    </div>
  )

  const SoundsSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.sounds")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.general.sounds.agent.title")}
          description={language.t("settings.general.sounds.agent.description")}
        >
          <Select
            data-action="settings-sounds-agent"
            {...soundSelectProps(
              () => settings.sounds.agentEnabled(),
              () => settings.sounds.agent(),
              (value) => settings.sounds.setAgentEnabled(value),
              (id) => settings.sounds.setAgent(id),
            )}
          />
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.sounds.permissions.title")}
          description={language.t("settings.general.sounds.permissions.description")}
        >
          <Select
            data-action="settings-sounds-permissions"
            {...soundSelectProps(
              () => settings.sounds.permissionsEnabled(),
              () => settings.sounds.permissions(),
              (value) => settings.sounds.setPermissionsEnabled(value),
              (id) => settings.sounds.setPermissions(id),
            )}
          />
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.sounds.errors.title")}
          description={language.t("settings.general.sounds.errors.description")}
        >
          <Select
            data-action="settings-sounds-errors"
            {...soundSelectProps(
              () => settings.sounds.errorsEnabled(),
              () => settings.sounds.errors(),
              (value) => settings.sounds.setErrorsEnabled(value),
              (id) => settings.sounds.setErrors(id),
            )}
          />
        </SettingsRow>
      </div>
    </div>
  )

  const UpdatesSection = () => (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.updates")}</h3>

      <div class="bg-surface-raised-base px-4 rounded-lg">
        <SettingsRow
          title={language.t("settings.updates.row.startup.title")}
          description={language.t("settings.updates.row.startup.description")}
        >
          <div data-action="settings-updates-startup">
            <Switch
              checked={settings.updates.startup()}
              disabled={!platform.checkUpdate}
              onChange={(checked) => settings.updates.setStartup(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.general.row.releaseNotes.title")}
          description={language.t("settings.general.row.releaseNotes.description")}
        >
          <div data-action="settings-release-notes">
            <Switch
              checked={settings.general.releaseNotes()}
              onChange={(checked) => settings.general.setReleaseNotes(checked)}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title={language.t("settings.updates.row.check.title")}
          description={language.t("settings.updates.row.check.description")}
        >
          <Button size="small" variant="secondary" disabled={store.checking || !platform.checkUpdate} onClick={check}>
            {store.checking
              ? language.t("settings.updates.action.checking")
              : language.t("settings.updates.action.checkNow")}
          </Button>
        </SettingsRow>
      </div>
    </div>
  )

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex flex-col gap-1 pt-6 pb-8">
          <h2 class="text-16-medium text-text-strong">{language.t("settings.tab.general")}</h2>
        </div>
      </div>

      <div class="flex flex-col gap-8 w-full">
        <AppearanceSection />

        <FeedSection />

        <NotificationsSection />

        <SoundsSection />

        {/*<Show when={platform.platform === "desktop" && platform.os === "windows" && platform.getWslEnabled}>
          {(_) => {
            const [enabledResource, actions] = createResource(() => platform.getWslEnabled?.())
            const enabled = () => (enabledResource.state === "pending" ? undefined : enabledResource.latest)

            return (
              <div class="flex flex-col gap-1">
                <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.desktop.section.wsl")}</h3>

                <div class="bg-surface-raised-base px-4 rounded-lg">
                  <SettingsRow
                    title={language.t("settings.desktop.wsl.title")}
                    description={language.t("settings.desktop.wsl.description")}
                  >
                    <div data-action="settings-wsl">
                      <Switch
                        checked={enabled() ?? false}
                        disabled={enabledResource.state === "pending"}
                        onChange={(checked) => platform.setWslEnabled?.(checked)?.finally(() => actions.refetch())}
                      />
                    </div>
                  </SettingsRow>
                </div>
              </div>
            )
          }}
        </Show>*/}

        <UpdatesSection />

        <Show when={linux()}>
          {(_) => {
            const [valueResource, actions] = createResource(() => platform.getDisplayBackend?.())
            const value = () => (valueResource.state === "pending" ? undefined : valueResource.latest)

            const onChange = (checked: boolean) =>
              platform.setDisplayBackend?.(checked ? "wayland" : "auto").finally(() => actions.refetch())

            return (
              <div class="flex flex-col gap-1">
                <h3 class="text-14-medium text-text-strong pb-2">{language.t("settings.general.section.display")}</h3>

                <div class="bg-surface-raised-base px-4 rounded-lg">
                  <SettingsRow
                    title={
                      <div class="flex items-center gap-2">
                        <span>{language.t("settings.general.row.wayland.title")}</span>
                        <Tooltip value={language.t("settings.general.row.wayland.tooltip")} placement="top">
                          <span class="text-text-weak">
                            <Icon name="help" size="small" />
                          </span>
                        </Tooltip>
                      </div>
                    }
                    description={language.t("settings.general.row.wayland.description")}
                  >
                    <div data-action="settings-wayland">
                      <Switch checked={value() === "wayland"} onChange={onChange} />
                    </div>
                  </SettingsRow>
                </div>
              </div>
            )
          }}
        </Show>
      </div>
    </div>
  )
}

interface SettingsRowProps {
  title: string | JSX.Element
  description: string | JSX.Element
  children: JSX.Element
}

const SettingsRow: Component<SettingsRowProps> = (props) => {
  return (
    <div class="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border-weak-base last:border-none">
      <div class="flex flex-col gap-0.5 min-w-0">
        <span class="text-14-medium text-text-strong">{props.title}</span>
        <span class="text-12-regular text-text-weak">{props.description}</span>
      </div>
      <div class="flex-shrink-0">{props.children}</div>
    </div>
  )
}
