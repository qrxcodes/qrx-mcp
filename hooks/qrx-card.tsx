// The QRX code card: shows a finished code's picture under the QRX tool call in Claude Code's transcript, with its
// short link and page, and a line while the code is still being painted. The tool's own text is unchanged for Claude
// and for every client that draws nothing.
import type { EngineInterface, Register, RenderElement, RenderInput } from 'claude-code'

import { codeOf, isCodeTool, isQrxUrl, type Code } from './lib/code.ts'
import { decodePng, encodePng, fromBase64, shrink, toBase64, type Rgb } from './lib/png.ts'

type Picture =
  | { state: 'loading' }
  | { state: 'failed'; reason: string }
  | { state: 'ready'; png: string; thumb: string; preview: Rgb }

/** Pictures by code id: a code's image never changes once it is made. */
const pictures = new Map<string, Picture>()

/** The thumbnail the desktop and editor draw: small enough that the SVG holding it stays under 131,072 characters. */
const THUMB = 160
/** The pixels the terminal's cell grid is drawn from. */
const PREVIEW = 96
/** The widest picture the terminal draws, in columns; two pixels go in each cell, one above the other. */
const MAX_COLUMNS = 48
const UPPER_HALF = 0x2580
/** The largest PNG an Image takes (2 MiB decoded), as base64. */
const MAX_IMAGE_BASE64 = Math.floor(((2 * 1024 * 1024) / 3) * 4)

const slash = (path: string) => path.split(String.fromCharCode(92)).join('/')

let tempDir = '/tmp'
let terminalImages = false

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const temp = slash((await $.env.get('TEMP')) || (await $.env.get('TMPDIR')) || '/tmp')
    tempDir = temp.endsWith('/') ? temp.slice(0, -1) : temp
    const term = `${(await $.env.get('TERM')) ?? ''} ${(await $.env.get('TERM_PROGRAM')) ?? ''}`.toLowerCase()
    const multiplexed = Boolean((await $.env.get('TMUX')) || (await $.env.get('STY')))
    // Claude Code draws an Image as pixels only where the terminal has kitty's placeholder images (kitty, Ghostty)
    terminalImages =
      (await $.env.get('CLAUDE_CODE_FORCE_TERMINAL_IMAGES')) === '1' ||
      (!multiplexed && (term.includes('kitty') || term.includes('ghostty') || Boolean(await $.env.get('KITTY_WINDOW_ID'))))
    return next(e)
  })

  // a call drawn on its own row: the card takes the place of the result's text
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (!isCodeTool(e.props.tool) || e.props.isErrored) return next(e)
    const code = codeOf(e.props.output)
    if (!code || code.status === 'failed') return next(e)
    return card($, e, code)
  })

  // calls folded into a group's count line (the terminal folds MCP calls): the cards go under that line, one per code,
  // from its latest call, so a code that was started and then fetched shows once
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const latest = new Map<string, Code>()
    for (const call of e.props.calls) {
      if (!isCodeTool(call.tool) || call.isRunning || call.isErrored || call.isInterrupted) continue
      const code = codeOf(call.output)
      if (!code) continue
      latest.delete(code.id)
      latest.set(code.id, code)
    }
    const codes = [...latest.values()].filter(code => code.status !== 'failed')
    if (!codes.length || e.props.isExpanded) return next(e)
    const { Box } = $.ui.resolve(e)
    const line = await next(e)
    const cards: RenderElement[] = []
    for (const code of codes) cards.push(await card($, e, code))
    return (
      <Box flexDirection="column">
        {line}
        {cards}
      </Box>
    )
  })
}

/** The card for one code: its picture as the surface can draw it, the link it scans to and its QRX page. */
async function card($: EngineInterface, e: RenderInput, code: Code): Promise<RenderElement> {
  const { Box, Text, Link } = $.ui.resolve(e)

  if (code.status === 'processing') {
    return (
      <Box key={`qrx-${code.id}`} flexDirection="column" paddingLeft={2}>
        <Text dimColor>QRX is painting code {code.id}. It usually takes under a minute.</Text>
      </Box>
    )
  }

  const imageUrl = isQrxUrl(code.imageUrl) ? code.imageUrl : undefined
  if (imageUrl && !pictures.has(code.id)) void load($, { ...code, imageUrl })
  const picture = pictures.get(code.id)

  let view: RenderElement | null = null
  const alt = `QRX code ${code.id}${code.shortUrl ? `, scans to ${code.shortUrl}` : ''}`
  if (!picture || picture.state === 'loading') view = <Text dimColor>Loading the code’s picture…</Text>
  else if (picture.state === 'failed') view = imageUrl ? <Link href={imageUrl} label="Open the code’s picture (PNG)" /> : null
  else if (e.surface === 'terminal') {
    const { Image, Raster } = $.ui.resolve(e)
    const width = e.viewport?.columns ?? 80
    const columns = Math.max(16, Math.min(MAX_COLUMNS, width - 6)) & ~1
    const rows = Math.round((columns * picture.preview.height) / picture.preview.width / 2)
    view =
      terminalImages && picture.png.length <= MAX_IMAGE_BASE64 ? (
        <Image key={`qrx-image-${code.id}`} source={{ png: picture.png }} columns={columns} rows={rows} alt={alt} />
      ) : (
        <Raster key={`qrx-image-${code.id}`} columns={columns} rows={rows} cells={halfBlocks(picture.preview, columns, rows)} />
      )
  } else {
    const { Svg } = $.ui.resolve(e)
    const w = THUMB
    const h = Math.round((THUMB * picture.preview.height) / picture.preview.width)
    const source =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<image width="${w}" height="${h}" href="data:image/png;base64,${picture.thumb}"/></svg>`
    view = <Svg alt={alt} width={240} height={Math.round((240 * h) / w)} source={source} />
  }

  return (
    <Box key={`qrx-${code.id}`} flexDirection="column" paddingLeft={2}>
      <Text bold>QR code {code.id} is ready</Text>
      {view}
      {code.shortUrl ? (
        <Text>
          Scans open {code.destination ?? 'its link'} through {code.shortUrl}
        </Text>
      ) : null}
      {code.pageUrl ? <Link href={code.pageUrl} label="View or download it in QRX" /> : null}
    </Box>
  )
}

/** Fetches a finished code's PNG and keeps it, decoded and shrunk, then redraws. */
async function load($: EngineInterface, code: Code & { imageUrl: string }) {
  pictures.set(code.id, { state: 'loading' })
  try {
    // $.http.fetch hands back text, so the PNG comes down to a file and is read back as bytes
    const file = `${tempDir}/qrx-card-${code.id}.png`
    const run = await $.process.run(['curl', '-sSfL', '--max-time', '30', '-o', file, code.imageUrl], { timeoutMs: 40_000 })
    if (run.exitCode !== 0) throw new Error(run.stderr.trim() || `curl exited ${run.exitCode}`)
    const { base64 } = (await $.fs.read(file, { as: 'bytes' })) as { base64: string }
    const image = decodePng(fromBase64(base64))
    pictures.set(code.id, {
      state: 'ready',
      png: base64,
      thumb: toBase64(encodePng(shrink(image, THUMB, Math.round((THUMB * image.height) / image.width)))),
      preview: shrink(image, PREVIEW, Math.round((PREVIEW * image.height) / image.width)),
    })
  } catch (error) {
    pictures.set(code.id, { state: 'failed', reason: error instanceof Error ? error.message : String(error) })
  }
  $.ui.invalidate('ui.render')
}

/** Packs a picture into a Raster's cells: an upper half block per cell, its top pixel the ink and its bottom the paper. */
function halfBlocks(preview: Rgb, columns: number, rows: number) {
  const pixels = shrink(preview, columns, rows * 2)
  const words = new Uint32Array(columns * rows * 3)
  const color = (x: number, y: number) => {
    const i = (y * columns + x) * 3
    return (pixels.data[i] << 16) | (pixels.data[i + 1] << 8) | pixels.data[i + 2]
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const w = (y * columns + x) * 3
      words[w] = UPPER_HALF
      words[w + 1] = color(x, y * 2)
      words[w + 2] = color(x, y * 2 + 1)
    }
  }
  return toBase64(new Uint8Array(words.buffer))
}
