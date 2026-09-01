import { defineConfig } from "vite"
import appPlugin from "@opencode-ai/app/vite"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "vite"

const packageDirectory = path.dirname(fileURLToPath(import.meta.url))
const selectorHtml = path.resolve(packageDirectory, "selector.html")
const selectorSource = path.resolve(packageDirectory, "../shared/selector/selector.html")

// ANEMOS-PATCH: keep the selector Rollup input local while sourcing its shared markup.
const localSelectorPlugin = (): Plugin => ({
  name: "anemos-local-selector-html",
  enforce: "pre",
  load(id) {
    if (id !== selectorHtml) return null
    return fs.readFileSync(selectorSource, "utf8")
  },
})

export default defineConfig({
  root: packageDirectory,
  plugins: [localSelectorPlugin(), appPlugin],
  publicDir: "../app/public",
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 1422,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "esnext",
    assetsDir: "assets/classic",
    rollupOptions: {
      input: {
        classic: path.resolve(packageDirectory, "classic.html"),
        // ANEMOS-PATCH: shell Vite owns only local entries; Chamber is copied post-build.
        selector: selectorHtml,
      },
      output: {
        entryFileNames: "assets/classic/[name]-[hash].js",
        chunkFileNames: "assets/classic/[name]-[hash].js",
        assetFileNames: "assets/classic/[name]-[hash][extname]",
      },
    },
  },
})
