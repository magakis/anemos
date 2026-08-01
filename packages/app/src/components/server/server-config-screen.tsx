import { Button } from "@opencode-ai/ui/button"
import { DropdownMenu } from "@opencode-ai/ui/dropdown-menu"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Splash } from "@opencode-ai/ui/logo"
import { showToast } from "@opencode-ai/ui/toast"
import { createEffect, createMemo, createResource, For, onCleanup, Show } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { DEFAULT_USERNAME, ServerForm } from "@/components/server/server-form"
import { ServerHealthIndicator, ServerRow } from "@/components/server/server-row"
import { useLanguage } from "@/context/language"
import { usePlatform } from "@/context/platform"
import { normalizeServerUrl, ServerConnection, useServer } from "@/context/server"
import { type ServerHealth } from "@/utils/server-health"

async function checkHealth(url: string, username?: string, password?: string): Promise<boolean> {
  const base = url.replace(/\/+$/, "")
  const headers: HeadersInit = {}
  if (password) {
    headers["Authorization"] = `Basic ${btoa(`${username || "opencode"}:${password}`)}`
  }
  const primary = await fetch(`${base}/global/health`, { headers, signal: AbortSignal.timeout(3000) })
    .then((r) => r.ok)
    .catch(() => false)
  if (primary) return true
  return fetch(`${base}/health`, { headers, signal: AbortSignal.timeout(3000) })
    .then((r) => r.ok)
    .catch(() => false)
}

export function ServerConfigScreen() {
  const language = useLanguage()
  const server = useServer()
  const platform = usePlatform()
  const [store, setStore] = createStore({
    status: {} as Record<ServerConnection.Key, ServerHealth | undefined>,
    mode: (server.list.length > 0 ? "list" : "add") as "list" | "add" | "edit",
    editId: undefined as string | undefined,
    form: {
      url: "",
      name: "",
      username: DEFAULT_USERNAME,
      password: "",
      error: "",
      busy: false,
      status: undefined as boolean | undefined,
    },
  })

  const showRequestError = (err: unknown) => {
    showToast({
      variant: "error",
      title: language.t("common.requestFailed"),
      description: err instanceof Error ? err.message : String(err),
    })
  }

  const [defaultKey, defaultUrlActions] = createResource(
    async () => {
      try {
        const key = await platform.getDefaultServer?.()
        if (!key) return null
        return key
      } catch (err) {
        showRequestError(err)
        return null
      }
    },
    { initialValue: null },
  )

  const canDefault = createMemo(() => !!platform.getDefaultServer && !!platform.setDefaultServer)
  const setDefault = async (key: ServerConnection.Key | null) => {
    try {
      await platform.setDefaultServer?.(key)
      defaultUrlActions.mutate(key)
    } catch (err) {
      showRequestError(err)
    }
  }

  const items = createMemo(() => {
    const current = server.current
    const list = server.list
    if (!current) return list
    if (!list.includes(current)) return [current, ...list]
    return [current, ...list.filter((x) => x !== current)]
  })

  const current = createMemo(() => items().find((x) => ServerConnection.key(x) === server.key) ?? items()[0])

  const sortedItems = createMemo(() => {
    const list = items()
    if (!list.length) return list
    const active = current()
    const order = new Map(list.map((conn, index) => [conn, index] as const))
    const rank = (value?: ServerHealth) => {
      if (value?.healthy === true) return 0
      if (value?.healthy === false) return 2
      return 1
    }
    return list.slice().sort((a, b) => {
      if (a === active) return -1
      if (b === active) return 1
      const diff = rank(store.status[ServerConnection.key(a)]) - rank(store.status[ServerConnection.key(b)])
      if (diff !== 0) return diff
      return (order.get(a) ?? 0) - (order.get(b) ?? 0)
    })
  })

  const refreshHealth = async () => {
    const results: Record<ServerConnection.Key, ServerHealth> = {}
    await Promise.all(
      items().map(async (conn) => {
        results[ServerConnection.key(conn)] = {
          healthy: await checkHealth(conn.http.url, conn.http.username, conn.http.password),
        }
      }),
    )
    setStore("status", reconcile(results))
  }

  createEffect(() => {
    items()
    void refreshHealth()
    const interval = setInterval(refreshHealth, 10_000)
    onCleanup(() => clearInterval(interval))
  })

  const editing = createMemo(() => {
    if (!store.editId) return
    return items().find((x) => x.type === "http" && x.http.url === store.editId)
  })

  const looksComplete = (value: string) => {
    const normalized = normalizeServerUrl(value)
    if (!normalized) return false
    const host = normalized.replace(/^https?:\/\//, "").split("/")[0]
    if (!host) return false
    if (host.includes("localhost") || host.startsWith("127.0.0.1")) return true
    return host.includes(".") || host.includes(":")
  }

  const previewStatus = async (value: string, username: string, password: string) => {
    setStore("form", { status: undefined })
    if (!looksComplete(value)) return
    const normalized = normalizeServerUrl(value)
    if (!normalized) return
    const ok = await checkHealth(normalized, username, password)
    setStore("form", { status: ok })
  }

  const resetForm = () => {
    setStore("mode", server.list.length > 0 ? "list" : "add")
    setStore("editId", undefined)
    setStore("form", {
      url: "",
      name: "",
      username: DEFAULT_USERNAME,
      password: "",
      error: "",
      busy: false,
      status: undefined,
    })
  }

  const startEdit = (conn: ServerConnection.Http) => {
    setStore("mode", "edit")
    setStore("editId", conn.http.url)
    setStore("form", {
      url: conn.http.url,
      name: conn.displayName ?? "",
      username: conn.http.username ?? "",
      password: conn.http.password ?? "",
      error: "",
      busy: false,
      status: store.status[ServerConnection.key(conn)]?.healthy,
    })
  }

  const replaceServer = (original: ServerConnection.Http, next: ServerConnection.Http) => {
    const active = server.key
    const newConn = server.add(next)
    if (!newConn) return
    const nextActive = active === ServerConnection.key(original) ? ServerConnection.key(newConn) : active
    if (nextActive) server.setActive(nextActive)
    server.remove(ServerConnection.key(original))
  }

  const handleChange = (value: string) => {
    if (store.form.busy) return
    setStore("form", { url: value, error: "" })
    void previewStatus(value, store.form.username, store.form.password)
  }

  const handleNameChange = (value: string) => {
    if (store.form.busy) return
    setStore("form", { name: value, error: "" })
  }

  const handleUsernameChange = (value: string) => {
    if (store.form.busy) return
    setStore("form", { username: value, error: "" })
    void previewStatus(store.form.url, value, store.form.password)
  }

  const handlePasswordChange = (value: string) => {
    if (store.form.busy) return
    setStore("form", { password: value, error: "" })
    void previewStatus(store.form.url, store.form.username, value)
  }

  const handleRemove = async (key: ServerConnection.Key) => {
    server.remove(key)
    if ((await platform.getDefaultServer?.()) === key) {
      void platform.setDefaultServer?.(null)
    }
  }

  const submit = async () => {
    if (store.form.busy) return
    const normalized = normalizeServerUrl(store.form.url)
    if (!normalized) return

    if (store.mode === "add") {
      const conn: ServerConnection.Http = {
        type: "http",
        http: { url: normalized },
      }
      if (store.form.name.trim()) conn.displayName = store.form.name.trim()
      if (store.form.password) conn.http.password = store.form.password
      if (store.form.password && store.form.username) conn.http.username = store.form.username
      setStore("form", { busy: true, error: "" })
      const ok = await checkHealth(normalized, store.form.username, store.form.password)
      if (!ok) {
        setStore("form", { busy: false, error: language.t("dialog.server.add.error") })
        return
      }

      server.add(conn)
      return
    }

    const original = editing()
    if (!original || original.type !== "http") return
    const name = store.form.name.trim() || undefined
    const username = store.form.username || undefined
    const password = store.form.password || undefined
    if (
      normalized === original.http.url &&
      name === original.displayName &&
      username === original.http.username &&
      password === original.http.password
    ) {
      resetForm()
      return
    }

    const conn: ServerConnection.Http = {
      type: "http",
      displayName: name,
      http: { url: normalized, username, password },
    }
    setStore("form", { busy: true, error: "" })
    const ok = await checkHealth(normalized, store.form.username, store.form.password)
    if (!ok) {
      setStore("form", { busy: false, error: language.t("dialog.server.add.error") })
      return
    }
    if (normalized === original.http.url) {
      server.add(conn)
    } else {
      replaceServer(original, conn)
    }
    resetForm()
  }

  createEffect(() => {
    if (server.list.length === 0 && store.mode === "list") setStore("mode", "add")
  })

  createEffect(() => {
    if (!store.editId) return
    if (editing()) return
    resetForm()
  })

  const isFormMode = createMemo(() => store.mode !== "list")
  const isAddMode = createMemo(() => store.mode === "add")
  const formBusy = createMemo(() => store.form.busy)

  return (
    <div class="h-dvh w-screen flex flex-col items-center justify-center bg-background-base gap-6 p-6">
      <div class="flex flex-col items-center max-w-md text-center shrink-0">
        <Splash class="w-12 h-15 mb-4" />
        <p class="text-16-medium text-text-strong">{language.t("server.setup.title")}</p>
        <p class="mt-1 text-12-regular text-text-weak">{language.t("server.setup.subtitle")}</p>
      </div>
      <div class="w-full max-w-md flex flex-col gap-3 min-h-0 overflow-y-auto">
        <Show when={server.list.length > 0}>
          <div class="flex flex-col gap-1 bg-surface-base rounded-lg p-2">
            <For each={sortedItems()}>
              {(conn) => {
                const key = ServerConnection.key(conn)
                return (
                  <button
                    type="button"
                    class="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-surface-raised-base-hover transition-colors text-left"
                    onClick={() => server.setActive(key)}
                  >
                    <ServerHealthIndicator health={store.status[key]} />
                    <ServerRow
                      conn={conn}
                      dimmed={store.status[key]?.healthy === false}
                      status={store.status[key]}
                      class="flex items-center gap-3 min-w-0 flex-1"
                      badge={
                        <Show when={defaultKey() === key}>
                          <span class="text-text-base bg-surface-base text-14-regular px-1.5 rounded-xs">
                            {language.t("dialog.server.status.default")}
                          </span>
                        </Show>
                      }
                      showCredentials
                    />
                    <Show when={ServerConnection.key(current()) === key}>
                      <Icon name="check" class="h-6" />
                    </Show>
                    <Show when={conn.type === "http"}>
                      <DropdownMenu>
                        <DropdownMenu.Trigger
                          as={IconButton}
                          icon="dot-grid"
                          variant="ghost"
                          class="shrink-0 size-8 hover:bg-surface-base-hover data-[expanded]:bg-surface-base-active"
                          onClick={(e: MouseEvent) => e.stopPropagation()}
                          onPointerDown={(e: PointerEvent) => e.stopPropagation()}
                        />
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content class="mt-1">
                            <DropdownMenu.Item
                              onSelect={() => {
                                if (conn.type !== "http") return
                                startEdit(conn)
                              }}
                            >
                              <DropdownMenu.ItemLabel>{language.t("dialog.server.menu.edit")}</DropdownMenu.ItemLabel>
                            </DropdownMenu.Item>
                            <Show when={canDefault() && defaultKey() !== key}>
                              <DropdownMenu.Item onSelect={() => setDefault(key)}>
                                <DropdownMenu.ItemLabel>
                                  {language.t("dialog.server.menu.default")}
                                </DropdownMenu.ItemLabel>
                              </DropdownMenu.Item>
                            </Show>
                            <Show when={canDefault() && defaultKey() === key}>
                              <DropdownMenu.Item onSelect={() => setDefault(null)}>
                                <DropdownMenu.ItemLabel>
                                  {language.t("dialog.server.menu.defaultRemove")}
                                </DropdownMenu.ItemLabel>
                              </DropdownMenu.Item>
                            </Show>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item
                              onSelect={() => void handleRemove(key)}
                              class="text-text-on-critical-base hover:bg-surface-critical-weak"
                            >
                              <DropdownMenu.ItemLabel>{language.t("dialog.server.menu.delete")}</DropdownMenu.ItemLabel>
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu>
                    </Show>
                  </button>
                )
              }}
            </For>
          </div>
        </Show>
        <Show
          when={isFormMode()}
          fallback={
            <div class="flex justify-center">
              <Button
                variant="secondary"
                icon="plus-small"
                size="large"
                onClick={() => setStore("mode", "add")}
                class="py-1.5 pl-1.5 pr-3 flex items-center gap-1.5"
              >
                {language.t("dialog.server.add.button")}
              </Button>
            </div>
          }
        >
          <ServerForm
            value={store.form.url}
            name={store.form.name}
            username={store.form.username}
            password={store.form.password}
            placeholder={language.t("dialog.server.add.placeholder")}
            busy={formBusy()}
            error={store.form.error}
            status={store.form.status}
            onChange={handleChange}
            onNameChange={handleNameChange}
            onUsernameChange={handleUsernameChange}
            onPasswordChange={handlePasswordChange}
            onSubmit={submit}
            onBack={resetForm}
          />
          <div class="flex justify-center">
            <Button variant="primary" size="large" onClick={submit} disabled={formBusy()} class="px-3 py-1.5">
              {formBusy()
                ? language.t("dialog.server.add.checking")
                : isAddMode()
                  ? language.t("dialog.server.add.button")
                  : language.t("common.save")}
            </Button>
          </div>
        </Show>
      </div>
    </div>
  )
}
