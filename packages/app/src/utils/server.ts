import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"
import type { ServerConnection } from "@/context/server"

// UPSTREAM-DIVERGENCE-FILE: Server auth header generation was split out after upstream sync 6b9ce5e63
// so the fork's push pairing helpers can reuse the exact same HTTP auth behavior as the shared SDK.

export function serverAuthHeaders(server: ServerConnection.HttpBase) {
  if (!server.password) return
  return {
    Authorization: `Basic ${btoa(`${server.username ?? "opencode"}:${server.password}`)}`,
  }
}

export function createSdkForServer({
  server,
  ...config
}: Omit<NonNullable<Parameters<typeof createOpencodeClient>[0]>, "baseUrl"> & {
  server: ServerConnection.HttpBase
}) {
  const auth = serverAuthHeaders(server)

  return createOpencodeClient({
    ...config,
    headers: { ...config.headers, ...auth },
    baseUrl: server.url,
  })
}
