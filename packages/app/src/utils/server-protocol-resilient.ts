// UPSTREAM-DIVERGENCE-FILE: Added after upstream sync 6b9ce5e63 to wrap detectServerProtocol with a retry +
// v2 JSON verify. Until upstream completes the v2 route migration, an incomplete-v2 server answers /api/config
// and /api/mcp with text/html (SPA fallback), which makes the generated SDK throw "Server responded with
// text/html" and toast-fail bootstrap. This wrapper verifies /api/config returns JSON before committing to v2
// and falls back to healthy v1. No-ops once upstream completes the v2 migration (the probe always succeeds,
// so this behaves exactly like detectServerProtocol).

import type { ServerConnection } from "@/context/server"
import { authTokenFromCredentials } from "./server"
import { detectServerProtocol, type ServerProtocol } from "@/utils/server-protocol"

// Mirrors the private `headers` helper in server-protocol.ts:6-11 so this fork wrapper stays self-contained.
function headers(server: ServerConnection.HttpBase) {
  if (!server.password) return
  return {
    Authorization: `Basic ${authTokenFromCredentials({ username: server.username, password: server.password })}`,
  }
}

// Mirrors the private `probe` helper in server-protocol.ts:13-22 (including its content-type and object
// checks), returning parsed JSON or undefined on non-JSON / non-2xx / timeout / parse failure. The duplication
// is intentional so this fork module never depends on upstream internals.
async function probeJson(
  server: ServerConnection.HttpBase,
  fetch: typeof globalThis.fetch,
  path: string,
): Promise<unknown | undefined> {
  try {
    const response = await fetch(new URL(path, server.url), {
      headers: headers(server),
      signal: AbortSignal.timeout(3_000),
    })
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return
    const value: unknown = await response.json()
    if (!value || typeof value !== "object") return
    return value
  } catch {
    return
  }
}

export async function detectServerProtocolResilient(
  server: ServerConnection.HttpBase,
  fetch: typeof globalThis.fetch,
): Promise<ServerProtocol> {
  const result = await detectServerProtocol(server, fetch)
  if (result === "v1") return "v1"

  if (await probeJson(server, fetch, "/api/config")) return "v2"

  // /api/config did not answer with JSON — retry once to rule out a transient /global/health miss before
  // downgrading to v1.
  const retry = await detectServerProtocol(server, fetch)
  if (retry === "v1") return "v1"
  if (await probeJson(server, fetch, "/api/config")) return "v2"
  return "v1"
}

