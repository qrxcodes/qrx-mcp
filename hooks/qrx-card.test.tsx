import { describe, expect, test } from 'claude-code/testing'

import { codeOf, isCodeTool } from './lib/code.ts'
import { MAX_IMAGE_BASE64, fullQualityUrl, pictureKind } from './lib/picture.ts'
import { decodePng, encodePng, shrink } from './lib/png.ts'

const TOOL = 'mcp__plugin_qrx_qrx__get_qr_code'

const ready = {
  id: 'ab12cd',
  object: 'code',
  status: 'succeeded',
  destination: 'https://example.com/menu',
  shortUrl: 'https://qrx.to/ab12cd',
  imageUrl: 'https://qrx.codes/media/premium/ab12cd.png',
  pageUrl: 'https://qrx.codes/view/ab12cd',
}

const readyText = [
  'QR code ab12cd is ready.',
  'Image (PNG): https://qrx.codes/media/premium/ab12cd.png',
  'Scans open https://example.com/menu through https://qrx.to/ab12cd.',
  'View or download it in QRX: https://qrx.codes/view/ab12cd',
].join('\n')

const row = (output: unknown, tool = TOOL) => ({ tool_use_id: 'toolu_1', tool, output, isErrored: false })

describe('reading a code from a tool result', () => {
  test('takes the structured result, inside content blocks or alone', () => {
    expect(codeOf({ content: [{ type: 'text', text: readyText }], structuredContent: ready })).toMatchObject({
      id: 'ab12cd',
      status: 'succeeded',
      imageUrl: ready.imageUrl,
      shortUrl: ready.shortUrl,
    })
    expect(codeOf(JSON.stringify(ready))?.pageUrl).toBe(ready.pageUrl)
  })

  test('falls back to the text the server writes', () => {
    expect(codeOf([{ type: 'text', text: readyText }])).toEqual({
      id: 'ab12cd',
      status: 'succeeded',
      imageUrl: ready.imageUrl,
      shortUrl: ready.shortUrl,
      destination: ready.destination,
      pageUrl: ready.pageUrl,
    })
    expect(codeOf('QR code xy99 is still being painted (this usually takes under a minute).')).toEqual({
      id: 'xy99',
      status: 'processing',
    })
  })

  test('drops image links that are not QRX’s', () => {
    expect(codeOf({ ...ready, imageUrl: 'https://example.com/a.png' })?.imageUrl).toBeUndefined()
    expect(codeOf({ ...ready, imageUrl: 'http://qrx.codes/a.png' })?.imageUrl).toBeUndefined()
  })

  test('matches the QRX code tools under any qrx server name', () => {
    expect(isCodeTool('mcp__qrx__generate_qr_code')).toBe(true)
    expect(isCodeTool('mcp__plugin_qrx_qrx__vary_qr_code')).toBe(true)
    expect(isCodeTool('mcp__qrx__list_qr_codes')).toBe(false)
    expect(isCodeTool('mcp__other__get_qr_code')).toBe(false)
  })
})

test('a PNG written by the card reads back the same', () => {
  const data = new Uint8Array(4 * 3 * 3)
  for (let i = 0; i < data.length; i++) data[i] = (i * 37) % 256
  const image = { width: 4, height: 3, data }
  expect(Array.from(decodePng(encodePng(image)).data)).toEqual(Array.from(data))
  expect(shrink(image, 2, 1).data.length).toBe(6)
})

describe('the full-quality link', () => {
  const code = { id: 'ab12cd', status: 'succeeded' as const, imageUrl: ready.imageUrl, pageUrl: ready.pageUrl }

  test('shows under a picture drawn in cells, in terminals without kitty graphics', () => {
    const kind = pictureKind('terminal', false, 1000)
    expect(kind).toBe('cells')
    expect(fullQualityUrl(kind, code)).toBe(ready.imageUrl)
    expect(fullQualityUrl(kind, { ...code, imageUrl: undefined })).toBe(ready.pageUrl)
  })

  test('is left off where the picture has real pixels: kitty and Ghostty, the Desktop app and the editor', () => {
    expect(pictureKind('terminal', true, 1000)).toBe('pixels')
    expect(fullQualityUrl('pixels', code)).toBeUndefined()
    for (const surface of ['desktop', 'vscode', 'mobile']) {
      expect(pictureKind(surface, false, 1000)).toBe('svg')
      expect(fullQualityUrl(pictureKind(surface, true, 1000), code)).toBeUndefined()
    }
  })

  test('shows in kitty too when the PNG is too large to draw as pixels', () => {
    expect(fullQualityUrl(pictureKind('terminal', true, MAX_IMAGE_BASE64 + 1), code)).toBe(ready.imageUrl)
  })
})

describe('the card', () => {
  for (const surface of ['terminal', 'desktop', 'vscode'] as const) {
    test(`says the code is being painted (${surface})`, async $ => {
      const ui = await $.ui.mount({
        plugin: 'qrx',
        surface,
        component: 'ToolResult',
        props: row([{ type: 'text', text: 'QR code xy99 is still being painted. Call get_qr_code with id "xy99" to wait for it.' }]),
      })
      expect(await ui.find({ type: 'Text', text: /painting code xy99/ })).toBeDefined()
      await ui.unmount()
    })

    test(`keeps the links when the picture cannot be fetched (${surface})`, async $ => {
      const ui = await $.ui.mount({ plugin: 'qrx', surface, component: 'ToolResult', props: row({ structuredContent: ready }) })
      await ui.redraw()
      expect(await ui.find({ type: 'Text', text: /is ready/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /https:\/\/qrx\.to\/ab12cd/ })).toBeDefined()
      expect((await ui.find({ type: 'Link', text: /View or download/ }))?.props.href).toBe(ready.pageUrl)
      await ui.unmount()
    })
  }

  test('leaves other tools’ results to Claude Code', async ($, on) => {
    on('ui.render', ($, e) => {
      const { Text } = $.ui.resolve(e)
      return <Text>drawn by Claude Code</Text>
    })
    const ui = await $.ui.mount({
      plugin: 'qrx',
      surface: 'terminal',
      component: 'ToolResult',
      props: row({ structuredContent: ready }, 'mcp__other__get_qr_code'),
    })
    expect(await ui.find({ type: 'Text', text: /is ready/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'drawn by Claude Code' })).toBeDefined()
    await ui.unmount()
  })
})
