/** Display-width helpers that treat East Asian wide characters as two columns. */

function isWide(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  )
}

/** Width of a single character in terminal columns. */
export function charWidth(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0
  if (codePoint === 0) return 0
  if (codePoint < 32 || (codePoint >= 0x7f && codePoint < 0xa0)) return 0
  if (codePoint >= 0x0300 && codePoint <= 0x036f) return 0
  if (codePoint >= 0x200b && codePoint <= 0x200f) return 0
  return isWide(codePoint) ? 2 : 1
}

/** Total display width of a string in terminal columns. */
export function displayWidth(text: string): number {
  let width = 0
  for (const char of text) width += charWidth(char)
  return width
}

/**
 * Return the substring covering the columns `[startColumn, startColumn + maxColumns)`.
 * Characters that straddle the window edges are included whole.
 */
export function sliceByWidth(text: string, startColumn: number, maxColumns: number): string {
  if (maxColumns <= 0 || startColumn < 0) return ""
  const end = startColumn + maxColumns
  let column = 0
  let out = ""
  for (const char of text) {
    const width = charWidth(char)
    const next = column + width
    if (next <= startColumn) {
      column = next
      continue
    }
    out += char
    column = next
    if (column >= end) break
  }
  return out
}
