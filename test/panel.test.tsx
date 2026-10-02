import { expect, test } from "bun:test"
import { RGBA, SyntaxStyle } from "@opentui/core"
import { testRender } from "@opentui/solid"
import type { FileViewerDeps } from "../src/deps"
import { FileViewerPanel, type FileViewerPanelInput } from "../src/panel"
import type { FileEntry } from "../src/lib/types"

const syntaxStyle = SyntaxStyle.fromStyles({ default: { fg: RGBA.fromHex("#ffffff") } })

const listing: Record<string, FileEntry[]> = {
  "": [
    { path: "src", type: "directory" },
    { path: "README.md", type: "file" },
  ],
  src: [{ path: "src/index.ts", type: "file" }],
}

function makeDeps(overrides: Partial<FileViewerDeps> = {}): FileViewerDeps {
  return {
    location: { directory: "/project" },
    list: async (path) => listing[path ?? ""] ?? [],
    read: async () => new TextEncoder().encode("hello\nworld\n"),
    filetype: () => undefined,
    shouldIgnore: () => false,
    syntaxStyle,
    colors: {
      text: RGBA.fromHex("#ffffff"),
      muted: RGBA.fromHex("#888888"),
      border: RGBA.fromHex("#444444"),
      background: RGBA.fromHex("#000000"),
      selectedBackground: RGBA.fromHex("#ffffff"),
      selectedText: RGBA.fromHex("#000000"),
    },
    keymap: { layer: () => {} } as unknown as FileViewerDeps["keymap"],
    maxFileSize: 4096,
    ...overrides,
  }
}

const panel: FileViewerPanelInput = {
  name: "opencode.fileviewer",
  sessionID: "session",
  width: 100,
  presentation: "panel",
  focused: true,
  focus: () => {},
  close: () => {},
  toggleFullscreen: () => {},
}

test("renders the workspace tree", async () => {
  const setup = await testRender(() => <FileViewerPanel panel={panel} deps={makeDeps()} />, {
    width: 100,
    height: 24,
  })
  try {
    const frame = await setup.waitForFrame((value) => value.includes("README.md"))
    expect(frame).toContain("src")
    expect(frame).toContain("README.md")
    expect(frame).toContain("/project")
  } finally {
    setup.renderer.destroy()
  }
})

test("opens a file when its tree row is clicked", async () => {
  const setup = await testRender(() => <FileViewerPanel panel={panel} deps={makeDeps()} />, {
    width: 100,
    height: 24,
  })
  try {
    await setup.waitForFrame((value) => value.includes("README.md"))
    // Header occupies row 0; the tree's first two rows are `src` and `README.md`.
    await setup.mockMouse.click(3, 2)
    const frame = await setup.waitForFrame((value) => value.includes("hello"))
    expect(frame).toContain("world")
    expect(frame).toContain("README.md")
  } finally {
    setup.renderer.destroy()
  }
})
