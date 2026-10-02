import path from "node:path"

/** Directory holding the vendored Tree-sitter grammars and highlight queries. */
export const PARSER_DIR = path.join(import.meta.dir, "..", "parsers")

export type CustomParser = {
  readonly filetype: string
  readonly aliases?: readonly string[]
  readonly wasm: string
  readonly highlights: string
}

/**
 * Grammars OpenTUI does not bundle. Assets are produced by
 * `scripts/update-tree-sitter-assets.ts`.
 */
export const CUSTOM_PARSERS: readonly CustomParser[] = [
  {
    filetype: "csharp",
    aliases: ["cs", "c_sharp"],
    wasm: "tree-sitter-c_sharp.wasm",
    highlights: "queries/c-sharp/highlights.scm",
  },
  {
    filetype: "json",
    wasm: "tree-sitter-json.wasm",
    highlights: "queries/json/highlights.scm",
  },
]
