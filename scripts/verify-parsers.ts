import path from "node:path"
import os from "node:os"
import { TreeSitterClient } from "@opentui/core"

const parsersDir = path.join(import.meta.dir, "..", "src", "parsers")

const specs = [
  {
    filetype: "csharp",
    wasm: "tree-sitter-c_sharp.wasm",
    query: "c-sharp/highlights.scm",
    sample: `public class Hello {\n  // a comment\n  public static void Main() { string s = "hi"; int n = 42; }\n}`,
  },
  {
    filetype: "json",
    wasm: "tree-sitter-json.wasm",
    query: "json/highlights.scm",
    sample: `{"name": "value", "n": 42, "ok": true}`,
  },
]

const client = new TreeSitterClient({ dataPath: path.join(os.tmpdir(), "opencode-file-viewer-verify") })
try {
  await client.initialize()
  for (const spec of specs) {
    client.addFiletypeParser({
      filetype: spec.filetype,
      wasm: path.join(parsersDir, spec.wasm),
      queries: { highlights: [path.join(parsersDir, "queries", spec.query)] },
    })
  }
  for (const spec of specs) {
    const preloaded = await client.preloadParser(spec.filetype)
    console.log(`${spec.filetype}: preload=${preloaded}`)
    const result = await client.highlightOnce(spec.sample, spec.filetype)
    console.log(
      `${spec.filetype}: highlights=${result.highlights?.length ?? 0} warning=${result.warning ?? "-"} error=${result.error ?? "-"}`,
    )
  }
} finally {
  await client.destroy()
}
