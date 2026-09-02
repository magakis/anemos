import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

type ParsedChamberUrl = {
  url?: string
  secure?: boolean
  error?: string
}

const html = readFileSync(resolve(import.meta.dir, "../../selector/selector.html"), "utf8")
const start = html.indexOf("        const parseChamberUrl")
const end = html.indexOf("        const updateChamberUrlState")
if (start < 0 || end < 0 || start >= end) throw new Error("Could not extract Chamber URL validator from selector.html")

const parseChamberUrl = new Function(
  `${html.slice(start, end)}; return parseChamberUrl`,
)() as (value: string) => ParsedChamberUrl

describe("selector Chamber URL validation", () => {
  test.each([
    "http://localhost:42449/",
    "http://optiplex/",
    "http://example.com/",
    "http://8.8.8.8:42449/",
    "http://foo-bar.tailnet.ts.net/",
    "http://[2001:db8::1]:42449/",
    "https://example.com/",
  ])("accepts %s", (value) => {
    expect(parseChamberUrl(value).error).toBeUndefined()
  })

  test.each(["ftp://example.com/", "file:///tmp/chamber", "javascript:alert(1)", "http://", "not a url"])(
    "rejects %s",
    (value) => {
      expect(parseChamberUrl(value).error).toBe("Enter a valid http:// or https:// URL.")
    },
  )
})
