export type EntryKind = "file" | "directory"

export type FileEntry = {
  readonly path: string
  readonly type: EntryKind
}
