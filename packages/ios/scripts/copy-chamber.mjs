// ANEMOS-PATCH: copy the separately built Chamber bundle into iOS's local asset tree.

import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const chamberDirectory = path.resolve(packageDirectory, "../chamber-ui/dist")
const outputDirectory = path.resolve(packageDirectory, "WebAssets")

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
