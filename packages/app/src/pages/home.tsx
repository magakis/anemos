import { createEffect, createMemo, For, Match, onCleanup, Show, Switch } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@opencode-ai/ui/button"
import { Logo } from "@opencode-ai/ui/logo"
import { showToast } from "@opencode-ai/ui/toast"
import { useLayout } from "@/context/layout"
import { useNavigate } from "@solidjs/router"
import { base64Encode } from "@opencode-ai/util/encode"
import { Icon } from "@opencode-ai/ui/icon"
import { usePlatform, type PairInfo, type PairState } from "@/context/platform"
import { DateTime } from "luxon"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { DialogSelectDirectory } from "@/components/dialog-select-directory"
import { DialogSelectServer } from "@/components/dialog-select-server"
import { useServer } from "@/context/server"
import { useGlobalSync } from "@/context/global-sync"
import { useLanguage } from "@/context/language"
import { Persist, persisted } from "@/utils/persist"
import { installPrompt, installPush } from "@/utils/push-plugin"
import { setSessionHandoff } from "@/pages/session/handoff"

export default function Home() {
  const sync = useGlobalSync()
  const layout = useLayout()
  const platform = usePlatform()
  const dialog = useDialog()
  const navigate = useNavigate()
  const server = useServer()
  const language = useLanguage()
  const [meta, setMeta] = createStore({ busy: false, copy: false, asking: false, pairing: false })
  const [pushStore, setPushStore, , pushReady] = persisted(
    Persist.global("push.setup", ["push.setup.v1"]),
    createStore({
      closed: false,
      tested: false,
    }),
  )
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
  const homedir = createMemo(() => sync.data.path.home)
  const recent = createMemo(() => {
    return sync.data.project
      .slice()
      .sort((a, b) => (b.time.updated ?? b.time.created) - (a.time.updated ?? a.time.created))
      .slice(0, 5)
  })

  const serverDotClass = createMemo(() => {
    const healthy = server.healthy()
    if (healthy === true) return "bg-icon-success-base"
    if (healthy === false) return "bg-icon-critical-base"
    return "bg-border-weak-base"
  })

  const push = createMemo(() => platform.pushState?.())
  const installCmd = createMemo(() => pair.command ?? installPush())

  const pushMode = createMemo(() => {
    if (platform.platform !== "ios") return
    if (!platform.requestPushPermission) return
    if (!pushReady() || !pairReady()) return
    if (pushStore.closed) return
    const state = push()
    if (!state) return
    if (state.allowed && !state.paired) return "install" as const
    if (state.allowed) {
      if (pushStore.tested || !platform.testPush) return
      return "test" as const
    }
    return "enable" as const
  })

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
    if (!platform.beginPushPairing || meta.pairing) return
    setMeta("pairing", true)
    await platform
      .beginPushPairing()
      .then((value) => {
        setPairInfo(value)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setMeta("pairing", false))
  }

  const pairText = createMemo(() => {
    if (meta.pairing || !pairReady()) return language.t("home.push.install.status.preparing")
    if (pair.status === "claimed") return language.t("home.push.install.status.claimed")
    if (pair.status === "expired") return language.t("home.push.install.status.expired")
    if (pair.status === "failed") return pair.message || language.t("home.push.install.status.failed")
    if (pair.command) return language.t("home.push.install.status.pending")
    return language.t("home.push.install.status.preparing")
  })

  const pairAction = createMemo(() => {
    if (meta.pairing || !pairReady() || !pair.command || pair.status === "expired" || pair.status === "failed") {
      return "start" as const
    }
    if (pair.status === "claimed") return "wait" as const
    return "agent" as const
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
    if (pushMode() !== "install") return
    if (push()?.paired) return
    if (pair.id || pair.command || pair.status) return
    void startPair()
  })

  createEffect(() => {
    if (pushMode() !== "install") return
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

  const askHost = async () => {
    if (meta.asking) return
    const dir = recent()[0]?.worktree
    if (!dir) {
      showToast({
        title: language.t("home.push.install.toast.noProject.title"),
        description: language.t("home.push.install.toast.noProject.description"),
        variant: "error",
      })
      return
    }
    setMeta("asking", true)
    const text = installPrompt(installCmd())
    const slug = base64Encode(dir)
    layout.projects.open(dir)
    setSessionHandoff(slug, { prompt: text })
    navigate(`/${slug}/session?prompt=${encodeURIComponent(text)}`)
    queueMicrotask(() => setMeta("asking", false))
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
    setMeta("copy", true)
    await clip
      .writeText(installCmd())
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
      .finally(() => setMeta("copy", false))
  }

  const runPush = async () => {
    if (meta.busy) return
    const mode = pushMode()
    if (!mode) return
    setMeta("busy", true)

    if (mode === "test") {
      await platform
        .testPush?.(window.location.pathname + window.location.search + window.location.hash)
        .then((ok) => {
          if (!ok) {
            showToast({
              title: language.t("settings.general.notifications.push.toast.failed.title"),
              description: language.t("settings.general.notifications.push.toast.failed.description"),
              variant: "error",
            })
            return
          }
          setPushStore("tested", true)
          setPushStore("closed", true)
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
        .finally(() => setMeta("busy", false))
      return
    }

    const state = push()
    if (mode === "install" && !state?.paired) {
      await startPair()
      setMeta("busy", false)
      return
    }
    if (state?.permission === "denied") {
      await platform
        .openSystemSettings?.()
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          showToast({ title: language.t("common.requestFailed"), description: message })
        })
        .finally(() => setMeta("busy", false))
      return
    }

    await platform
      .requestPushPermission?.()
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        showToast({ title: language.t("common.requestFailed"), description: message })
      })
      .finally(() => setMeta("busy", false))
  }

  const closePush = () => {
    setPushStore("closed", true)
  }

  function openProject(directory: string) {
    layout.projects.open(directory)
    server.projects.touch(directory)
    navigate(`/${base64Encode(directory)}`)
  }

  async function chooseProject() {
    function resolve(result: string | string[] | null) {
      if (Array.isArray(result)) {
        for (const directory of result) {
          openProject(directory)
        }
      } else if (result) {
        openProject(result)
      }
    }

    if (platform.openDirectoryPickerDialog && server.isLocal()) {
      const result = await platform.openDirectoryPickerDialog?.({
        title: language.t("command.project.open"),
        multiple: true,
      })
      resolve(result)
    } else {
      dialog.show(
        () => <DialogSelectDirectory multiple={true} onSelect={resolve} />,
        () => resolve(null),
      )
    }
  }

  return (
    <div class="mx-auto mt-55 w-full md:w-auto px-4">
      <Logo class="md:w-xl opacity-12" />
      <Button
        size="large"
        variant="ghost"
        class="mt-4 mx-auto text-14-regular text-text-weak"
        onClick={() => dialog.show(() => <DialogSelectServer />)}
      >
        <div
          classList={{
            "size-2 rounded-full": true,
            [serverDotClass()]: true,
          }}
        />
        {server.name}
      </Button>
      {(platform.platform === "ios" || platform.platform === "android") && (
        <p class="block text-center mt-2 text-12-regular text-text-dimmed">
          Need help connecting?{" "}
          <a
            class="external-link text-text-link underline"
            href="https://github.com/DNGriffin/whispercode?tab=readme-ov-file#quick-start"
          >
            Quick Start Guide
          </a>
        </p>
      )}
      <Show when={pushMode()} keyed>
        {(mode) => (
          <div class="mx-auto mt-6 w-full max-w-xl rounded-2xl border border-border-weak-base bg-[linear-gradient(180deg,var(--surface-raised-base),color-mix(in_srgb,var(--surface-raised-base)_84%,transparent))] p-4 shadow-lg shadow-black/5">
            <div class="flex items-start gap-3">
              <div class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-base">
                <Icon name={mode === "enable" ? "warning" : "check"} size="small" class="text-icon-base" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-14-medium text-text-strong">
                  {mode === "enable"
                    ? language.t("home.push.enable.title")
                    : mode === "install"
                      ? language.t("home.push.install.title")
                      : language.t("home.push.test.title")}
                </div>
                <p class="mt-1 text-12-regular leading-relaxed text-text-weak">
                  {mode === "enable"
                    ? language.t("home.push.enable.description")
                    : mode === "install"
                      ? language.t("home.push.install.description")
                      : language.t("home.push.test.description")}
                </p>
                <Show when={mode === "install"}>
                  <p class="mt-2 text-12-regular text-text-dimmed">{pairText()}</p>
                  <pre class="mt-3 overflow-x-auto rounded-lg bg-surface-base px-3 py-2 text-12-mono text-text-dimmed">
                    <code>{installCmd()}</code>
                  </pre>
                </Show>
                <div class="mt-4 flex flex-wrap gap-2">
                  <Show
                    when={mode === "install"}
                    fallback={
                      <Button size="small" onClick={() => void runPush()} disabled={meta.busy}>
                        {meta.busy
                          ? mode === "test"
                            ? language.t("settings.general.notifications.push.action.sending")
                            : language.t("settings.general.notifications.push.action.checking")
                          : push()?.permission === "denied"
                            ? language.t("settings.general.notifications.push.action.openSettings")
                            : mode === "test"
                              ? language.t("settings.general.notifications.push.action.test")
                              : language.t("settings.general.notifications.push.action.enable")}
                      </Button>
                    }
                  >
                    <Button
                      size="small"
                      onClick={() => void (pairAction() === "start" ? startPair() : askHost())}
                      disabled={meta.asking || meta.pairing || pairAction() === "wait"}
                    >
                      {meta.pairing
                        ? language.t("home.push.install.action.preparing")
                        : meta.asking
                          ? language.t("home.push.install.action.asking")
                          : pairAction() === "start"
                            ? language.t("home.push.install.action.start")
                            : pairAction() === "wait"
                              ? language.t("home.push.install.action.waiting")
                              : language.t("home.push.install.action.agent")}
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => void copyHost()}
                      disabled={meta.copy || !pair.command || pair.status === "expired" || pair.status === "failed"}
                    >
                      {meta.copy
                        ? language.t("settings.general.notifications.push.host.action.copying")
                        : language.t("settings.general.notifications.push.host.action.copy")}
                    </Button>
                  </Show>
                  <Button size="small" variant="secondary" onClick={closePush}>
                    {mode === "test" ? language.t("home.push.action.done") : language.t("home.push.action.later")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>
      <Switch>
        <Match when={sync.data.project.length > 0}>
          <div class="mt-20 w-full flex flex-col gap-4">
            <div class="flex gap-2 items-center justify-between pl-3">
              <div class="text-14-medium text-text-strong">{language.t("home.recentProjects")}</div>
              <Button icon="folder-add-left" size="normal" class="pl-2 pr-3" onClick={chooseProject}>
                {language.t("command.project.open")}
              </Button>
            </div>
            <ul class="flex flex-col gap-2">
              <For each={recent()}>
                {(project) => (
                  <Button
                    size="large"
                    variant="ghost"
                    class="text-14-mono text-left justify-between px-3"
                    onClick={() => openProject(project.worktree)}
                  >
                    {project.worktree.replace(homedir(), "~")}
                    <div class="text-14-regular text-text-weak">
                      {DateTime.fromMillis(project.time.updated ?? project.time.created).toRelative()}
                    </div>
                  </Button>
                )}
              </For>
            </ul>
          </div>
        </Match>
        <Match when={true}>
          <div class="mt-30 mx-auto flex flex-col items-center gap-3">
            <Icon name="folder-add-left" size="large" />
            <div class="flex flex-col gap-1 items-center justify-center">
              <div class="text-14-medium text-text-strong">{language.t("home.empty.title")}</div>
              <div class="text-12-regular text-text-weak">{language.t("home.empty.description")}</div>
            </div>
            <Button class="px-3 mt-1" onClick={chooseProject}>
              {language.t("command.project.open")}
            </Button>
          </div>
        </Match>
      </Switch>
    </div>
  )
}
