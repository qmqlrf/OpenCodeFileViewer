import path from "node:path"
import { getTreeSitterClient, type TreeSitterClient } from "@opentui/core"
import { CUSTOM_PARSERS, PARSER_DIR } from "./assets"

let pending: Promise<TreeSitterClient> | undefined

/**
 * Register the C# and JSON grammars with OpenTUI's shared Tree-sitter client and
 * preload them. Safe to call multiple times; a failed attempt is retried.
 */
export function ensureParsers(): Promise<TreeSitterClient> {
  pending ??= register().catch((error: unknown) => {
    pending = undefined
    throw error
  })
  return pending
}

async function register(): Promise<TreeSitterClient> {
  const client = getTreeSitterClient()
  await client.initialize()
  for (const parser of CUSTOM_PARSERS) {
    client.addFiletypeParser({
      filetype: parser.filetype,
      aliases: parser.aliases ? [...parser.aliases] : undefined,
      wasm: path.join(PARSER_DIR, parser.wasm),
      queries: { highlights: [path.join(PARSER_DIR, parser.highlights)] },
    })
  }
  await Promise.all(CUSTOM_PARSERS.map((parser) => client.preloadParser(parser.filetype)))
  return client
}
