import type { FileEntry } from "./types"
import { basename } from "./tree"

export type IgnoreOptions = {
  /** Extra name patterns. `*` is supported as a wildcard. */
  readonly patterns?: readonly string[]
  /** When false, names beginning with a dot are hidden. Defaults to true. */
  readonly includeHidden?: boolean
}

const DEFAULT_NAMES = [
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "coverage",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".DS_Store",
  "Thumbs.db",
]

function escapeRegExp(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&")
}

function toRegExp(pattern: string): RegExp {
  const escaped = pattern.split("*").map(escapeRegExp).join(".*")
  return new RegExp(`^${escaped}$`)
}

export function createIgnore(options: IgnoreOptions = {}): (name: string) => boolean {
  const patterns = [...DEFAULT_NAMES, ...(options.patterns ?? [])].map(toRegExp)
  const includeHidden = options.includeHidden ?? true
  return (name: string) => {
    if (!includeHidden && name.startsWith(".")) return true
    return patterns.some((pattern) => pattern.test(name))
  }
}

export function filterEntries(
  entries: readonly FileEntry[],
  shouldIgnore: (name: string) => boolean,
): FileEntry[] {
  return entries.filter((entry) => !shouldIgnore(basename(entry.path)))
}
