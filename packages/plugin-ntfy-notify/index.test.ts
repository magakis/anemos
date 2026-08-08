import { afterEach, describe, expect, test } from "bun:test"
import fs from "node:fs"

// Stub filesystem writes so tests never touch the real home directory log.
const logLines: string[] = []
fs.promises.appendFile = (async (_path: unknown, data: unknown) => {
  logLines.push(String(data))
  return undefined
}) as typeof fs.promises.appendFile
fs.promises.chmod = (async () => undefined) as typeof fs.promises.chmod
fs.promises.mkdir = (async () => undefined) as typeof fs.promises.mkdir

// Stub network so tests never hit the real ntfy server.
const publishes: Array<{ url: string; init: RequestInit }> = []
globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
  publishes.push({ url: String(url), init: init ?? {} })
  return new Response("ok", { status: 200 })
}) as typeof fetch

process.env.NTFY_URL = "https://ntfy.example.test"
process.env.NTFY_TOPIC = "test-topic"
process.env.NTFY_TOKEN = "test-token"
delete process.env.NTFY_TEST
const { default: plugin } = await import("./index.ts")

const DEFAULT_SESSION = { id: "s1", title: "Fix the bug", directory: "/tmp/proj", projectID: "p1" }

function makeClient(session?: Record<string, unknown> | undefined) {
  return {
    session: {
      get: async () => ({ data: session ?? DEFAULT_SESSION }),
    },
  }
}

function makeShell(commonDir?: string) {
  const promise = { text: async () => commonDir ?? "" }
  const fn = (() => promise) as unknown as (strings: TemplateStringsArray, ...exprs: unknown[]) => typeof promise
  const shell = Object.assign(fn, {
    nothrow: () => shell,
    quiet: () => shell,
    cwd: () => shell,
    env: () => shell,
    throws: () => shell,
  })
  return shell
}

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    directory: "/tmp/proj",
    client: makeClient(),
    $: makeShell("/home/michael/IT/anemos/.git"),
    ...overrides,
  }
}

function evt(type: string, properties: Record<string, unknown>) {
  return { id: "evt-1", type, properties }
}

async function drive(
  input: Record<string, unknown>,
  events: Array<{ id: string; type: string; properties: Record<string, unknown> }>,
) {
  const hooks = await plugin(input as never)
  for (const event of events) {
    await hooks.event!({ event })
  }
}

afterEach(() => {
  publishes.length = 0
  logLines.length = 0
})

describe("ntfy-notify plugin", () => {
  test("publishes complete notification with project name title and worktree + session title body", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.idle", { sessionID: "s1" }),
    ])

    expect(publishes.length).toBe(1)
    const call = publishes[0]
    expect(call.url).toBe("https://ntfy.example.test/test-topic")
    const headers = call.init.headers as Record<string, string>
    expect(headers.Authorization).toBe("Bearer test-token")
    expect(headers.Title).toBe("anemos")
    expect(headers.Priority).toBe("default")
    expect(headers.Tags).toBe("white_check_mark")
    expect(headers.Click).toBe("opencode://open-session?directory=%2Ftmp%2Fproj&id=s1")
    expect(headers.Actions).toBe("view, Open Anemos, opencode://open-session?directory=%2Ftmp%2Fproj&id=s1, clear=true")
    expect(call.init.body).toBe("proj — Fix the bug")
  })

  test("strips the auto-generated timestamp from the session title in the body", async () => {
    await drive(
      makeInput({ client: makeClient({ ...DEFAULT_SESSION, title: "New session - 2026-01-01T00:00:00.000Z" }) }),
      [evt("session.created", { info: { id: "s1", parentID: undefined } }), evt("session.idle", { sessionID: "s1" })],
    )
    expect(publishes[0].init.body).toBe("proj — New session")
  })

  test("keeps user-edited session titles as-is in the body", async () => {
    await drive(makeInput({ client: makeClient({ ...DEFAULT_SESSION, title: "My custom title" }) }), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.idle", { sessionID: "s1" }),
    ])
    expect(publishes[0].init.body).toBe("proj — My custom title")
  })

  test("falls back to directory basename title and worktree body when session fetch fails", async () => {
    const client = { session: { get: async () => Promise.reject(new Error("boom")) } }
    await drive(makeInput({ client }), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.idle", { sessionID: "s1" }),
    ])
    expect(publishes.length).toBe(1)
    const headers = publishes[0].init.headers as Record<string, string>
    expect(headers.Title).toBe("proj")
    expect(publishes[0].init.body).toBe("proj")
  })

  test("falls back to directory basename title when git project lookup fails", async () => {
    await drive(makeInput({ $: makeShell("") }), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.idle", { sessionID: "s1" }),
    ])
    const headers = publishes[0].init.headers as Record<string, string>
    expect(headers.Title).toBe("proj")
    expect(publishes[0].init.body).toBe("proj — Fix the bug")
  })

  test("suppresses subagent sessions", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "sub1", parentID: "root1" } }),
      evt("session.idle", { sessionID: "sub1" }),
    ])
    expect(publishes.length).toBe(0)
  })

  test("treats unknown sessions as root (mirrors push plugin semantics)", async () => {
    await drive(makeInput(), [evt("session.idle", { sessionID: "never-seen" })])
    expect(publishes.length).toBe(1)
  })

  test("falls back to the plugin directory when the session directory is unknown", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.idle", { sessionID: "s1" }),
    ])
    const headers = publishes[0].init.headers as Record<string, string>
    expect(headers.Click).toBe("opencode://open-session?directory=%2Ftmp%2Fproj&id=s1")
    expect(publishes[0].init.body).toBe("proj — Fix the bug")
  })

  test("uses the session's own directory when known", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined, directory: "/srv/other-project" } }),
      evt("session.idle", { sessionID: "s1" }),
    ])
    const headers = publishes[0].init.headers as Record<string, string>
    expect(headers.Click).toBe("opencode://open-session?directory=%2Fsrv%2Fother-project&id=s1")
    expect(headers.Actions).toBe(
      "view, Open Anemos, opencode://open-session?directory=%2Fsrv%2Fother-project&id=s1, clear=true",
    )
    expect(publishes[0].init.body).toBe("other-project — Fix the bug")
  })

  test("updates the session directory on session.updated", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined, directory: "/srv/first" } }),
      evt("session.updated", { info: { id: "s1", parentID: undefined, directory: "/srv/second" } }),
      evt("session.idle", { sessionID: "s1" }),
    ])
    const headers = publishes[0].init.headers as Record<string, string>
    expect(headers.Click).toBe("opencode://open-session?directory=%2Fsrv%2Fsecond&id=s1")
  })

  test("URL-encodes the sessionID in the Click header", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "abc/def?x=1&y=2", parentID: undefined } }),
      evt("session.idle", { sessionID: "abc/def?x=1&y=2" }),
    ])
    const headers = publishes[0].init.headers as Record<string, string>
    expect(headers.Click).toBe("opencode://open-session?directory=%2Ftmp%2Fproj&id=abc%2Fdef%3Fx%3D1%26y%3D2")
    expect(headers.Actions).toBe(
      "view, Open Anemos, opencode://open-session?directory=%2Ftmp%2Fproj&id=abc%2Fdef%3Fx%3D1%26y%3D2, clear=true",
    )
  })

  test("publishes error notification on session.error with kind tags", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.error", { sessionID: "s1" }),
    ])
    expect(publishes.length).toBe(1)
    const headers = publishes[0].init.headers as Record<string, string>
    expect(headers.Title).toBe("anemos")
    expect(headers.Priority).toBe("urgent")
    expect(headers.Tags).toBe("rotating_light")
  })

  test("publishes approval notification on permission.asked with kind tags", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("permission.asked", { id: "perm-1", sessionID: "s1" }),
    ])
    expect(publishes.length).toBe(1)
    const headers = publishes[0].init.headers as Record<string, string>
    expect(headers.Title).toBe("anemos")
    expect(headers.Priority).toBe("urgent")
    expect(headers.Tags).toBe("lock")
  })

  test("publishes question notification on question.asked with kind tags", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("question.asked", { id: "q-1", sessionID: "s1" }),
    ])
    expect(publishes.length).toBe(1)
    const headers = publishes[0].init.headers as Record<string, string>
    expect(headers.Title).toBe("anemos")
    expect(headers.Priority).toBe("high")
    expect(headers.Tags).toBe("question")
  })

  test("publishes complete on session.status idle", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.status", { sessionID: "s1", status: { type: "idle" } }),
    ])
    expect(publishes.length).toBe(1)
    expect((publishes[0].init.headers as Record<string, string>).Title).toBe("anemos")
  })

  test("ignores session.status busy", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.status", { sessionID: "s1", status: { type: "busy" } }),
    ])
    expect(publishes.length).toBe(0)
  })

  test("cooldown dedupes repeated idle events for the same session", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.idle", { sessionID: "s1" }),
      evt("session.idle", { sessionID: "s1" }),
      evt("session.status", { sessionID: "s1", status: { type: "idle" } }),
    ])
    expect(publishes.length).toBe(1)
  })

  test("cooldown is keyed per session", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.created", { info: { id: "s2", parentID: undefined } }),
      evt("session.idle", { sessionID: "s1" }),
      evt("session.idle", { sessionID: "s2" }),
    ])
    expect(publishes.length).toBe(2)
  })

  test("does not throw on unknown event types", async () => {
    await expect(drive(makeInput(), [evt("something.unknown", {})])).resolves.toBeUndefined()
    expect(publishes.length).toBe(0)
  })

  test("logs a record to NDJSON on publish", async () => {
    await drive(makeInput(), [
      evt("session.created", { info: { id: "s1", parentID: undefined } }),
      evt("session.idle", { sessionID: "s1" }),
    ])
    expect(logLines.length).toBe(1)
    const record = JSON.parse(logLines[0])
    expect(record.kind).toBe("complete")
    expect(record.sessionID).toBe("s1")
    expect(record.status).toBe("sent")
    expect(record.topic).toBe("test-topic")
    expect(JSON.stringify(record)).not.toContain("test-token")
  })

  test("records failure status when publish returns non-2xx without throwing", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => new Response("nope", { status: 500 })) as typeof fetch
    try {
      await drive(makeInput(), [
        evt("session.created", { info: { id: "s1", parentID: undefined } }),
        evt("session.idle", { sessionID: "s1" }),
      ])
    } finally {
      globalThis.fetch = originalFetch
    }
    expect(logLines.length).toBe(1)
    const record = JSON.parse(logLines[0])
    expect(record.status).toBe("failed")
    expect(record.error).toContain("500")
  })
})

describe("ntfy-notify plugin disabled", () => {
  test("does not publish and logs disabled record when NTFY_TOKEN is missing", async () => {
    process.env.NTFY_TOKEN = ""
    delete process.env.NTFY_URL
    delete process.env.NTFY_TOPIC
    const { default: disabledPlugin } = await import("./index.ts?disabled")
    process.env.NTFY_TOKEN = "test-token"

    const hooks = await disabledPlugin({ directory: "/tmp/proj" })
    await hooks.event!({
      event: evt("session.created", { info: { id: "s1", parentID: undefined } }),
    })
    await hooks.event!({ event: evt("session.idle", { sessionID: "s1" }) })

    expect(publishes.length).toBe(0)
    expect(logLines.length).toBe(1)
    expect(JSON.parse(logLines[0]).status).toBe("disabled")
  })
})
