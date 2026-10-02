import type { EntryKind, FileEntry } from "./types"

export type TreeNode = {
  readonly id: number
  readonly name: string
  readonly path: string
  readonly kind: EntryKind
  readonly depth: number
  readonly parent: number | undefined
  readonly children: readonly number[]
  readonly loaded: boolean
  readonly expanded: boolean
}

export type FileTree = {
  readonly nodes: ReadonlyMap<number, TreeNode>
  readonly roots: readonly number[]
  readonly nextId: number
}

export type TreeRow = {
  readonly id: number
  readonly depth: number
  readonly kind: EntryKind
  readonly name: string
  readonly expanded: boolean
}

export function createFileTree(): FileTree {
  return { nodes: new Map(), roots: [], nextId: 1 }
}

type MutableTree = { nodes: Map<number, TreeNode>; roots: number[]; nextId: number }

function cloneTree(tree: FileTree): MutableTree {
  const nodes = new Map<number, TreeNode>()
  for (const [id, node] of tree.nodes) nodes.set(id, { ...node, children: [...node.children] })
  return { nodes, roots: [...tree.roots], nextId: tree.nextId }
}

function collectSubtree(nodes: ReadonlyMap<number, TreeNode>, id: number, out: number[]): void {
  out.push(id)
  for (const child of nodes.get(id)?.children ?? []) collectSubtree(nodes, child, out)
}

export function basename(path: string): string {
  const segments = path.split("/").filter(Boolean)
  return segments[segments.length - 1] ?? path
}

function compareEntries(left: FileEntry, right: FileEntry): number {
  if (left.type !== right.type) return left.type === "directory" ? -1 : 1
  const a = basename(left.path).toLowerCase()
  const b = basename(right.path).toLowerCase()
  if (a < b) return -1
  if (a > b) return 1
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0
}

/**
 * Replace the children of `parentId` (or the roots when omitted) with `entries`,
 * creating fresh nodes. Existing descendants of the replaced children are
 * dropped. Entries are sorted directories-first, then by name.
 */
export function setDirectoryChildren(
  tree: FileTree,
  parentId: number | undefined,
  entries: readonly FileEntry[],
): FileTree {
  const next = cloneTree(tree)
  const parent = parentId === undefined ? undefined : next.nodes.get(parentId)
  const previous = parent ? parent.children : next.roots

  for (const childId of previous) {
    const removed: number[] = []
    collectSubtree(next.nodes, childId, removed)
    for (const id of removed) next.nodes.delete(id)
  }

  const sorted = entries.filter((entry) => entry.path.length > 0).slice().sort(compareEntries)
  const ids = sorted.map((entry) => {
    const id = next.nextId
    next.nextId += 1
    next.nodes.set(id, {
      id,
      name: basename(entry.path),
      path: entry.path,
      kind: entry.type,
      depth: parent ? parent.depth + 1 : 0,
      parent: parentId,
      children: [],
      loaded: entry.type === "file",
      expanded: false,
    })
    return id
  })

  if (parent) next.nodes.set(parent.id, { ...parent, children: ids, loaded: true })
  else next.roots = ids

  return next
}

export function setExpanded(tree: FileTree, id: number, expanded: boolean): FileTree {
  const node = tree.nodes.get(id)
  if (!node || node.kind !== "directory" || node.expanded === expanded) return tree
  const next = cloneTree(tree)
  next.nodes.set(id, { ...node, expanded })
  return next
}

export function flattenTree(tree: FileTree): TreeRow[] {
  const rows: TreeRow[] = []
  const visit = (id: number): void => {
    const node = tree.nodes.get(id)
    if (!node) return
    rows.push({ id: node.id, depth: node.depth, kind: node.kind, name: node.name, expanded: node.expanded })
    if (node.kind === "directory" && node.expanded) {
      for (const child of node.children) visit(child)
    }
  }
  for (const root of tree.roots) visit(root)
  return rows
}

export function findRowIndex(rows: readonly TreeRow[], id: number | undefined): number {
  if (id === undefined) return -1
  return rows.findIndex((row) => row.id === id)
}

export function firstRowId(rows: readonly TreeRow[]): number | undefined {
  return rows[0]?.id
}

/** Adapted from the OpenCode TUI diff viewer (`diff-viewer-file-tree-utils.ts`, MIT). */
export function moveSelection(
  rows: readonly TreeRow[],
  selected: number | undefined,
  offset: number,
): number | undefined {
  if (rows.length === 0) return undefined
  const index = findRowIndex(rows, selected)
  if (index === -1) return rows[0]?.id
  return rows[Math.max(0, Math.min(rows.length - 1, index + offset))]?.id
}

/** Adapted from the OpenCode TUI diff viewer (`diff-viewer-file-tree-utils.ts`, MIT). */
export function moveSelectionToFirstChild(rows: readonly TreeRow[], selected: number | undefined): number | undefined {
  const index = findRowIndex(rows, selected)
  const row = index === -1 ? undefined : rows[index]
  if (row?.kind !== "directory") return selected
  const child = rows[index + 1]
  return child && child.depth > row.depth ? child.id : selected
}

/** Adapted from the OpenCode TUI diff viewer (`diff-viewer-file-tree-utils.ts`, MIT). */
export function moveSelectionToParent(rows: readonly TreeRow[], selected: number | undefined): number | undefined {
  const index = findRowIndex(rows, selected)
  const row = index === -1 ? undefined : rows[index]
  if (!row || row.depth === 0) return selected
  return rows.findLast((item, itemIndex) => itemIndex < index && item.depth < row.depth)?.id ?? selected
}

/** Adapted from the OpenCode TUI diff viewer (`diff-viewer-file-tree.tsx`, MIT). */
export function rowPrefix(rows: readonly TreeRow[], index: number, row: TreeRow): string {
  const indentation = Array.from({ length: row.depth }, (_, depth) => {
    if (depth === 0 && !hasLaterSibling(rows, 0, 0)) return " "
    return hasLaterSibling(rows, index, depth) ? "│  " : "   "
  }).join("")
  const topRoot = index === 0 && row.depth === 0
  const branch = topRoot ? " " : hasLaterSibling(rows, index, row.depth) ? "├─ " : "└─ "
  const marker = row.kind === "directory" ? (row.expanded ? "▾ " : "▸ ") : ""
  return `${indentation}${branch}${marker}`
}

function hasLaterSibling(rows: readonly TreeRow[], index: number, depth: number): boolean {
  return rows.slice(index + 1).find((row) => row.depth <= depth)?.depth === depth
}
