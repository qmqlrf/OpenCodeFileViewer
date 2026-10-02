import { describe, expect, test } from "bun:test"
import { charWidth, displayWidth, sliceByWidth } from "../src/lib/text"

describe("text widths", () => {
  test("counts ascii as one column", () => {
    expect(displayWidth("abc.ts")).toBe(6)
  })

  test("counts wide characters as two columns", () => {
    expect(charWidth("中")).toBe(2)
    expect(displayWidth("中文.ts")).toBe(7)
  })

  test("ignores combining marks", () => {
    expect(displayWidth("e\u0301")).toBe(1)
  })

  test("slices a window by columns", () => {
    expect(sliceByWidth("abcdef", 0, 3)).toBe("abc")
    expect(sliceByWidth("abcdef", 2, 3)).toBe("cde")
    expect(sliceByWidth("abcdef", 4, 3)).toBe("ef")
    expect(sliceByWidth("abcdef", 6, 3)).toBe("")
  })

  test("slices wide text without splitting beyond the window", () => {
    expect(sliceByWidth("中文字", 0, 2)).toBe("中")
    expect(sliceByWidth("中文字", 2, 2)).toBe("文")
    expect(sliceByWidth("中文字", 3, 3)).toBe("文字")
  })
})
