#!/usr/bin/env bun

// Parse --port flag from CLI args
const portArgIndex = process.argv.indexOf("--port")
const port =
  portArgIndex !== -1 && portArgIndex + 1 < process.argv.length
    ? parseInt(process.argv[portArgIndex + 1], 10)
    : 3000

if (Number.isNaN(port)) {
  console.error("Invalid port value. Usage: dev.ts [--port <number>]")
  process.exit(1)
}

const url = `http://localhost:${port}`

// Spawn Vite dev server for packages/app
const child = Bun.spawn(["bun", "run", "--cwd", "packages/app", "dev", "--", "--port", String(port)], {
  stdout: "inherit",
  stderr: "inherit",
  env: { ...process.env },
})

// --- Signal handling ---
const cleanup = (signal: string) => {
  console.log(`\n  Received ${signal}, shutting down...`)
  child.kill(signal)
  process.exit(0)
}

process.on("SIGINT", () => cleanup("SIGINT"))
process.on("SIGTERM", () => cleanup("SIGTERM"))

// --- Poll for server readiness ---
const maxAttempts = 60 // 30 seconds at 500ms intervals
let reachable = false

for (let attempt = 0; attempt < maxAttempts && !reachable; attempt++) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 2000)
  try {
    await fetch(url, { signal: controller.signal })
    reachable = true
  } catch {
    // server not ready yet
    await new Promise((r) => setTimeout(r, 500))
  } finally {
    clearTimeout(t)
  }
}

if (reachable) {
  // Auto-open browser
  const { platform } = process
  if (platform === "darwin") {
    Bun.spawn(["open", url], { detached: true, stdio: "ignore" }).unref()
  } else if (platform === "win32") {
    Bun.spawn(["cmd", "/c", "start", "", url], { detached: true, stdio: "ignore" }).unref()
  } else {
    Bun.spawn(["xdg-open", url], { detached: true, stdio: "ignore" }).unref()
  }

  // Banner
  const line = (s: string) => `║  ${s.padEnd(56)} ║`
  console.log()
  console.log("╔════════════════════════════════════════════════════════════╗")
  console.log(line("Frontend Dev Server — UI Mode (HMR)"))
  console.log("╠════════════════════════════════════════════════════════════╣")
  console.log(line(`Local:   ${url}`))
  console.log(line(""))
  console.log(line("This is a frontend-only (HMR) server. The backend at"))
  console.log(line("localhost:4096 is NOT running in this fork, so some"))
  console.log(line("features may show connection errors. UI and styling"))
  console.log(line("edits will still hot-reload."))
  console.log("╚════════════════════════════════════════════════════════════╝")
  console.log()
} else {
  console.warn(`\n  ⚠  Server at ${url} did not become reachable within 30s.`)
  console.warn("  It may still be compiling or slow to start.")
  console.warn("  The Vite process is still running.\n")
}

// Propagate child exit code
const exitCode = await child.exited
process.exit(exitCode)
