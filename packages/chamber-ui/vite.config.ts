import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDirectory = path.dirname(fileURLToPath(import.meta.url))
const sourceDirectory = path.resolve(packageDirectory, 'src')
const browserStub = path.resolve(sourceDirectory, 'shims/browser-stub.ts')

export default defineConfig({
  root: packageDirectory,
  plugins: [react(), tailwindcss()],
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
