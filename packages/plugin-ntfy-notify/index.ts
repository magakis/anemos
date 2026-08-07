import fs from "node:fs"
import os from "node:os"
import type { Plugin } from "@opencode-ai/plugin"

const NTFY_URL = (process.env.NTFY_URL || "https://ntfy.vestiac.com").replace(/\/+$/, "")
const NTFY_TOPIC = process.env.NTFY_TOPIC || "opencode"
const NTFY_TOKEN = process.env.NTFY_TOKEN || ""
const disabled = NTFY_TOKEN.length === 0

if (disabled) {
  console.warn("[ntfy-notify] NTFY_TOKEN is not set; ntfy notifications disabled")
}

const LOG_PATH = `${os.homedir()}/.local/state/opencode/ntfy-notify.ndjson`
const LOG_DIR = LOG_PATH.slice(0, LOG_PATH.lastIndexOf("/"))

type Kind = "complete" | "error" | "approval" | "question" | "test"

const KIND_META: Record<Kind, { title: string; priority: string; tags: string; cooldown: number }> = {
  complete: { title: "Session finished", priority: "default", tags: "white_check_mark", cooldown: 30_000 },
  error: { title: "Session error", priority: "urgent", tags: "rotating_light", cooldown: 30_000 },
  approval: { title: "Approval needed", priority: "urgent", tags: "lock", cooldown: 15_000 },
  question: { title: "Question", priority: "high", tags: "question", cooldown: 15_000 },
  test: { title: "Test notification", priority: "default", tags: "test_tube", cooldown: 0 },
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

async function publish(kind: Kind, sessionID: string, directory: string) {
  const meta = KIND_META[kind]
  const project = directory.split("/").filter(Boolean).pop() ?? directory
  const deepLink = `opencode://open-session?directory=${encodeURIComponent(directory)}&id=${encodeURIComponent(sessionID)}`
  const res = await fetch(`${NTFY_URL}/${NTFY_TOPIC}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NTFY_TOKEN}`,
      Title: meta.title,
      Priority: meta.priority,
      Tags: meta.tags,
      Click: deepLink,
      Actions: `view, Open Anemos, ${deepLink}, clear=true`,
    },
    body: `${project} · ${sessionID.slice(0, 8)}`,
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`ntfy publish failed (${res.status}): ${text}`)
  }
}

const plugin: Plugin = async ({ directory }) => {
  const roots = new Map<string, boolean>()
  const dirs = new Map<string, string>()
  const cool = new Map<string, number>()
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
        await publish(item.kind, item.sessionID, dirs.get(item.sessionID) ?? directory)
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
