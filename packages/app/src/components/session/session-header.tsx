import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Keybind } from "@opencode-ai/ui/keybind"
import { showToast } from "@opencode-ai/ui/toast"
import { Tooltip, TooltipKeybind } from "@opencode-ai/ui/tooltip"
import { getFilename } from "@opencode-ai/shared/util/path"
import { createMemo, createSignal, onMount, Show } from "solid-js"
import { Portal } from "solid-js/web"
import { useCommand } from "@/context/command"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { usePlatform } from "@/context/platform"
import { useSettings } from "@/context/settings"
import { useTerminal } from "@/context/terminal"
import { focusTerminalById } from "@/pages/session/helpers"
import { useSessionLayout } from "@/pages/session/session-layout"
import { decode64 } from "@/utils/base64"
import { StatusPopover } from "../status-popover"

const showRequestError = (language: ReturnType<typeof useLanguage>, err: unknown) => {
  showToast({
    variant: "error",
    title: language.t("common.requestFailed"),
    description: err instanceof Error ? err.message : String(err),
  })
}

export function SessionHeader() {
  const layout = useLayout()
  const command = useCommand()
  const platform = usePlatform()
  const language = useLanguage()
  const settings = useSettings()
  const terminal = useTerminal()
  const { params, view } = useSessionLayout()

  const projectDirectory = createMemo(() => decode64(params.dir) ?? "")
  const project = createMemo(() => {
    const directory = projectDirectory()
    if (!directory) return
    return layout.projects.list().find((p) => p.worktree === directory || p.sandboxes?.includes(directory))
  })
  const name = createMemo(() => {
    const current = project()
    if (current) return current.name || getFilename(current.worktree)
    return getFilename(projectDirectory())
  })
  const hotkey = createMemo(() => command.keybind("file.open"))
  // UPSTREAM-DIVERGENCE: The fork exposes extra titlebar affordances on mobile without affecting the
  // desktop header flow that upstream continues to evolve.
  const mobile = createMemo(() => platform.platform === "ios" || platform.platform === "android")
  const isDesktopBeta = platform.platform === "desktop" && import.meta.env.VITE_OPENCODE_CHANNEL === "beta"
  const search = createMemo(() => !isDesktopBeta || settings.general.showSearch())
  const tree = createMemo(() => !isDesktopBeta || settings.general.showFileTree())
  const term = createMemo(() => !isDesktopBeta || settings.general.showTerminal())
  const status = createMemo(() => !isDesktopBeta || settings.general.showStatus())

  const toggleTerminal = () => {
    const next = !view().terminal.opened()
    view().terminal.toggle()
    if (!next) return

    const id = terminal.active()
    if (!id) return
    focusTerminalById(id)
  }

  const copyPath = () => {
    const directory = projectDirectory()
    if (!directory) return
    navigator.clipboard
      .writeText(directory)
      .then(() => {
        showToast({
          variant: "success",
          icon: "circle-check",
          title: language.t("session.share.copy.copied"),
          description: directory,
        })
      })
      .catch((err: unknown) => showRequestError(language, err))
  }

  const [centerMount, setCenterMount] = createSignal<HTMLElement | null>(null)
  const [rightMount, setRightMount] = createSignal<HTMLElement | null>(null)
  onMount(() => {
    setCenterMount(document.getElementById("opencode-titlebar-center"))
    setRightMount(document.getElementById("opencode-titlebar-right"))
  })
  // UPSTREAM-DIVERGENCE: The header has a manual refresh button for mobile; pull-to-refresh was
  // re-added in the session message timeline (session.tsx). Keep both available.
  const refresh = () => {
    platform.haptic?.("light")
    void platform.restart()
  }

  return (
    <>
      <Show when={search() && centerMount()}>
        {(mount) => (
          <Portal mount={mount()}>
            <Button
              type="button"
              variant="ghost"
              size="small"
              class="flex md:w-[240px] max-w-full min-w-0 h-[24px] pl-0.5 pr-2 items-center gap-2 justify-between rounded-md border border-border-weak-base bg-surface-panel transition-colors cursor-default hover:bg-surface-raised-base-hover focus-visible:bg-surface-raised-base-hover active:bg-surface-raised-base-active"
              onClick={() => command.trigger("file.open")}
              aria-label={language.t("session.header.searchFiles")}
            >
              <Icon name="magnifying-glass" size="small" class="md:hidden icon-base shrink-0 size-4" />
              <span class="md:hidden text-12-regular text-text-weak">
                {language.t("common.search.placeholder")}
              </span>
              <div class="hidden md:flex min-w-0 flex-1 items-center gap-1.5 overflow-visible">
                <Icon name="magnifying-glass" size="small" class="icon-base shrink-0 size-4" />
                <span class="flex-1 min-w-0 text-12-regular text-text-weak truncate text-left">
                  {language.t("session.header.search.placeholder", {
                    project: name(),
                  })}
                </span>
              </div>

              <Show when={hotkey()}>
                {(keybind) => (
                  <Keybind class="hidden md:flex shrink-0 !border-0 !bg-transparent !shadow-none px-0 text-text-weaker">
                    {keybind()}
                  </Keybind>
                )}
              </Show>
            </Button>
          </Portal>
        )}
      </Show>
      <Show when={rightMount()}>
        {(mount) => (
          <Portal mount={mount()}>
            <div class="flex items-center gap-2">
              <Show when={mobile()}>
                {/* UPSTREAM-DIVERGENCE: Preserve this mobile-only refresh button. It replaced the
                    fork's earlier pull-to-refresh gesture in shared app code. */}
                <IconButton
                  icon="refresh"
                  variant="ghost"
                  class="titlebar-icon w-6 h-6 p-0 box-border shrink-0"
                  onClick={refresh}
                  aria-label={language.t("session.header.refresh")}
                  data-action="session-refresh"
                />
              </Show>
              <IconButton
                icon="share"
                variant="ghost"
                class="titlebar-icon w-6 h-6 p-0 box-border shrink-0"
                onClick={() => {
                  platform.haptic?.("light")
                  void platform.share?.({ url: window.location.href })
                }}
                aria-label="Share session"
                data-action="session-share"
              />
              <Show when={projectDirectory()}>
                <div class="hidden xl:flex items-center">
                  <div class="flex h-[24px] box-border items-center rounded-md border border-border-weak-base bg-surface-panel overflow-hidden">
                    <Button
                      variant="ghost"
                      class="rounded-none h-full py-0 pr-3 pl-0.5 gap-1.5 border-none shadow-none"
                      onClick={copyPath}
                      aria-label={language.t("session.header.open.copyPath")}
                    >
                      <Icon name="copy" size="small" class="text-icon-base" />
                      <span class="text-12-regular text-text-strong">
                        {language.t("session.header.open.copyPath")}
                      </span>
                    </Button>
                  </div>
                </div>
              </Show>
              <div class="flex items-center gap-1">
                <Show when={status()}>
                  <Tooltip placement="bottom" value={language.t("status.popover.trigger")}>
                    <StatusPopover />
                  </Tooltip>
                </Show>
                <Show when={term()}>
                  <TooltipKeybind
                    title={language.t("command.terminal.toggle")}
                    keybind={command.keybind("terminal.toggle")}
                  >
                    <Button
                      variant="ghost"
                      class="group/terminal-toggle titlebar-icon w-8 h-6 p-0 box-border shrink-0"
                      onClick={toggleTerminal}
                      aria-label={language.t("command.terminal.toggle")}
                      aria-expanded={view().terminal.opened()}
                      aria-controls="terminal-panel"
                    >
                      <Icon size="small" name={view().terminal.opened() ? "terminal-active" : "terminal"} />
                    </Button>
                  </TooltipKeybind>
                </Show>

                <div class="hidden md:flex items-center gap-1 shrink-0">
                  <TooltipKeybind
                    title={language.t("command.review.toggle")}
                    keybind={command.keybind("review.toggle")}
                  >
                    <Button
                      variant="ghost"
                      class="group/review-toggle titlebar-icon w-8 h-6 p-0 box-border"
                      onClick={() => view().reviewPanel.toggle()}
                      aria-label={language.t("command.review.toggle")}
                      aria-expanded={view().reviewPanel.opened()}
                      aria-controls="review-panel"
                    >
                      <Icon size="small" name={view().reviewPanel.opened() ? "review-active" : "review"} />
                    </Button>
                  </TooltipKeybind>

                  <Show when={tree()}>
                    <TooltipKeybind
                      title={language.t("command.fileTree.toggle")}
                      keybind={command.keybind("fileTree.toggle")}
                    >
                      <Button
                        variant="ghost"
                        class="titlebar-icon w-8 h-6 p-0 box-border"
                        onClick={() => layout.fileTree.toggle()}
                        aria-label={language.t("command.fileTree.toggle")}
                        aria-expanded={layout.fileTree.opened()}
                        aria-controls="file-tree-panel"
                      >
                        <div class="relative flex items-center justify-center size-4">
                          <Icon
                            size="small"
                            name={layout.fileTree.opened() ? "file-tree-active" : "file-tree"}
                            classList={{
                              "text-icon-strong": layout.fileTree.opened(),
                              "text-icon-weak": !layout.fileTree.opened(),
                            }}
                          />
                        </div>
                      </Button>
                    </TooltipKeybind>
                  </Show>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </Show>
    </>
  )
}
