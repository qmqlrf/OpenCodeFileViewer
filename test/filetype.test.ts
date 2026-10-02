import { describe, expect, test } from "bun:test"
import { filetypeForPath } from "../src/lib/filetype"

describe("filetype resolution", () => {
  test("maps supported languages", () => {
    expect(filetypeForPath("Program.cs")).toBe("csharp")
    expect(filetypeForPath("app.json")).toBe("json")
    expect(filetypeForPath("app.jsonc")).toBe("json")
    expect(filetypeForPath("README.md")).toBe("markdown")
    expect(filetypeForPath("main.ts")).toBe("typescript")
  })

  test("returns undefined for unsupported languages", () => {
    expect(filetypeForPath("notes.txt")).toBeUndefined()
    expect(filetypeForPath("main.rs")).toBeUndefined()
    expect(filetypeForPath("image.png")).toBeUndefined()
  })
})
