import fs from "fs/promises"
import { randomUUID } from "crypto"
import { logFile, stateDir, stateFile } from "./path.js"

export type Kind = "complete" | "error" | "approval" | "question" | "test"

export type Item = {
  v: 1
  event_id: string
  kind: Kind
  session_id: string | null
  request_id: string | null
  occurred_at: number
  collapse_id: string
}

export type Relay = {
  url: string
  channel: string
  secret: string
  server?: string
  checked?: number
  result?: "accepted" | "suppressed" | "failed" | "ok"
  reason?: string
  delivery?: string
  err?: string
}

export type Data = {
  v: 1
  mode: "local" | "relay"
  root: Record<string, boolean>
  cool: Record<string, number>
  relay?: Relay
  last?: Item
  updated_at?: number
}

const init = (): Data => ({
  v: 1,
  mode: "local",
  root: {},
  cool: {},
})

export async function load() {
  const file = stateFile()
  const text = await fs.readFile(file, "utf8").catch(() => "")
  if (!text) return init()
  try {
    const data = JSON.parse(text) as Partial<Data>
    return {
      ...init(),
      ...data,
      root: data.root ?? {},
      cool: data.cool ?? {},
    } satisfies Data
  } catch {
    return init()
  }
}

export async function save(data: Data) {
  await fs.mkdir(stateDir(), { recursive: true })
  const file = stateFile()
  const tmp = file + ".tmp"
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8")
  await fs.chmod(tmp, 0o600).catch(() => {
    // console.warn("push: failed to set permissions on state file")
  })
  await fs.rename(tmp, file)
}

const LOCK_MS = 20000
const WAIT_MS = 250
const STEP_MS = 25

function stateLockFile() {
  return stateFile() + ".lock"
}

async function acquireStateLock(): Promise<(() => Promise<void>) | undefined> {
  const file = stateLockFile()
  const stop = Date.now() + WAIT_MS
  await fs.mkdir(stateDir(), { recursive: true }).catch(() => undefined)
  for (;;) {
    const found = await fs.stat(file).then((i) => i).catch(() => undefined)
    if (found && Date.now() - found.mtimeMs > LOCK_MS) {
      const gone = await fs.rm(file, { force: true }).then(() => true).catch(() => false)
      if (!gone) return undefined
      continue
    }
    const lock = await fs.open(file, "wx").then((i) => i).catch((err: unknown) => {
      if ((err as NodeJS.ErrnoException)?.code === "EEXIST") return undefined
      throw err
    })
    if (lock) {
      await lock.writeFile(String(process.pid))
      return async () => {
        await lock.close().catch(() => undefined)
        await fs.rm(file, { force: true }).catch(() => undefined)
      }
    }
    if (Date.now() >= stop) return undefined
    await new Promise((done) => setTimeout(done, STEP_MS))
  }
}

export async function withStateLock(fn: () => Promise<void>) {
  const release = await acquireStateLock()
  if (!release) return
  try {
    await fn()
  } finally {
    await release()
  }
}

export async function append(item: Item) {
  await fs.mkdir(stateDir(), { recursive: true })
  const file = logFile()
  await fs.appendFile(file, JSON.stringify(item) + "\n", "utf8")
  await fs.chmod(file, 0o600).catch(() => {
    // console.warn("push: failed to set permissions on log file")
  })
}

export function next(kind: Kind, session?: string | null, req?: string | null): Item {
  const now = Date.now()
  const sid = session ?? null
  return {
    v: 1,
    event_id: randomUUID(),
    kind,
    session_id: sid,
    request_id: req ?? null,
    occurred_at: now,
    collapse_id: `${kind}:${sid ?? "global"}`,
  }
}
