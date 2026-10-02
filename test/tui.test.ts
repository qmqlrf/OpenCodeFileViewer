import { expect, test } from "bun:test"
import tui from "../src/tui"

test("exposes a TUI plugin definition", () => {
  expect(tui.id).toBe("opencode.fileviewer")
  expect(typeof tui.setup).toBe("function")
})
