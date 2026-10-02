import { Plugin } from "@opencode/plugin"

/**
 * The file viewer is a CLI/TUI plugin. This server entrypoint exists so the
 * package can be loaded through `plugins` in `opencode.json(c)`; it does
 * nothing on the server.
 */
export default Plugin.define({
  id: "opencode.fileviewer",
  setup() {},
})
