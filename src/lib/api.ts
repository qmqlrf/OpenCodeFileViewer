import type { LocationRef, OpenCodeClient } from "@opencode/client"
import type { FileEntry } from "./types"

export interface FileSource {
  list(path?: string): Promise<FileEntry[]>
  read(path: string): Promise<Uint8Array>
}

/** Wraps the location-scoped filesystem API exposed by the OpenCode client. */
export function createFileSource(client: OpenCodeClient, location: LocationRef): FileSource {
  return {
    async list(path) {
      const result = await client.file.list({ location, path })
      return result.data.map((entry) => ({ path: entry.path, type: entry.type }))
    },
    async read(path) {
      return client.file.read({ location, path })
    },
  }
}
