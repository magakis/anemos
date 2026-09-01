import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDirectory = path.dirname(fileURLToPath(import.meta.url))
const sourceDirectory = path.resolve(packageDirectory, 'src')
const browserStub = path.resolve(sourceDirectory, 'shims/browser-stub.ts')

// ANEMOS-PATCH: expose the mobile HTML entry at the root for the combined native bundle.
const chamberHtmlOutput = (): Plugin => ({
  name: 'anemos-chamber-html-output',
  enforce: 'post', // ANEMOS-PATCH: run after Vite emits the nested mobile HTML asset.
  generateBundle(_options, bundle) {
    const mobileEntry = Object.values(bundle).find(
      (item) => item.type === 'asset' && item.fileName === 'mobile/index.html',
    )
    if (!mobileEntry || mobileEntry.type !== 'asset') return
    const source = typeof mobileEntry.source === 'string'
      ? mobileEntry.source
      : new TextDecoder().decode(mobileEntry.source)
    this.emitFile({
      type: 'asset',
      fileName: 'chamber.html',
      source: source.replace(/(["'(])\.\.\/assets\//g, '$1./assets/'),
    })
  },
})

export default defineConfig({
  root: packageDirectory,
  plugins: [react(), tailwindcss(), chamberHtmlOutput()],
  resolve: {
    alias: {
      // ANEMOS-PATCH: resolve vendored package imports and its source alias from this package root.
      '@openchamber/ui': sourceDirectory,
      '@': sourceDirectory,
      // ANEMOS-PATCH: prevent server-only dependencies from entering the browser bundle.
      express: browserStub,
      'http-proxy-middleware': browserStub,
      'simple-git': browserStub,
    },
  },
  worker: {
    format: 'es',
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  server: {
    port: 4455,
  },
  base: './',
  build: {
    outDir: path.resolve(packageDirectory, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        chamber: path.resolve(packageDirectory, 'mobile/index.html'),
      },
      external: ['node:child_process', 'node:fs', 'node:path', 'node:url'],
    },
  },
})
