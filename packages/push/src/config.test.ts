import { describe, expect, test } from "bun:test"
import { cut, merge } from "./config"

describe("push config", () => {
  test("dedupes package entries by package name", () => {
    const list = merge(["@anemos/push@0.1.0"], "@anemos/push@0.x")
    expect(list).toEqual(["@anemos/push@0.x"])
  })

  test("rewrites pinned package entry to unpinned spec", () => {
    const list = merge(["@anemos/push@0.1.0"], "@anemos/push")
    expect(list).toEqual(["@anemos/push"])
  })

  test("removes package entries by package name", () => {
    const list = cut(["@anemos/push@0.x", "foo@1.0.0"], "@anemos/push")
    expect(list).toEqual(["foo@1.0.0"])
  })
})
