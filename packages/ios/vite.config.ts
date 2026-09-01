import { defineConfig } from "vite"
import appPlugin from "@opencode-ai/app/vite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createCombinedBundlePlugin } from "../shared/selector/vite-plugin"

const packageDirectory = path.dirname(fileURLToPath(import.meta.url))
const selectorHtml = path.resolve(packageDirectory, "../shared/selector/selector.html")
const chamberHtml = path.resolve(packageDirectory, "../chamber-ui/dist/chamber.html")
const selectorEnabled = process.env.ANEMOS_SELECTOR !== "0"

export default defineConfig({
  root: packageDirectory,
  plugins: [createCombinedBundlePlugin({ chamberHtml, selectorEnabled }), appPlugin],
  publicDir: "../app/public",
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 1421,
    strictPort: true,
  },
  build: {
    outDir: "WebAssets",
    emptyOutDir: true,
    target: "esnext",
    assetsDir: "assets/classic",
    rollupOptions: {
      input: {
        classic: path.resolve(packageDirectory, "classic.html"),
        selector: selectorHtml,
        chamber: chamberHtml,
      },
      output: {
        entryFileNames: "assets/classic/[name]-[hash].js",
        chunkFileNames: "assets/classic/[name]-[hash].js",
        assetFileNames: "assets/classic/[name]-[hash][extname]",
      },
    },
  },
})
