import fs from "node:fs"
import path from "node:path"

type BundleItem = {
  type: "asset" | "chunk"
  fileName: string
  source?: string | Uint8Array
}

type Bundle = Record<string, BundleItem>

const walkFiles = (directory: string): string[] => {
  const files: string[] = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(file))
    else files.push(file)
  }
  return files
}

const rewriteChamberAssetUrls = (html: string) => html.replace(/(["'(])(?:\.\/|\/)?assets\//g, "$1./assets/chamber/")

export const createCombinedBundlePlugin = (options: { chamberHtml: string; selectorEnabled: boolean }) => ({
  name: "anemos-combined-bundle",
  enforce: "pre" as const,
  load(id: string) {
    if (id !== options.chamberHtml) return null
    if (!fs.existsSync(options.chamberHtml)) {
      throw new Error(`The chamber bundle is missing: ${options.chamberHtml}. Build @openchamber/ui first.`)
    }
    return "<!doctype html><html><head><meta charset=\"UTF-8\"></head><body></body></html>"
  },
  generateBundle(this: { emitFile: (item: { type: "asset"; fileName: string; source: string | Uint8Array }) => void }, _output: unknown, bundle: Bundle) {
    const chamberDirectory = path.dirname(options.chamberHtml)
    const chamberHtml = rewriteChamberAssetUrls(fs.readFileSync(options.chamberHtml, "utf8"))
    const chamberOutput = Object.values(bundle).find((item) => item.type === "asset" && item.fileName === "chamber.html")
    if (chamberOutput) chamberOutput.source = chamberHtml
    else this.emitFile({ type: "asset", fileName: "chamber.html", source: chamberHtml })

    for (const file of walkFiles(chamberDirectory)) {
      if (file === options.chamberHtml) continue
      const relative = path.relative(chamberDirectory, file).split(path.sep).join("/")
      const assetPath = relative.startsWith("assets/") ? relative.slice("assets/".length) : relative
      this.emitFile({
        type: "asset",
        fileName: `assets/chamber/${assetPath}`,
        source: fs.readFileSync(file),
      })
    }

    this.emitFile({
      type: "asset",
      fileName: "selector-config.json",
      source: JSON.stringify({ enabled: options.selectorEnabled }),
    })
    this.emitFile({ type: "asset", fileName: "assets/selector/.keep", source: "" })
  },
})
