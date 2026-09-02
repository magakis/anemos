import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

type ParsedChamberUrl = {
  url?: string
  secure?: boolean
  error?: string
}

const html = readFileSync(resolve(import.meta.dir, "../../selector/selector.html"), "utf8")
const start = html.indexOf("        const isPrivateIPv4")
const end = html.indexOf("        const updateChamberUrlState")
if (start < 0 || end < 0 || start >= end) throw new Error("Could not extract Chamber URL validator from selector.html")

const parseChamberUrl = new Function(
  `${html.slice(start, end)}; return parseChamberUrl`,
)() as (value: string) => ParsedChamberUrl

describe("selector Chamber URL validation", () => {
  test.each([
    "http://localhost:42449/",
    "http://127.0.0.1:42449/",
    "http://[::1]:42449/",
    "http://100.64.0.1:42449/",
    "http://192.168.1.20:42449/",
    "http://[fc00::1]:42449/",
    "http://foo.local:42449/",
    "http://optiplex/",
    "http://optiplex:42448/",
    "http://foo-bar.tailnet.ts.net/",
    "http://nas.lan/",
    "http://x.internal/",
    "https://example.com/",
  ])("accepts %s", (value) => {
    expect(parseChamberUrl(value).error).toBeUndefined()
  })

  test.each(["http://example.com/", "http://github.com/", "http://8.8.8.8:42449/"])("rejects %s", (value) => {
    expect(parseChamberUrl(value).error).toContain("use https")
  })
})
