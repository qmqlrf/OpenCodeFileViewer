import { describe, expect, test } from "bun:test"
import {
  basename,
  createFileTree,
  flattenTree,
  moveSelection,
  moveSelectionToFirstChild,
  moveSelectionToParent,
  rowPrefix,
  setDirectoryChildren,
  setExpanded,
} from "../src/lib/tree"

describe("file tree", () => {
  test("sorts directories before files and by name", () => {
    const tree = setDirectoryChildren(createFileTree(), undefined, [
      { path: "b.txt", type: "file" },
      { path: "src", type: "directory" },
      { path: "a.txt", type: "file" },
    ])
    expect(flattenTree(tree).map((row) => row.name)).toEqual(["src", "a.txt", "b.txt"])
  })

  test("expands directories with children at the right depth", () => {
    const tree = setDirectoryChildren(createFileTree(), undefined, [
      { path: "b.txt", type: "file" },
      { path: "src", type: "directory" },
    ])
    const srcId = flattenTree(tree)[0]!.id
    const withChildren = setDirectoryChildren(tree, srcId, [
      { path: "src/lib", type: "directory" },
      { path: "src/index.ts", type: "file" },
    ])
    const expanded = setExpanded(withChildren, srcId, true)
    const rows = flattenTree(expanded)

    expect(rows.map((row) => row.name)).toEqual(["src", "lib", "index.ts", "b.txt"])
    expect(rows[0]!.depth).toBe(0)
    expect(rows[1]!.depth).toBe(1)
    expect(rows[2]!.depth).toBe(1)
  })

  test("collapsing hides descendants", () => {
    const tree = setDirectoryChildren(createFileTree(), undefined, [{ path: "src", type: "directory" }])
    const srcId = flattenTree(tree)[0]!.id
    const withChildren = setDirectoryChildren(tree, srcId, [{ path: "src/index.ts", type: "file" }])
    const expanded = setExpanded(withChildren, srcId, true)
    expect(flattenTree(expanded)).toHaveLength(2)

    const collapsed = setExpanded(expanded, srcId, false)
    expect(flattenTree(collapsed).map((row) => row.name)).toEqual(["src"])
  })

  test("reloading a directory drops stale descendants", () => {
    const tree = setDirectoryChildren(createFileTree(), undefined, [{ path: "src", type: "directory" }])
    const srcId = flattenTree(tree)[0]!.id
    const first = setDirectoryChildren(tree, srcId, [{ path: "src/old.ts", type: "file" }])
    const second = setDirectoryChildren(first, srcId, [{ path: "src/new.ts", type: "file" }])
    const rows = flattenTree(setExpanded(second, srcId, true))
    expect(rows.map((row) => row.name)).toEqual(["src", "new.ts"])
  })

  test("keyboard movement helpers", () => {
    const tree = setDirectoryChildren(createFileTree(), undefined, [
      { path: "src", type: "directory" },
      { path: "z.txt", type: "file" },
    ])
    const srcId = flattenTree(tree)[0]!.id
    const nested = setDirectoryChildren(tree, srcId, [{ path: "src/index.ts", type: "file" }])
    const rows = flattenTree(setExpanded(nested, srcId, true))

    expect(moveSelection(rows, undefined, 1)).toBe(rows[0]!.id)
    expect(moveSelection(rows, rows[0]!.id, 1)).toBe(rows[1]!.id)
    expect(moveSelection(rows, rows[2]!.id, 5)).toBe(rows[2]!.id)
    expect(moveSelectionToFirstChild(rows, rows[0]!.id)).toBe(rows[1]!.id)
    expect(moveSelectionToParent(rows, rows[1]!.id)).toBe(rows[0]!.id)
  })

  test("renders tree prefixes", () => {
    const tree = setDirectoryChildren(createFileTree(), undefined, [
      { path: "a", type: "directory" },
      { path: "b", type: "file" },
    ])
    const aId = flattenTree(tree)[0]!.id
    const rows = flattenTree(
      setExpanded(
        setDirectoryChildren(tree, aId, [
          { path: "a/x", type: "file" },
          { path: "a/y", type: "file" },
        ]),
        aId,
        true,
      ),
    )
    expect(rowPrefix(rows, 0, rows[0]!)).toContain("▾")
    expect(rowPrefix(rows, 1, rows[1]!)).toContain("├─")
    expect(rowPrefix(rows, 2, rows[2]!)).toContain("└─")
  })

  test("basename handles nested paths", () => {
    expect(basename("src/lib/tree.ts")).toBe("tree.ts")
    expect(basename("README.md")).toBe("README.md")
  })
})
