import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { Plugin, PluginInput } from "@opencode-ai/plugin"

const NTFY_URL = (process.env.NTFY_URL || "https://ntfy.vestiac.com").replace(/\/+$/, "")
const NTFY_TOPIC = process.env.NTFY_TOPIC || "opencode"
const NTFY_TOKEN = process.env.NTFY_TOKEN || ""
const disabled = NTFY_TOKEN.length === 0

if (disabled) {
  console.warn("[ntfy-notify] NTFY_TOKEN is not set; ntfy notifications disabled")
}

const LOG_PATH = `${os.homedir()}/.local/state/opencode/ntfy-notify.ndjson`
const LOG_DIR = LOG_PATH.slice(0, LOG_PATH.lastIndexOf("/"))

const AUTO_TITLE_PATTERN = /^(New session|Child session) - \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function sessionTitle(title?: string) {
  if (!title) return title
  const match = title.match(AUTO_TITLE_PATTERN)
  return match?.[1] ?? title
}

function asciiSafe(s: string) {
  return s.replace(/[^\x00-\x7F]/g, "").trim()
}

type Kind = "complete" | "error" | "approval" | "question" | "test"

const KIND_META: Record<Kind, { priority: string; tags: string; cooldown: number }> = {
  complete: { priority: "default", tags: "white_check_mark", cooldown: 30_000 },
  error: { priority: "urgent", tags: "rotating_light", cooldown: 30_000 },
  approval: { priority: "urgent", tags: "lock", cooldown: 15_000 },
  question: { priority: "high", tags: "question", cooldown: 15_000 },
  test: { priority: "default", tags: "test_tube", cooldown: 0 },
}

type BusEvent = {
  type: string
  properties: Record<string, unknown>
}

async function logRecord(record: Record<string, unknown>) {
  try {
    await fs.promises.mkdir(LOG_DIR, { recursive: true })
    await fs.promises.appendFile(LOG_PATH, `${JSON.stringify(record)}\n`)
    await fs.promises.chmod(LOG_PATH, 0o600).catch(() => {})
  } catch {
    // diagnostics must never throw
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(undefined)
      },
    )
  })
}

async function publish(kind: Kind, sessionID: string, directory: string, title: string, body: string) {
  const meta = KIND_META[kind]
  const deepLink = `opencode://open-session?directory=${encodeURIComponent(directory)}&id=${encodeURIComponent(sessionID)}`
  const res = await fetch(`${NTFY_URL}/${NTFY_TOPIC}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NTFY_TOKEN}`,
      Title: title,
      Priority: meta.priority,
      Tags: meta.tags,
      Click: deepLink,
      Actions: `view, Open Anemos, ${deepLink}, clear=true`,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`ntfy publish failed (${res.status}): ${text}`)
  }
}

const plugin: Plugin = async ({ directory, client, $ }) => {
  const roots = new Map<string, boolean>()
  const dirs = new Map<string, string>()
  const cool = new Map<string, number>()
  const projectNames = new Map<string, string>()
  let run: Promise<void> = Promise.resolve()

  function root(sessionID: string | undefined) {
    if (!sessionID) return false
    return roots.get(sessionID) !== false
  }

  function sync(evt: BusEvent) {
    if (evt.type === "session.created" || evt.type === "session.updated") {
      const info = evt.properties.info as { id?: string; parentID?: string; directory?: string } | undefined
      if (info?.id) {
        roots.set(info.id, !info.parentID)
        if (typeof info.directory === "string" && info.directory) dirs.set(info.id, info.directory)
      }
      return
    }
    if (evt.type === "session.deleted") {
      const info = evt.properties.info as { id?: string } | undefined
      if (info?.id) {
        roots.delete(info.id)
        dirs.delete(info.id)
      }
    }
  }

  function map(evt: BusEvent): { kind: Kind; sessionID: string } | undefined {
    const sessionID = typeof evt.properties.sessionID === "string" ? evt.properties.sessionID : undefined
    let kind: Kind | undefined
    if (evt.type === "session.status") {
      const status = evt.properties.status as { type?: string } | undefined
      if (status?.type !== "idle") return
      kind = "complete"
    } else if (evt.type === "session.idle") {
      kind = "complete"
    } else if (evt.type === "session.error") {
      kind = "error"
    } else if (evt.type === "permission.asked") {
      kind = "approval"
    } else if (evt.type === "question.asked") {
      kind = "question"
    }
    if (!kind || !sessionID) return
    if (!root(sessionID)) return
    return { kind, sessionID }
  }

  function gate(kind: Kind, sessionID: string) {
    const key = `${kind}:${sessionID}`
    const now = Date.now()
    const last = cool.get(key) ?? 0
    if (now - last < KIND_META[kind].cooldown) return false
    cool.set(key, now)
    return true
  }

  async function projectNameFor(sessionDir: string): Promise<string | undefined> {
    const cached = projectNames.get(sessionDir)
    if (cached) return cached

    // client.project.get({ path: { id } }) does not exist in the installed SDK (only list/current),
    // so derive the repo name from the git common dir instead.
    let name: string | undefined
    if ($) {
      try {
        const out = await withTimeout($.nothrow()`git -C ${sessionDir} rev-parse --git-common-dir`.text(), 4000)
        const commonDir = out?.trim()
        if (commonDir) {
          const abs = path.isAbsolute(commonDir) ? commonDir : path.resolve(sessionDir, commonDir)
          const candidate = path.basename(abs.replace(/\.git$/, ""))
          if (candidate) name = candidate
        }
      } catch {
        // fall through to directory basename
      }
    }
    if (!name) name = path.basename(sessionDir)
    if (name) projectNames.set(sessionDir, name)
    return name
  }

  async function buildContent(
    client: PluginInput["client"],
    sessionID: string,
    fallbackDirectory: string,
  ): Promise<{ title: string; body: string }> {
    try {
      const res = await withTimeout(client.session.get({ path: { id: sessionID } }), 4000)
      const session = res?.data
      if (!session) throw new Error("no session data")

      const sessionDir = dirs.get(sessionID) ?? session.directory ?? fallbackDirectory
      const worktree = path.basename(sessionDir) || "opencode"
      const projectName = await projectNameFor(sessionDir)
      const title = sessionTitle(session.title) ?? worktree
      return {
        title: asciiSafe(projectName ?? worktree) || "opencode",
        body: `${worktree} — ${title}`,
      }
    } catch {
      const worktree = path.basename(dirs.get(sessionID) ?? fallbackDirectory) || "opencode"
      return { title: asciiSafe(worktree) || "opencode", body: worktree }
    }
  }

  async function notify(item: { kind: Kind; sessionID: string }) {
    const record: { ts: number; kind: Kind; sessionID: string; topic: string; status: string; error?: string } = {
      ts: Date.now(),
      kind: item.kind,
      sessionID: item.sessionID,
      topic: NTFY_TOPIC,
      status: disabled ? "disabled" : "sent",
    }
    if (!disabled) {
      try {
        const dir = dirs.get(item.sessionID) ?? directory
        const content =
          item.kind === "test"
            ? { title: asciiSafe(path.basename(directory)) || "opencode", body: "ntfy-notify self-test" }
            : await buildContent(client, item.sessionID, directory)
        await publish(item.kind, item.sessionID, dir, content.title, content.body)
      } catch (error) {
        record.status = "failed"
        record.error = error instanceof Error ? error.message : String(error)
      }
    }
    await logRecord(record)
  }

  if (process.env.NTFY_TEST === "1") {
    setTimeout(() => {
      run = run.then(() => notify({ kind: "test", sessionID: "test" })).catch(() => {})
    }, 2000)
  }

  return {
    event({ event }) {
      run = run
        .then(async () => {
          const evt = event as unknown as BusEvent
          sync(evt)
          const item = map(evt)
          if (!item) return
          if (!gate(item.kind, item.sessionID)) return
          await notify(item)
        })
        .catch((error) => {
          console.error("[ntfy-notify] event failed", error)
        })
      return run
    },
  }
}

export default plugin
