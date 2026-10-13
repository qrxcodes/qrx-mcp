// Reads a QRX code out of a QRX MCP tool's result, as Claude Code stores it for the transcript.

export type CodeStatus = 'processing' | 'succeeded' | 'failed'

export type Code = {
  id: string
  status: CodeStatus
  imageUrl?: string
  shortUrl?: string
  pageUrl?: string
  destination?: string
}

/** The QRX tools whose result is one code, under any server name that holds `qrx` (plugin or `claude mcp add`). */
const CODE_TOOL = /^mcp__[\w-]*qrx[\w-]*__(generate_qr_code|vary_qr_code|get_qr_code)$/

export const isCodeTool = (tool: string) => CODE_TOOL.test(tool)

/** Only images QRX serves are fetched: qrx.codes and its subdomains (dev), and the qrx.to short links. */
export function isQrxUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    const host = url.hostname
    return url.protocol === 'https:' && (host === 'qrx.codes' || host.endsWith('.qrx.codes') || host === 'qrx.to')
  } catch {
    return false
  }
}

const ID = /^[a-z0-9]{1,64}$/i
const STATUSES: readonly string[] = ['processing', 'succeeded', 'failed']

function fromObject(value: Record<string, unknown>): Code | undefined {
  if (typeof value.id !== 'string' || !ID.test(value.id) || typeof value.status !== 'string') return undefined
  if (!STATUSES.includes(value.status)) return undefined
  return {
    id: value.id,
    status: value.status as CodeStatus,
    imageUrl: isQrxUrl(value.imageUrl) ? value.imageUrl : undefined,
    shortUrl: isQrxUrl(value.shortUrl) ? value.shortUrl : undefined,
    pageUrl: isQrxUrl(value.pageUrl) ? value.pageUrl : undefined,
    destination: typeof value.destination === 'string' ? value.destination : undefined,
  }
}

const READY = /QR code ([a-z0-9]+) is ready\./i
const PAINTING = /QR code ([a-z0-9]+) is still being painted/i
const FAILED = /QR code ([a-z0-9]+) could not be made/i
const IMAGE = /Image \(PNG\): (\S+)/
const SCANS = /Scans open (\S+) through (\S+?)\.?$/m
const PAGE = /View or download it in QRX: (\S+)/

/** The text the server writes for a code (see codeLine in the QRX API): used when no structured result is kept. */
function fromText(text: string): Code | undefined {
  const ready = READY.exec(text)
  if (ready) {
    const image = IMAGE.exec(text)?.[1]
    const scans = SCANS.exec(text)
    const page = PAGE.exec(text)?.[1]
    return {
      id: ready[1],
      status: 'succeeded',
      imageUrl: isQrxUrl(image) ? image : undefined,
      shortUrl: isQrxUrl(scans?.[2]) ? scans?.[2] : undefined,
      destination: scans?.[1],
      pageUrl: isQrxUrl(page) ? page : undefined,
    }
  }
  const painting = PAINTING.exec(text)
  if (painting) return { id: painting[1], status: 'processing' }
  const failed = FAILED.exec(text)
  if (failed) return { id: failed[1], status: 'failed' }
  return undefined
}

/**
 * Finds the code in a tool result of any shape Claude Code keeps: the structured result, a list of content blocks,
 * an object holding either, or the text alone. The structured result wins over the text.
 */
export function codeOf(output: unknown): Code | undefined {
  const texts: string[] = []
  let found: Code | undefined
  const visit = (value: unknown, depth: number) => {
    if (found || depth > 6 || value === null || value === undefined) return
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          visit(JSON.parse(trimmed), depth + 1)
          return
        } catch {
          // not JSON: read it as text
        }
      }
      texts.push(value)
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1)
      return
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>
      found = fromObject(record)
      if (found) return
      for (const key of Object.keys(record)) visit(record[key], depth + 1)
    }
  }
  visit(output, 0)
  return found ?? fromText(texts.join('\n'))
}
