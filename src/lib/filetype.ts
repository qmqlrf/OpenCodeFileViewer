import { extensionToFiletype, pathToFiletype } from "@opentui/core"

if (!extensionToFiletype.has("jsonc")) extensionToFiletype.set("jsonc", "json")

/**
 * File types we can highlight. `csharp` and `json` come from the grammars this
 * plugin registers; the rest ship with OpenTUI. Everything else renders as
 * unstyled text (still with line numbers).
 */
const SUPPORTED = new Set([
  "csharp",
  "json",
  "markdown",
  "markdown_inline",
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
  "zig",
])

export function filetypeForPath(path: string): string | undefined {
  const filetype = pathToFiletype(path)
  return filetype && SUPPORTED.has(filetype) ? filetype : undefined
}
