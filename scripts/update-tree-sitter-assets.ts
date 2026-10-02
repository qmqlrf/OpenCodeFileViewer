import path from "node:path"
import { copyFile, mkdir, writeFile } from "node:fs/promises"

const root = path.join(import.meta.dir, "..")
const outDir = path.join(root, "src", "parsers")
const wasmSource = path.join(root, "node_modules", "tree-sitter-wasms", "out")

const parsers = [
  {
    wasm: "tree-sitter-c_sharp.wasm",
    highlights:
      "https://raw.githubusercontent.com/tree-sitter/tree-sitter-c-sharp/v0.20.0/queries/highlights.scm",
    output: path.join(outDir, "queries", "c-sharp", "highlights.scm"),
  },
  {
    wasm: "tree-sitter-json.wasm",
    highlights: "https://raw.githubusercontent.com/tree-sitter/tree-sitter-json/v0.20.2/queries/highlights.scm",
    output: path.join(outDir, "queries", "json", "highlights.scm"),
  },
]

for (const parser of parsers) {
  await copyFile(path.join(wasmSource, parser.wasm), path.join(outDir, parser.wasm))
  const response = await fetch(parser.highlights)
  if (!response.ok) throw new Error(`Failed to download ${parser.highlights}: ${response.status}`)
  await mkdir(path.dirname(parser.output), { recursive: true })
  await writeFile(parser.output, await response.text())
  console.log(`updated ${parser.wasm}`)
}

console.log("tree-sitter assets are up to date")
