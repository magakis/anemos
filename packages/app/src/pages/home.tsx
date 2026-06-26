import { createMemo, For, Match, Switch } from "solid-js"
import { Button } from "@opencode-ai/ui/button"
import { Logo } from "@opencode-ai/ui/logo"
import { useLayout } from "@/context/layout"
import { useNavigate } from "@solidjs/router"
import { base64Encode } from "@opencode-ai/shared/util/encode"
import { Icon } from "@opencode-ai/ui/icon"

import { DateTime } from "luxon"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { DialogSelectDirectory } from "@/components/dialog-select-directory"
import { DialogSelectServer } from "@/components/dialog-select-server"
import { useServer } from "@/context/server"
import { useGlobalSync } from "@/context/global-sync"
import { useLanguage } from "@/context/language"

export default function Home() {
  const sync = useGlobalSync()
  const layout = useLayout()
  const dialog = useDialog()
  const navigate = useNavigate()
  const server = useServer()
  const language = useLanguage()
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

  function openProject(directory: string) {
    layout.projects.open(directory)
    server.projects.touch(directory)
    navigate(`/${base64Encode(directory)}`)
  }

  function chooseProject() {
    function resolve(result: string | string[] | null) {
      if (Array.isArray(result)) {
        for (const directory of result) {
          openProject(directory)
        }
      } else if (result) {
        openProject(result)
      }
    }

    dialog.show(
      () => <DialogSelectDirectory multiple={true} onSelect={resolve} />,
      () => resolve(null),
    )
  }

  return (
    <div class="w-full px-4 pt-6 pb-4">
      <div class="flex flex-col items-center">
        <Logo class="w-20 opacity-12" />
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
        <p class="block text-center mt-2 text-12-regular text-text-dimmed">
          Need help connecting?{" "}
          <a
            class="external-link text-text-link underline"
            href="https://github.com/anemos/anemos"
          >
            Quick Start Guide
          </a>
        </p>
      </div>
      <Switch>
        <Match when={sync.data.project.length > 0}>
          <div class="mt-6 w-full flex flex-col gap-4">
            <div class="flex items-center justify-between px-1">
              <div class="text-14-medium text-text-strong">{language.t("home.recentProjects")}</div>
              <Button icon="folder-add-left" size="normal" class="pl-2 pr-3" onClick={chooseProject}>
                {language.t("command.project.open")}
              </Button>
            </div>
            <ul class="flex flex-col gap-1">
              <For each={recent()}>
                {(project) => (
                  <button
                    type="button"
                    class="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-surface-raised-base hover:bg-surface-raised-base-hover active:bg-surface-raised-base-active transition-colors text-left"
                    onClick={() => openProject(project.worktree)}
                  >
                    <span class="text-14-mono text-text-strong truncate min-w-0">
                      {project.worktree.replace(homedir(), "~")}
                    </span>
                    <span class="text-14-regular text-text-weak shrink-0 ml-2">
                      {DateTime.fromMillis(project.time.updated ?? project.time.created).toRelative()}
                    </span>
                  </button>
                )}
              </For>
            </ul>
          </div>
        </Match>
        <Match when={!sync.ready}>
          <div class="mt-10 mx-auto flex flex-col items-center gap-3">
            <div class="text-12-regular text-text-weak">{language.t("common.loading")}</div>
            <Button class="px-3" onClick={chooseProject}>
              {language.t("command.project.open")}
            </Button>
          </div>
        </Match>
        <Match when={true}>
          <div class="mt-10 mx-auto flex flex-col items-center gap-3">
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
