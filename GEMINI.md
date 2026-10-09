# QRX

Use the QRX tools when the user wants a QR code that is also a designed image (branded, decorative or for print). Follow `skills/qrx/SKILL.md` in this extension:

1. Get an absolute `https://` (or `http://`) destination.
2. Write a short picture prompt: one subject, a style or medium, the palette. No words, logos or trademarks in the art.
3. Call `generate_qr_code` once (it usually takes under a minute), then call `get_qr_code` with the returned id until `status` is `succeeded` or `failed`. The id never changes. Never start another code while one is processing; each one counts against the user's allowance (`get_account` shows what is left).
4. Show the image, the short link (`shortUrl`, `https://qrx.to/<id>` on qrx.codes) and the destination, and tell the user to test-scan before printing.

If a tool says to connect a QRX account, ask the user to run `/mcp auth qrx` and sign in, then try again.
