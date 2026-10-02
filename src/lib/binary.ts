export type DecodedFile =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "binary" }
  | { readonly kind: "too-large"; readonly size: number }

const SAMPLE_BYTES = 8000

/**
 * Decide whether a file can be shown as text. Files larger than `maxBytes` are
 * reported as `too-large`, and files containing a NUL byte in the first sample
 * are reported as `binary`.
 */
export function decodeFile(bytes: Uint8Array, maxBytes: number): DecodedFile {
  if (bytes.byteLength > maxBytes) return { kind: "too-large", size: bytes.byteLength }
  const sample = Math.min(bytes.byteLength, SAMPLE_BYTES)
  for (let i = 0; i < sample; i += 1) {
    if (bytes[i] === 0) return { kind: "binary" }
  }
  return { kind: "text", text: new TextDecoder("utf-8", { fatal: false }).decode(bytes) }
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
