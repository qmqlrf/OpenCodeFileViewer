import type { LocationRef } from "@opencode/client"
import { SyntaxStyle, type RGBA } from "@opentui/core"
import type { Plugin } from "@opencode/plugin/tui"
import type { FileEntry } from "./lib/types"
import { createFileSource } from "./lib/api"
import { createIgnore } from "./lib/ignore"
import { filetypeForPath } from "./lib/filetype"

export type FileViewerColors = {
  readonly text: RGBA
  readonly muted: RGBA
  readonly border: RGBA
  readonly background: RGBA
  readonly selectedBackground: RGBA
  readonly selectedText: RGBA
}

/** Everything the panel needs, decoupled from the OpenCode plugin context. */
export type FileViewerDeps = {
  readonly location: LocationRef
  readonly list: (path?: string) => Promise<FileEntry[]>
  readonly read: (path: string) => Promise<Uint8Array>
  readonly filetype: (path: string) => string | undefined
  readonly shouldIgnore: (name: string) => boolean
  readonly syntaxStyle: SyntaxStyle
  readonly colors: FileViewerColors
  readonly keymap: Plugin.Context["keymap"]
  readonly maxFileSize: number
}

export type FileViewerOptions = {
  readonly ignore?: readonly string[]
  readonly includeHidden?: boolean
  readonly maxFileSize?: number
}

type TokenStyle = { fg?: RGBA; bold?: boolean; italic?: boolean; underline?: boolean }

/**
 * Build a syntax style from the host theme tokens. Avoids importing
 * `@opencode/theme` at runtime, which is not part of the documented plugin API.
 */
function buildSyntaxStyle(context: Plugin.Context): SyntaxStyle {
  try {
    const styles: Record<string, TokenStyle> = {}
    for (const [token, color] of Object.entries(context.theme.syntax)) styles[token] = { fg: color }
    const markdown = context.theme.markdown
    styles["markup.heading"] = { fg: markdown.heading, bold: true }
    styles["markup.link"] = { fg: markdown.link, underline: true }
    styles["markup.raw"] = { fg: markdown.code }
    styles["markup.raw.inline"] = { fg: markdown.code }
    styles["markup.raw.block"] = { fg: markdown.codeBlock }
    styles["markup.quote"] = { fg: markdown.blockQuote, italic: true }
    styles["markup.italic"] = { fg: markdown.emphasis, italic: true }
    styles["markup.bold"] = { fg: markdown.strong, bold: true }
    styles["markup.list"] = { fg: markdown.listItem }
    styles.default = { fg: context.theme.text.default }
    return SyntaxStyle.fromStyles(styles)
  } catch (error) {
    console.error("[fileviewer] failed to build syntax style", error)
    return SyntaxStyle.fromStyles({ default: { fg: context.theme.text.default } })
  }
}

export function createFileViewerDeps(context: Plugin.Context, options: FileViewerOptions = {}): FileViewerDeps {
  const location = context.location ?? context.data.location.default()
  const source = createFileSource(context.client, location)
  return {
    location,
    list: (path) => source.list(path),
    read: (path) => source.read(path),
    filetype: filetypeForPath,
    shouldIgnore: createIgnore({ patterns: options.ignore, includeHidden: options.includeHidden }),
    syntaxStyle: buildSyntaxStyle(context),
    colors: {
      text: context.theme.text.default,
      muted: context.theme.text.subdued,
      border: context.theme.border.default,
      background: context.theme.background.default,
      selectedBackground: context.theme.text.default,
      selectedText: context.theme.background.default,
    },
    keymap: context.keymap,
    maxFileSize: options.maxFileSize ?? 512 * 1024,
  }
}
