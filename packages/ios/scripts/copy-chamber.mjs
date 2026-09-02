// ANEMOS-PATCH: copy the separately built Chamber bundle into iOS's local asset tree.

import { access, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const chamberDirectory = path.resolve(packageDirectory, "../chamber-ui/dist")
const outputDirectory = path.resolve(packageDirectory, "WebAssets")
const nodeImportSpecifier = /\b(?:from|import)\s*(?:\(\s*)?["']node:/

const findPoisonedChunks = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const poisoned = []
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      poisoned.push(...await findPoisonedChunks(filePath))
      continue
    }
    if (!entry.isFile() || !/\.m?js$/i.test(entry.name)) continue
    const source = await readFile(filePath, "utf8")
    if (nodeImportSpecifier.test(source)) poisoned.push(path.relative(outputDirectory, filePath))
  }
  return poisoned
}

const copyChamber = async () => {
  const sourceHtml = path.join(chamberDirectory, "chamber.html")
  const sourceAssets = path.join(chamberDirectory, "assets")
  await access(sourceHtml)
  await access(sourceAssets)

  const targetAssets = path.join(outputDirectory, "assets", "chamber")
  await mkdir(outputDirectory, { recursive: true })
  await rm(targetAssets, { recursive: true, force: true })
  await mkdir(path.dirname(targetAssets), { recursive: true })
  await cp(sourceAssets, targetAssets, { recursive: true })

  const html = await readFile(sourceHtml, "utf8")
  const rewrittenHtml = html.replace(/(["'(])(?:\.\.\/|\.\/|\/)?assets\//g, "$1./assets/chamber/")
  await writeFile(path.join(outputDirectory, "chamber.html"), rewrittenHtml)

  // ANEMOS-PATCH: reject browser bundles that still contain unresolved Node imports.
  const poisonedChunks = await findPoisonedChunks(targetAssets)
  if (poisonedChunks.length > 0) {
    throw new Error(`Refusing to copy poisoned Chamber bundle; node: imports found in ${poisonedChunks.join(", ")}`)
  }

  const selectorAssets = path.join(outputDirectory, "assets", "selector")
  await mkdir(selectorAssets, { recursive: true })
  await writeFile(path.join(selectorAssets, ".keep"), "")
  await writeFile(
    path.join(outputDirectory, "selector-config.json"),
    JSON.stringify({ enabled: process.env.ANEMOS_SELECTOR !== "0" }),
  )
}

copyChamber().catch((error) => {
  console.error(`[copy-chamber] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
