// ANEMOS-PATCH: provide a browser-safe fallback if a server-only module is pulled into the mobile graph.
export const createProxyMiddleware = (): never => {
  throw new Error('This server-only integration is unavailable in the browser surface.')
}

// ANEMOS-PATCH: satisfy the SDK's abort-process import without bundling Node's child_process module.
export const spawnSync = (): never => {
  throw new Error('This server-only process integration is unavailable in the browser surface.')
}

export default createProxyMiddleware
