/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui"
import { FileViewerPanel } from "./panel"
import { createFileViewerDeps, type FileViewerOptions } from "./deps"
import { ensureParsers } from "./lib/highlight"

const PANEL_NAME = "opencode.fileviewer"
const OPEN_COMMAND = "fileviewer.open"

export default Plugin.define({
  id: "opencode.fileviewer",
  async setup(context) {
    const cleanups: Array<() => void> = []

    try {
      const deps = createFileViewerDeps(context, context.options as FileViewerOptions)

      // Commands must be registered from a mounted component so the keymap
      // provider is available, hence the `app` slot instead of `setup` directly.
      cleanups.push(
        context.ui.slot({
          append: "app",
          render: () => {
            context.keymap.layer(() => ({
              mode: "global",
              commands: [
                {
                  id: OPEN_COMMAND,
                  title: "Open file viewer",
                  description: "Browse the workspace and preview files",
                  group: "File viewer",
                  palette: true,
                  slash: { name: "files", aliases: ["fv", "fileviewer"] },
                  run: () => {
                    if (!context.ui.panel.open(PANEL_NAME, { presentation: "fullscreen" })) {
                      context.ui.toast.show({
                        title: "File viewer",
                        message: "Open a session first.",
                        variant: "warning",
                      })
                    }
                  },
                },
              ],
              bindings: [OPEN_COMMAND],
            }))
            return null
          },
        }),
      )

      cleanups.push(
        context.ui.slot({
          append: "session.panel",
          render: (panel) => (panel.name === PANEL_NAME ? <FileViewerPanel panel={panel} deps={deps} /> : null),
        }),
      )

      void ensureParsers().catch((error: unknown) => {
        console.error("[fileviewer] tree-sitter grammars failed to load", error)
      })
    } catch (error) {
      console.error("[fileviewer] setup failed", error)
      context.ui.toast.show({
        title: "File viewer",
        message: `Failed to load: ${String(error)}`,
        variant: "error",
      })
    }

    return () => {
      for (const dispose of cleanups) dispose()
    }
  },
})
