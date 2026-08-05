// UPSTREAM-DIVERGENCE-FILE: Added after upstream sync 6b9ce5e63 to cover the fork's resilient protocol
// detection (retry + v2 JSON verify) until upstream completes the v2 route migration.

import { describe, expect, test } from "bun:test"
import { detectServerProtocolResilient } from "./server-protocol-resilient"

const server = { url: "http://localhost:4096" }
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } })
const textHtml = () =>
  new Response("<html><body>app</body></html>", { status: 200, headers: { "content-type": "text/html" } })
const mockFetch = (run: (input: string | URL | Request) => Promise<Response>) =>
  Object.assign(run, { preconnect: globalThis.fetch.preconnect })

describe("detectServerProtocolResilient", () => {
  test("returns v1 immediately without probing /api/config", async () => {
    let configProbes = 0
    const fetcher = mockFetch((input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      if (path === "/global/health") return Promise.resolve(json({ healthy: true, version: "1.18.4" }))
      if (path === "/api/config") configProbes++
      return Promise.resolve(json({}))
    })

    expect(await detectServerProtocolResilient(server, fetcher)).toBe("v1")
    expect(configProbes).toBe(0)
  })

  test("returns v2 when /api/config answers with JSON", async () => {
    const fetcher = mockFetch((input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      if (path === "/global/health") return Promise.resolve(json({}, 404))
      if (path === "/api/health") return Promise.resolve(json({ healthy: true, version: "2.0.0", pid: 123 }))
      if (path === "/api/config") return Promise.resolve(json({ directory: "/tmp/test" }))
      return Promise.resolve(json({}))
    })

    expect(await detectServerProtocolResilient(server, fetcher)).toBe("v2")
  })

  test("downgrades to v1 when v2 data endpoints still return text/html", async () => {
    const fetcher = mockFetch((input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      if (path === "/global/health") return Promise.resolve(json({}, 404))
      if (path === "/api/health") return Promise.resolve(json({ healthy: true, version: "2.0.0", pid: 123 }))
      if (path === "/api/config") return Promise.resolve(textHtml())
      return Promise.resolve(json({}))
    })

    expect(await detectServerProtocolResilient(server, fetcher)).toBe("v1")
  })

  test("recovers to v2 when a retried /api/config probe returns JSON", async () => {
    let configProbes = 0
    const fetcher = mockFetch((input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname
      if (path === "/global/health") return Promise.resolve(json({}, 404))
      if (path === "/api/health") return Promise.resolve(json({ healthy: true, version: "2.0.0", pid: 123 }))
      if (path === "/api/config") {
        configProbes++
        return Promise.resolve(configProbes === 1 ? textHtml() : json({ directory: "/tmp/test" }))
      }
      return Promise.resolve(json({}))
    })

    expect(await detectServerProtocolResilient(server, fetcher)).toBe("v2")
    expect(configProbes).toBe(2)
  })
})

