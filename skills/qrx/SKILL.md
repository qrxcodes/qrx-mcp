---
name: qrx
description: Makes branded, print-ready art QR codes that always scan, using QRX (qrx.codes). Use when the user wants a QR code for a link (or Wi-Fi) that looks like artwork, matches a brand, or will be printed on a poster, menu, flyer, packaging, sign, business card, slide or event badge; also to list, check or re-point existing QRX codes. Not for plain black-and-white QR codes the agent can make locally.
license: MIT
compatibility: Needs network access and the QRX MCP server (https://qrx.codes/mcp) or a QRX API key for the REST API.
metadata:
  author: QRX
  homepage: https://qrx.codes/developers
  version: "1.0.0"
---

# QRX: art QR codes that always scan

QRX turns a short picture description (the prompt) and a destination link into an artistic QR code. Every code is checked to decode before it is returned, and it encodes a hosted short link, `https://qrx.to/<id>` on qrx.codes, which forwards scans to the destination. Treat the result as a design asset: a PNG the user can drop into print or digital layouts.

## When to use QRX

Use it when the user wants a QR code that is also a picture: on-brand, decorative, or eye-catching enough to earn a scan. Typical asks: a café menu code in a watercolour style, a conference badge code in the event's colours, a poster code that blends into the artwork, a product-packaging code, a wedding-invitation code.

Do not use it when:
- a plain, unstyled QR code will do and can be made locally (offer QRX only if the user wants something designed);
- the user wants to change the art of an existing code (make a new code instead);
- the request is for a logo, trademark or character the user does not own (see "What not to do").

## Tools (QRX MCP server)

| Tool | Use |
| - | - |
| `list_styles` | List style ids and names. Works without signing in. |
| `generate_qr_code` | Start a code. Args: `prompt` (required, up to 1,000 characters), `destination` (an absolute `http` or `https` URL, up to 2,048 characters) **or** `wifi` (`ssid`, `password`, `security` `wpa` or `wep`; only if the account's plan includes Wi-Fi codes), optional `style`. Answers at once with the code's `id` and `status: processing`. |
| `get_qr_code` | Get a code by `id`. Waits up to `wait` seconds (0 to 25, default 25) for a processing code to finish. Call again while it is still `processing`. |
| `list_qr_codes` | The user's codes, newest first. `limit` 1 to 100 (default 20); pass `nextCursor` as `cursor` for the next page. |
| `change_qr_code_destination` | Re-point a link code's short link to a new destination (`id`, `destination`: an absolute `http` or `https` URL). Printed codes follow at once. Only if the account's plan allows changing destinations; it replaces the old destination, so confirm with the user first. |
| `get_account` | The plan, today's allowance, what is left, when it resets, and which features the account has (Wi-Fi codes, changing destinations). |
| `get_profile` | The connected QRX account. |

If the tools are missing, the QRX MCP server is not connected; use the REST API instead (see [references/rest-api.md](references/rest-api.md)).

## How to make a code

1. **Get the destination.** It must be an absolute URL starting with `https://` or `http://` (add `https://` if the user gave a bare domain, and confirm the exact link if it is ambiguous). For Wi-Fi codes you need the network name and password, and the account's plan must include Wi-Fi codes (`get_account` shows whether it does). Wi-Fi codes have no short link and cannot be re-pointed.
2. **Write the prompt** (see "Writing a good prompt"). If the user named a look, call `list_styles` and pick the closest style id; otherwise leave `style` out.
3. **Call `generate_qr_code` once.** Keep the returned `id`; it never changes. Painting usually takes under a minute.
4. **Poll with `get_qr_code`** using that `id` until `status` is `succeeded` or `failed`. Each call waits up to 25 seconds, so two or three calls are normal.
   - Never call `generate_qr_code` again while a code is still processing: every generate counts against the user's allowance.
5. **Show the result:** the image (`imageUrl`, a PNG), the short link the code encodes (`shortUrl`, `https://qrx.to/<id>` on qrx.codes), the destination, and the code's page (`pageUrl`). Tell the user to test-scan it with a phone before printing.
6. **On `failed`:** read `error.message`, simplify the prompt (fewer elements, more contrast), and offer one retry. Ask before making more than one extra attempt.

For several variations, say how many will be made and that each counts against the allowance, then start them and poll each `id`.

## Writing a good prompt

The prompt describes the picture only. QRX handles the QR pattern itself.

- **Lead with one clear subject and setting:** "a lighthouse on a cliff at sunset", "a bowl of ramen with steam rising", "a eucalyptus branch with gumnuts".
- **Add a style or medium:** watercolour, linocut print, isometric 3D, art deco poster, Japanese woodblock, papercraft, neon line art.
- **Name the palette, especially brand colours:** "in deep navy, coral and cream"; describe colours in words, since hex codes are not reliably followed.
- **Keep it simple:** one subject, a few adjectives, 10 to 30 words. Busy scenes with many small objects scan and read worse.
- **Prefer strong light-dark contrast** in the description ("bold shapes, high contrast") for codes that will be printed small or viewed from a distance.
- **Leave out words and lettering:** do not ask for text, slogans, numbers or logos inside the art. Put copy next to the code in the layout instead.
- Use Australian or the user's own spelling; it does not matter to the model.

More examples and fixes: [references/prompt-guide.md](references/prompt-guide.md).

## Limits

- Accounts have a daily allowance of codes (some have no daily limit), and Wi-Fi codes and changing where a code points depend on the account's plan. Call `get_account` to see what is left today, when the count resets and which features the account has; act on the features it reports, not on the plan name.
- If a call fails with a limit error, or says a feature is not included in the account's plan, call `get_account`, tell the user plainly what is left and when it resets (or that the feature is not included in their plan), and point them to their account at https://qrx.codes. Do not retry in a loop.
- An authentication error means no QRX account is connected. Ask the user to sign in to QRX when their client prompts (or from its MCP or connector settings); a client that cannot sign in can use an API key from https://qrx.codes/developers/keys instead.

## Links and re-pointing

The code encodes its short link (`https://qrx.to/<id>` on qrx.codes), not the destination itself. A code's `id` and short link never change. That keeps the pattern simple and, where the account's plan allows it, lets the user change the destination later with `change_qr_code_destination` without reprinting. Mention this when the user is printing in volume or the destination may change (seasonal menus, event pages).

## Print and placement checklist

Share the relevant points when the code is for print:
- **Test-scan** the downloaded PNG on at least two phones (iPhone camera and an Android camera) before sending to print, and again on a printed proof.
- **Minimum size:** about 2.5 cm (1 inch) square for handheld items such as cards and menus; scale up roughly 1 cm of code width per 10 cm of scanning distance for posters and signs.
- **Quiet zone:** keep a clear margin around the code, and do not crop, overlap or place text over the artwork's edges.
- **Do not recolour, stretch, add filters or vectorise** the image; resize proportionally only.
- **Contrast with the background:** place it on a calm area, not on a busy photo.
- **Finish:** matte stock scans more reliably than gloss under lights.
- Put a short call to action beside the code ("Scan for the menu").

## What not to do

- Do not put logos, trademarks, celebrities or characters the user does not own in the prompt, and do not imitate another company's branding.
- Do not ask for text inside the art.
- Do not generate codes that point to phishing, malware or deceptive pages, or that hide where a link goes.
- Do not start many codes "just to see"; each one uses the user's allowance.
- Do not paste the user's API key into chat output, files or commits.

## REST API fallback

If the MCP tools are not available but the user has an API key, follow [references/rest-api.md](references/rest-api.md) (create with `POST https://qrx.codes/v1/codes`, then `GET https://qrx.codes/v1/codes/{id}?wait=45`).
