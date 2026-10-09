# QRX MCP server: installation guide for AI agents

These instructions are for an AI coding agent (such as Cline) that is setting up the QRX MCP server for a user. Follow them in order.

## What you are installing

- QRX is a **hosted remote MCP server**: nothing is cloned, built or run locally, and no Node or Python runtime is needed.
- **Endpoint:** `https://qrx.codes/mcp`
- **Transport:** Streamable HTTP (stateless)
- **Auth:** sign-in with the user's QRX account (MCP authorization, OAuth 2.1) in clients that support it; those need only the URL. Otherwise an HTTP header `Authorization: Bearer <QRX API key>` (preferred), or `X-API-Key: <QRX API key>` for clients that cannot add the `Bearer ` prefix. QRX keys start with `qrx_`.
- **Docs:** https://qrx.codes/developers/mcp (public, no key needed).

## Step 1: Get an API key from the user

Cline in VS Code does not start QRX sign-in, so it needs an API key. (In the Cline CLI the user can instead leave out `headers` and sign in with `cline mcp` → **Authorize OAuth**.)

1. Ask the user for their QRX API key.
2. If they do not have one, tell them to sign in at https://qrx.codes and create a key at https://qrx.codes/developers/keys. Creating an account is free.
3. Never invent a key, and never print the full key back in chat.

## Step 2: Add the server to the MCP settings

### Cline

Add this entry to `cline_mcp_settings.json` (open it from the MCP Servers panel → Configure). Keep any existing servers in the file.

```json
{
  "mcpServers": {
    "qrx": {
      "type": "streamableHttp",
      "url": "https://qrx.codes/mcp",
      "headers": {
        "Authorization": "Bearer qrx_live_…"
      },
      "disabled": false,
      "autoApprove": ["list_styles", "get_qr_code", "list_qr_codes", "get_account", "get_profile"]
    }
  }
}
```

- `"type": "streamableHttp"` is required. Without it, Cline treats the entry as a local stdio server and the connection fails.
- Replace `qrx_live_…` with the user's key.
- `autoApprove` lists exactly the five read-only tools. Leave `generate_qr_code` and `change_qr_code_destination` out so the user confirms them: each code counts against their allowance, and changing a destination replaces the old one.

### Other clients (for reference)

| Client | Where | Entry |
|---|---|---|
| Claude Code | terminal | `claude mcp add --transport http qrx https://qrx.codes/mcp`, then `/mcp` to sign in |
| Cursor | `~/.cursor/mcp.json` | `{"mcpServers":{"qrx":{"url":"https://qrx.codes/mcp","headers":{"Authorization":"Bearer ${env:QRX_API_KEY}"}}}}` |
| VS Code | `.vscode/mcp.json` | `{"servers":{"qrx":{"type":"http","url":"https://qrx.codes/mcp"}}}` (signs in on first use) |
| Windsurf / Devin Desktop | `mcp_config.json` | `{"mcpServers":{"qrx":{"serverUrl":"https://qrx.codes/mcp","headers":{"Authorization":"Bearer qrx_live_…"}}}}` |
| Zed | `settings.json` | `{"context_servers":{"qrx":{"url":"https://qrx.codes/mcp"}}}` (signs in on first use) |
| Goose | terminal | `goose configure` → Add Extension → Remote Extension (Streamable HTTP), URL `https://qrx.codes/mcp` (signs in on first use) |
| Codex CLI | terminal | `codex mcp add qrx --url https://qrx.codes/mcp` (opens sign-in) |
| Gemini CLI | terminal | `gemini mcp add --transport http -s user qrx https://qrx.codes/mcp`, then `/mcp auth qrx` |
| Kiro | `.kiro/settings/mcp.json` | `{"mcpServers":{"qrx":{"type":"http","url":"https://qrx.codes/mcp","headers":{"Authorization":"Bearer ${ QRX_API_KEY }"}}}}` |
| stdio-only clients | any | `npx -y mcp-remote https://qrx.codes/mcp --header "Authorization:${QRX_API_KEY}"`, with env `QRX_API_KEY="Bearer qrx_…"` |

## Step 3: Verify

1. Reload the MCP servers. QRX should connect and list seven tools: `generate_qr_code`, `get_qr_code`, `list_qr_codes`, `change_qr_code_destination`, `get_account`, `get_profile`, `list_styles`.
2. Call `get_profile`. It should name the connected QRX account.
   - A `401` or "Connect a QRX account" message means no account is connected: the key is missing or wrong, or the user has not signed in yet. Check that the header is exactly `Authorization: Bearer qrx_…` (or `X-API-Key: qrx_…`).
3. Call `list_styles` to show the user the available looks.

## Step 4: Make a first code (optional; uses one code from the allowance)

1. Call `generate_qr_code` with:
   - `prompt`: what the picture shows, e.g. "a lighthouse on a cliff at sunset, watercolour";
   - `destination`: the link the code opens, e.g. `https://example.com`;
   - `style` (optional): an id from `list_styles`.
2. It returns at once with an `id` and `status: processing`. Painting usually takes under a minute.
3. Call `get_qr_code` with that `id`. It waits up to `wait` seconds (25 by default) per call; call it again while the status is still processing.
4. When it is ready, give the user:
   - the image URL;
   - the short link the code opens (`shortUrl`, `https://qrx.to/<id>` on qrx.codes).
5. Tell the user that QRX verified the code scans before returning it.

## Troubleshooting

- **401 Unauthorized:** the key is missing or revoked, or the user has not signed in. Create a new key at https://qrx.codes/developers/keys, or sign in from the client's MCP settings.
- **"No codes are left today":** the account's daily allowance is used up. It resets daily; `get_account` shows when.
- **Connection fails immediately in Cline:** check that `"type": "streamableHttp"` is present.
- **Corporate proxy or firewall:** allow HTTPS to `qrx.codes` and `qrx.to`.
