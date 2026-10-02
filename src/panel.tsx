/** @jsxImportSource @opentui/solid */
import { For, Match, Show, Switch, createEffect, createMemo, createSignal, onMount } from "solid-js"
import type { ScrollBoxRenderable } from "@opentui/core"
import type { FileViewerDeps } from "./deps"
import { decodeFile, formatBytes, type DecodedFile } from "./lib/binary"
import { filterEntries } from "./lib/ignore"
import { displayWidth, sliceByWidth } from "./lib/text"
import {
  createFileTree,
  findRowIndex,
  flattenTree,
  moveSelection,
  moveSelectionToFirstChild,
  moveSelectionToParent,
  rowPrefix,
  setDirectoryChildren,
  setExpanded,
  type TreeRow,
} from "./lib/tree"

/** Structurally identical to the `session.panel` slot input. */
export type FileViewerPanelInput = {
  readonly name: string
  readonly sessionID: string
  readonly width: number
  readonly presentation: "panel" | "fullscreen"
  readonly focused: boolean
  readonly focus: () => void
  readonly close: () => void
  readonly toggleFullscreen: () => void
}

export type FileViewerPanelProps = {
  readonly panel: FileViewerPanelInput
  readonly deps: FileViewerDeps
}

type FilePreview = { readonly path: string } & DecodedFile

const TREE_MIN_WIDTH = 20
const TREE_MAX_WIDTH = 34
const PAGE_OVERLAP = 3
const TREE_EDGE_MARGIN = 1

export function FileViewerPanel(props: FileViewerPanelProps) {
  const colors = props.deps.colors
  const [tree, setTree] = createSignal(createFileTree())
  const [selected, setSelected] = createSignal<number | undefined>(undefined)
  const [loadingDirs, setLoadingDirs] = createSignal<ReadonlySet<number>>(new Set())
  const [rootLoading, setRootLoading] = createSignal(true)
  const [error, setError] = createSignal<string | undefined>(undefined)
  const [preview, setPreview] = createSignal<FilePreview | undefined>(undefined)
  const [previewLoading, setPreviewLoading] = createSignal(false)
  let previewScroll: ScrollBoxRenderable | undefined
  let treeScroll: ScrollBoxRenderable | undefined
  const [treeReady, setTreeReady] = createSignal(false)

  const rows = createMemo(() => flattenTree(tree()))
  const treeWidth = createMemo(() =>
    Math.max(TREE_MIN_WIDTH, Math.min(TREE_MAX_WIDTH, Math.floor(props.panel.width * 0.32))),
  )
  const viewportWidth = () => {
    const width = treeScroll?.viewport.width
    const raw = width && width > 0 ? width : treeWidth() - 2
    return Math.max(1, raw - TREE_EDGE_MARGIN)
  }
  const selectedRow = createMemo(() => rows().find((row) => row.id === selected()))
  const textContent = createMemo(() => {
    const current = preview()
    return current?.kind === "text" ? current.text : undefined
  })
  const isBinary = createMemo(() => preview()?.kind === "binary")
  const tooLarge = createMemo(() => {
    const current = preview()
    return current?.kind === "too-large" ? current.size : undefined
  })
  const lineCount = createMemo(() => {
    const text = textContent()
    return text === undefined ? undefined : text.split("\n").length
  })

  // Pan the whole tree horizontally so the selected row's right edge meets the
  // tree's right boundary. When the row fits, the offset is 0 (left aligned).
  const horizontalOffset = createMemo(() => {
    const list = rows()
    const index = findRowIndex(list, selected())
    if (index < 0) return 0
    const row = list[index]!
    const full = displayWidth(rowPrefix(list, index, row)) + displayWidth(row.name)
    return Math.max(0, full - viewportWidth())
  })

  const rowView = (row: TreeRow, index: number): { prefix: string; name: string } => {
    const prefix = rowPrefix(rows(), index, row)
    const name = row.name
    const offset = horizontalOffset()
    const width = viewportWidth()
    if (offset <= 0) return { prefix, name }
    const prefixWidth = displayWidth(prefix)
    if (offset >= prefixWidth) return { prefix: "", name: sliceByWidth(name, offset - prefixWidth, width) }
    const visiblePrefix = sliceByWidth(prefix, offset, width)
    const remaining = width - displayWidth(visiblePrefix)
    return { prefix: visiblePrefix, name: sliceByWidth(name, 0, Math.max(0, remaining)) }
  }

  createEffect(() => {
    if (!treeReady()) return
    const scroll = treeScroll
    if (!scroll) return
    const list = rows()
    const index = findRowIndex(list, selected())
    if (index < 0) return
    const height = scroll.viewport.height
    if (height <= 0) return
    if (index < scroll.scrollTop) scroll.scrollTop = index
    else if (index >= scroll.scrollTop + height) scroll.scrollTop = index - height + 1
  })

  const loadRoot = async () => {
    setRootLoading(true)
    setError(undefined)
    try {
      const entries = filterEntries(await props.deps.list(), props.deps.shouldIgnore)
      const next = setDirectoryChildren(createFileTree(), undefined, entries)
      setTree(next)
      setSelected(flattenTree(next)[0]?.id)
    } catch (cause) {
      setError(String(cause))
    } finally {
      setRootLoading(false)
    }
  }

  const loadDirectory = async (row: TreeRow) => {
    const node = tree().nodes.get(row.id)
    if (!node || node.kind !== "directory" || node.loaded) return
    setLoadingDirs((current) => new Set(current).add(row.id))
    setError(undefined)
    try {
      const entries = filterEntries(await props.deps.list(node.path), props.deps.shouldIgnore)
      setTree((current) => setDirectoryChildren(current, row.id, entries))
    } catch (cause) {
      setError(String(cause))
    } finally {
      setLoadingDirs((current) => {
        const next = new Set(current)
        next.delete(row.id)
        return next
      })
    }
  }

  const openFile = async (row: TreeRow) => {
    const node = tree().nodes.get(row.id)
    if (!node || node.kind !== "file") return
    setPreviewLoading(true)
    setError(undefined)
    try {
      const bytes = await props.deps.read(node.path)
      setPreview({ path: node.path, ...decodeFile(bytes, props.deps.maxFileSize) })
      previewScroll?.scrollTo(0)
    } catch (cause) {
      setError(String(cause))
    } finally {
      setPreviewLoading(false)
    }
  }

  const activate = async (row?: TreeRow) => {
    const target = row ?? selectedRow()
    if (!target) return
    if (target.kind === "directory") {
      const expanding = !(tree().nodes.get(target.id)?.expanded ?? false)
      await loadDirectory(target)
      setTree((current) => setExpanded(current, target.id, expanding))
      if (expanding) setSelected((current) => moveSelectionToFirstChild(flattenTree(tree()), current) ?? current)
    } else {
      await openFile(target)
    }
  }

  const move = (offset: number) => setSelected((current) => moveSelection(rows(), current, offset))

  const collapse = () => {
    const row = selectedRow()
    if (row?.kind === "directory" && tree().nodes.get(row.id)?.expanded) {
      setTree((current) => setExpanded(current, row.id, false))
      return
    }
    setSelected((current) => moveSelectionToParent(rows(), current))
  }

  const page = (direction: 1 | -1) => {
    const scroll = previewScroll
    if (!scroll) return
    const step = Math.max(1, scroll.viewport.height - PAGE_OVERLAP)
    scroll.scrollBy(direction * step)
  }

  onMount(() => {
    void loadRoot()
  })

  props.deps.keymap.layer(() => ({
    mode: "global",
    enabled: () => props.panel.focused,
    commands: [
      {
        id: "fileviewer.down",
        title: "File viewer: move down",
        group: "File viewer",
        bind: "down",
        run: () => move(1),
      },
      {
        id: "fileviewer.up",
        title: "File viewer: move up",
        group: "File viewer",
        bind: "up",
        run: () => move(-1),
      },
      {
        id: "fileviewer.open",
        title: "File viewer: open",
        group: "File viewer",
        bind: "return,right",
        run: () => void activate(),
      },
      {
        id: "fileviewer.collapse",
        title: "File viewer: collapse",
        group: "File viewer",
        bind: "left",
        run: () => collapse(),
      },
      {
        id: "fileviewer.page.down",
        title: "File viewer: page down",
        group: "File viewer",
        bind: "pagedown",
        run: () => page(1),
      },
      {
        id: "fileviewer.page.up",
        title: "File viewer: page up",
        group: "File viewer",
        bind: "pageup",
        run: () => page(-1),
      },
      {
        id: "fileviewer.refresh",
        title: "File viewer: refresh",
        group: "File viewer",
        bind: "r",
        run: () => void loadRoot(),
      },
      {
        id: "fileviewer.fullscreen",
        title: "File viewer: toggle fullscreen",
        group: "File viewer",
        bind: "f",
        run: () => props.panel.toggleFullscreen(),
      },
      {
        id: "fileviewer.close",
        title: "File viewer: close",
        group: "File viewer",
        bind: "q,escape",
        run: () => props.panel.close(),
      },
    ],
  }))

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={colors.background}>
      <box flexDirection="row" height={1} flexShrink={0} paddingLeft={1} gap={1}>
        <text fg={colors.text}>
          <b>Files</b>
        </text>
        <text fg={colors.muted} wrapMode="none">
          {props.deps.location.directory}
        </text>
      </box>

      <box flexDirection="row" flexGrow={1} minHeight={0}>
        <box
          width={treeWidth()}
          flexDirection="column"
          flexShrink={0}
          border={["right"]}
          borderColor={colors.border}
        >
          <scrollbox
            ref={(element: ScrollBoxRenderable) => {
              treeScroll = element
              setTreeReady(true)
            }}
            flexGrow={1}
            minHeight={0}
            verticalScrollbarOptions={{ visible: false }}
          >
            <Switch>
              <Match when={rootLoading()}>
                <text fg={colors.muted}> Loading…</text>
              </Match>
              <Match when={!rootLoading() && rows().length === 0}>
                <text fg={colors.muted}> Empty directory</text>
              </Match>
              <Match when={!rootLoading()}>
                <For each={rows()}>
                  {(row, index) => {
                    const active = () => selected() === row.id
                    const view = () => rowView(row, index())
                    return (
                      <box
                        flexDirection="row"
                        width="100%"
                        backgroundColor={active() ? colors.selectedBackground : undefined}
                        onMouseUp={() => {
                          setSelected(row.id)
                          void activate(row)
                        }}
                      >
                        <text
                          fg={active() ? colors.selectedText : colors.muted}
                          wrapMode="none"
                          flexShrink={0}
                        >
                          {view().prefix}
                        </text>
                        <text
                          fg={active() ? colors.selectedText : colors.text}
                          wrapMode="none"
                          flexShrink={0}
                        >
                          {view().name}
                          {loadingDirs().has(row.id) ? " …" : ""}
                        </text>
                      </box>
                    )
                  }}
                </For>
              </Match>
            </Switch>
          </scrollbox>
        </box>

        <box flexGrow={1} minWidth={0} flexDirection="column">
          <box flexDirection="row" height={1} flexShrink={0} paddingLeft={1} gap={1}>
            <text fg={preview() ? colors.text : colors.muted} wrapMode="none">
              {preview()?.path ?? "Select a file"}
            </text>
            <box flexGrow={1} />
            <Show when={lineCount()}>
              {(count) => (
                <text fg={colors.muted} wrapMode="none">
                  {count()} lines
                </text>
              )}
            </Show>
          </box>

          <scrollbox
            ref={(element: ScrollBoxRenderable) => (previewScroll = element)}
            flexGrow={1}
            minHeight={0}
            verticalScrollbarOptions={{ visible: false }}
          >
            <Switch>
              <Match when={previewLoading()}>
                <text fg={colors.muted}> Loading…</text>
              </Match>
              <Match when={error()}>
                <text fg={colors.muted}> Failed: {error()}</text>
              </Match>
              <Match when={!previewLoading() && !preview()}>
                <text fg={colors.muted}> Choose a file from the tree; press enter to open it.</text>
              </Match>
              <Match when={isBinary()}>
                <text fg={colors.muted}> Binary file — preview is not available.</text>
              </Match>
              <Match when={tooLarge() !== undefined}>
                <text fg={colors.muted}> File is too large to preview ({formatBytes(tooLarge() ?? 0)}).</text>
              </Match>
              <Match when={textContent() !== undefined}>
                <line_number minWidth={4} paddingRight={1} fg={colors.muted} bg={colors.background}>
                  <code
                    content={textContent() ?? ""}
                    filetype={props.deps.filetype(preview()?.path ?? "")}
                    syntaxStyle={props.deps.syntaxStyle}
                    width="100%"
                    fg={colors.text}
                    selectable={true}
                  />
                </line_number>
              </Match>
            </Switch>
          </scrollbox>
        </box>
      </box>

      <box height={1} flexShrink={0} paddingLeft={1} flexDirection="row">
        <Show
          when={error()}
          fallback={
            <text fg={colors.muted} wrapMode="none">
              ↑/↓ move · Enter/→ open · ← collapse · PgUp/PgDn page · r refresh · f fullscreen · q close
            </text>
          }
        >
          {(message) => (
            <text fg={colors.muted} wrapMode="none">
              {message()}
            </text>
          )}
        </Show>
      </box>
    </box>
  )
}
