import { describe, expect, test } from "bun:test"
import { createIgnore, filterEntries } from "../src/lib/ignore"

describe("ignore rules", () => {
  test("ignores common noise directories by default", () => {
    const shouldIgnore = createIgnore()
    expect(shouldIgnore("node_modules")).toBe(true)
    expect(shouldIgnore(".git")).toBe(true)
    expect(shouldIgnore("dist")).toBe(true)
    expect(shouldIgnore("src")).toBe(false)
    expect(shouldIgnore("README.md")).toBe(false)
  })

  test("supports wildcard patterns", () => {
    const shouldIgnore = createIgnore({ patterns: ["*.min.js"] })
    expect(shouldIgnore("bundle.min.js")).toBe(true)
    expect(shouldIgnore("bundle.js")).toBe(false)
  })

  test("can hide dotfiles", () => {
    const shouldIgnore = createIgnore({ includeHidden: false })
    expect(shouldIgnore(".env")).toBe(true)
    expect(shouldIgnore(".env.example")).toBe(true)
    expect(shouldIgnore("env")).toBe(false)
  })

  test("filters entries by base name", () => {
    const shouldIgnore = createIgnore()
    const entries = filterEntries(
      [
        { path: "node_modules", type: "directory" },
        { path: "src", type: "directory" },
        { path: "a.ts", type: "file" },
      ],
      shouldIgnore,
    )
    expect(entries.map((entry) => entry.path)).toEqual(["src", "a.ts"])
  })
})
