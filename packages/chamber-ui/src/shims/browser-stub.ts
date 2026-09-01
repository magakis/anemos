// ANEMOS-PATCH: provide a browser-safe fallback if a server-only module is pulled into the mobile graph.
export const createProxyMiddleware = (): never => {
  throw new Error('This server-only integration is unavailable in the browser surface.')
}

export default createProxyMiddleware
