// Just enough PNG for the code card: read a code's PNG into pixels, shrink it, and write a small PNG back.
// Mods run with no DOM, no Node and no DecompressionStream, so the inflate is vendored and the writer uses stored
// (uncompressed) deflate blocks, which every PNG reader accepts.
import inflate from './inflate.js'

// the environment has the ES2026 base64 methods on Uint8Array; TypeScript's lib does not declare them yet
type Base64Bytes = { toBase64(this: Uint8Array): string }
export const toBase64 = (bytes: Uint8Array): string => (bytes as Uint8Array & Base64Bytes).toBase64()
export const fromBase64 = (text: string): Uint8Array =>
  (Uint8Array as unknown as { fromBase64(text: string): Uint8Array }).fromBase64(text)

/** Pixels as RGB, 3 bytes each, row-major. */
export type Rgb = { width: number; height: number; data: Uint8Array }

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

const u32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
const typeOf = (b: Uint8Array, i: number) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3])

/** Decodes an 8-bit, non-interlaced PNG (the kind QRX serves) into RGB, flattening alpha onto white. */
export function decodePng(bytes: Uint8Array): Rgb {
  for (let i = 0; i < 8; i++) if (bytes[i] !== SIGNATURE[i]) throw new Error('not a PNG')
  let width = 0
  let height = 0
  let colorType = 0
  let palette: Uint8Array | undefined
  let alphas: Uint8Array | undefined
  const parts: Uint8Array[] = []
  let total = 0
  for (let at = 8; at + 8 <= bytes.length; ) {
    const length = u32(bytes, at)
    const type = typeOf(bytes, at + 4)
    const body = bytes.subarray(at + 8, at + 8 + length)
    if (type === 'IHDR') {
      width = u32(body, 0)
      height = u32(body, 4)
      colorType = body[9]
      if (body[8] !== 8) throw new Error(`unsupported PNG bit depth ${body[8]}`)
      if (body[12] !== 0) throw new Error('interlaced PNGs are not supported')
      if (!(colorType in CHANNELS)) throw new Error(`unsupported PNG color type ${colorType}`)
    } else if (type === 'PLTE') palette = body
    else if (type === 'tRNS') alphas = body
    else if (type === 'IDAT') {
      parts.push(body)
      total += body.length
    } else if (type === 'IEND') break
    at += 12 + length
  }
  if (!width || !height || !parts.length) throw new Error('PNG has no image data')

  const zlib = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    zlib.set(part, offset)
    offset += part.length
  }
  const bpp = CHANNELS[colorType]
  const stride = width * bpp
  // the zlib header is 2 bytes; the Adler-32 at the end is not checked
  const raw = inflate(zlib.subarray(2), new Uint8Array(height * (stride + 1))) as Uint8Array
  if (raw.length !== height * (stride + 1)) throw new Error('PNG image data is truncated')

  const pixels = new Uint8Array(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const src = y * (stride + 1) + 1
    const row = y * stride
    const up = row - stride
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? pixels[row + x - bpp] : 0
      const b = y > 0 ? pixels[up + x] : 0
      const c = x >= bpp && y > 0 ? pixels[up + x - bpp] : 0
      let value = raw[src + x]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      pixels[row + x] = value & 255
    }
  }

  const data = new Uint8Array(width * height * 3)
  for (let i = 0, o = 0; i < width * height; i++, o += 3) {
    let r: number
    let g: number
    let b: number
    let alpha = 255
    if (colorType === 2 || colorType === 6) {
      r = pixels[i * bpp]
      g = pixels[i * bpp + 1]
      b = pixels[i * bpp + 2]
      if (colorType === 6) alpha = pixels[i * bpp + 3]
    } else if (colorType === 3) {
      const index = pixels[i]
      r = palette ? palette[index * 3] : 0
      g = palette ? palette[index * 3 + 1] : 0
      b = palette ? palette[index * 3 + 2] : 0
      if (alphas && index < alphas.length) alpha = alphas[index]
    } else {
      r = g = b = pixels[i * bpp]
      if (colorType === 4) alpha = pixels[i * bpp + 1]
    }
    data[o] = (r * alpha + 255 * (255 - alpha)) / 255
    data[o + 1] = (g * alpha + 255 * (255 - alpha)) / 255
    data[o + 2] = (b * alpha + 255 * (255 - alpha)) / 255
  }
  return { width, height, data }
}

/** Shrinks by averaging each target pixel's box of source pixels. */
export function shrink(image: Rgb, width: number, height: number): Rgb {
  const data = new Uint8Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor((y * image.height) / height)
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * image.height) / height))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor((x * image.width) / width)
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * image.width) / width))
      let r = 0
      let g = 0
      let b = 0
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * image.width + sx) * 3
          r += image.data[i]
          g += image.data[i + 1]
          b += image.data[i + 2]
        }
      }
      const n = (y1 - y0) * (x1 - x0)
      const o = (y * width + x) * 3
      data[o] = r / n
      data[o + 1] = g / n
      data[o + 2] = b / n
    }
  }
  return { width, height, data }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, body: Uint8Array) {
  const out = new Uint8Array(12 + body.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, body.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(body, 8)
  view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)))
  return out
}

/** Writes RGB pixels as a PNG whose image data is stored, not compressed. */
export function encodePng(image: Rgb): Uint8Array {
  const stride = image.width * 3
  const raw = new Uint8Array(image.height * (stride + 1))
  for (let y = 0; y < image.height; y++) raw.set(image.data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)

  const blocks = Math.max(1, Math.ceil(raw.length / 65535))
  const zlib = new Uint8Array(2 + raw.length + blocks * 5 + 4)
  zlib[0] = 0x78
  zlib[1] = 0x01
  let at = 2
  for (let i = 0; i < blocks; i++) {
    const start = i * 65535
    const length = Math.min(65535, raw.length - start)
    zlib[at] = i === blocks - 1 ? 1 : 0
    zlib[at + 1] = length & 255
    zlib[at + 2] = length >> 8
    zlib[at + 3] = ~length & 255
    zlib[at + 4] = (~length >> 8) & 255
    zlib.set(raw.subarray(start, start + length), at + 5)
    at += 5 + length
  }
  let s1 = 1
  let s2 = 0
  for (let i = 0; i < raw.length; i++) {
    s1 = (s1 + raw[i]) % 65521
    s2 = (s2 + s1) % 65521
  }
  new DataView(zlib.buffer).setUint32(at, ((s2 << 16) | s1) >>> 0)

  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, image.width)
  view.setUint32(4, image.height)
  header[8] = 8
  header[9] = 2
  const parts = [new Uint8Array(SIGNATURE), chunk('IHDR', header), chunk('IDAT', zlib), chunk('IEND', new Uint8Array(0))]
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}
