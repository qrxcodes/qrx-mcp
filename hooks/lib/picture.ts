// How the card draws a code's picture on each surface, and when it points to the full-quality image.
import type { Code } from './code.ts'

/** `pixels`: an Image (kitty, Ghostty); `cells`: a Raster of half blocks (other terminals); `svg`: the Desktop app and the editor. */
export type PictureKind = 'pixels' | 'cells' | 'svg'

/** The largest PNG an Image takes (2 MiB decoded), as base64. */
export const MAX_IMAGE_BASE64 = Math.floor(((2 * 1024 * 1024) / 3) * 4)

export function pictureKind(surface: string, terminalImages: boolean, pngBase64Length: number): PictureKind {
  if (surface !== 'terminal') return 'svg'
  return terminalImages && pngBase64Length <= MAX_IMAGE_BASE64 ? 'pixels' : 'cells'
}

/** The link under a cell-drawn picture, which loses detail: the code's PNG, or its QRX page when there is no PNG link. */
export function fullQualityUrl(kind: PictureKind, code: Code): string | undefined {
  return kind === 'cells' ? (code.imageUrl ?? code.pageUrl) : undefined
}
