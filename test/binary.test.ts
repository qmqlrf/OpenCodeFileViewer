import { describe, expect, test } from "bun:test"
import { decodeFile, formatBytes } from "../src/lib/binary"

const encoder = new TextEncoder()

describe("file decoding", () => {
  test("decodes utf-8 text", () => {
    const result = decodeFile(encoder.encode("hello\nworld"), 1024)
    expect(result).toEqual({ kind: "text", text: "hello\nworld" })
  })

  test("detects binary content via NUL bytes", () => {
    const result = decodeFile(new Uint8Array([0x89, 0x50, 0x00, 0x4e]), 1024)
    expect(result.kind).toBe("binary")
  })

  test("reports oversized files", () => {
    const result = decodeFile(new Uint8Array(2048), 1024)
    expect(result).toEqual({ kind: "too-large", size: 2048 })
  })

  test("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(2048)).toBe("2.0 KB")
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB")
  })
})
