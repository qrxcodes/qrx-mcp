# QRX

**Art QR codes that always scan.**

QRX makes branded, print-ready QR codes for posters, menus, packaging and signage. Describe the look you want and give it a link: QRX paints the code into artwork, checks that it decodes before handing it over, and points it at a hosted short link, `https://qrx.to/<id>` on qrx.codes, that you can re-point later on the Starter plan. This repository connects QRX to Claude, Cursor, VS Code and other MCP clients (ChatGPT once sign-in ships) through the remote server at `https://qrx.codes/mcp`.

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_QRX-0098FF?logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=qrx&inputs=%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22qrx-api-key%22%2C%22description%22%3A%22QRX%20API%20key%20%28starts%20with%20qrx_%29%22%2C%22password%22%3Atrue%7D%5D&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fqrx.codes%2Fmcp%22%2C%22headers%22%3A%7B%22Authorization%22%3A%22Bearer%20%24%7Binput%3Aqrx-api-key%7D%22%7D%7D)
[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=qrx&config=eyJ1cmwiOiJodHRwczovL3FyeC5jb2Rlcy9tY3AiLCJoZWFkZXJzIjp7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgJHtlbnY6UVJYX0FQSV9LRVl9In19)
[![Glama](https://glama.ai/mcp/connectors/codes.qrx/mcp/badges/score.svg)](https://glama.ai/mcp/connectors/codes.qrx/mcp)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-green)](LICENSE)

Listed in the [official MCP Registry](https://registry.modelcontextprotocol.io/) as `codes.qrx/mcp`.

<p align="center"><img src="assets/icon.png" width="280" alt="A QR code painted as a watercolour river with pine trees, made by QRX"></p>
<p align="center"><sub>The QRX logo is a QRX code. Point your phone at it.</sub></p>

## What you can do

- **Make a code:** "Make a QR code for https://example.com/menu that looks like a watercolour café street."
- **Check on it:** generation usually takes under a minute; the agent waits for it and returns the image and short link.
- **Find old codes:** list the codes on your account, newest first.
- **Re-point a code:** send an existing printed code to a new link, with no reprint (Starter plan).
- **Check your allowance:** see how many codes you have left today.

## Connection details

| | |
|---|---|
| Server URL | `https://qrx.codes/mcp` |
| Transport | Streamable HTTP (stateless) |
| Auth (now) | API key in a header: `Authorization: Bearer qrx_…` (preferred), or `X-API-Key: qrx_…` for clients that can't add the `Bearer ` prefix. If both are sent, `Authorization` wins |
| Auth (coming) | OAuth sign-in with your QRX account; clients that support MCP OAuth will need only the URL |
| Without auth | `tools/list` and `list_styles` work; every other tool asks you to connect an account |
| Docs | [qrx.codes/developers/mcp](https://qrx.codes/developers/mcp) (public: server URL, client set-up, tools, limits, privacy) |

## Get an API key

1. Sign in at [qrx.codes](https://qrx.codes) (free).
2. Open [qrx.codes/developers/keys](https://qrx.codes/developers/keys) and create a key. It starts with `qrx_`.
3. Keep it secret. The examples below read it from an environment variable called `QRX_API_KEY` wherever the client allows that:

   ```bash
   # macOS / Linux
   export QRX_API_KEY="qrx_live_…"
   ```

   ```powershell
   # Windows PowerShell (current user, persistent)
   [Environment]::SetEnvironmentVariable("QRX_API_KEY", "qrx_live_…", "User")
   ```

Revoke a key at any time from the same page.

## Install

<details open>
<summary><b>Claude Code</b></summary>

**Option A: plugin (MCP server plus the QRX skill)**

```text
/plugin marketplace add qrxcodes/qrx-mcp
/plugin install qrx@qrx
```

When you enable the plugin, Claude Code asks for your QRX API key and keeps it in your system's credential store. The plugin also adds the `qrx` skill, which teaches Claude how to write good art prompts, wait for the code and prepare it for print.

**Option B: MCP server only**

```bash
claude mcp add --transport http qrx https://qrx.codes/mcp \
  --header "Authorization: Bearer $QRX_API_KEY" --scope user
```

Or commit this to a project's `.mcp.json` so the whole team gets it (each person sets their own `QRX_API_KEY`):

```json
{
  "mcpServers": {
    "qrx": {
      "type": "http",
      "url": "https://qrx.codes/mcp",
      "headers": { "Authorization": "Bearer ${QRX_API_KEY}" }
    }
  }
}
```

**When OAuth is live:** `claude mcp add --transport http qrx https://qrx.codes/mcp`, then run `/mcp` and sign in.

</details>

<details>
<summary><b>Claude (claude.ai and Claude Desktop): custom connector</b></summary>

Claude Desktop uses the same connector settings as claude.ai; you don't edit `claude_desktop_config.json` for a remote server.

1. Open **Customize → Connectors**, select **+ Add**, then **Add custom connector**.
   On Team and Enterprise, an Owner adds it under **Organization settings → Connectors** first.
2. Name: `QRX`. URL: `https://qrx.codes/mcp`.
3. Authentication:
   - **Now:** choose the fixed-credentials option and, under **Request headers**, add `Authorization` with the value `Bearer qrx_live_…`.
   - **When OAuth is live:** choose **Sign in when needed**; Claude shows a Connect button the first time you make a code.
4. Save, then turn QRX on in a chat from the connectors menu.

Free Claude plans can add one custom connector.

</details>

<details>
<summary><b>ChatGPT</b></summary>

ChatGPT's custom MCP servers take OAuth or no authentication, not API keys, so QRX in ChatGPT needs the OAuth release.

**When OAuth is live:**

1. Open [chatgpt.com/plugins](https://chatgpt.com/plugins) on the web, select **+**, then **Add custom MCP server**.
2. Name: `QRX`. Server URL: `https://qrx.codes/mcp`.
3. Authentication: **OAuth**. Accept the risk warning and select **Create as a plugin**.
4. Ask for a QR code; ChatGPT asks you to sign in to QRX the first time.

Workspace admins can restrict custom MCP servers on Business and Enterprise plans.

</details>

<details>
<summary><b>Cursor</b></summary>

Use the **Install in Cursor** button above, or add this to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "qrx": {
      "url": "https://qrx.codes/mcp",
      "headers": { "Authorization": "Bearer ${env:QRX_API_KEY}" }
    }
  }
}
```

**When OAuth is live:** drop the `headers` block; Cursor prompts you to sign in.

</details>

<details>
<summary><b>VS Code (GitHub Copilot)</b></summary>

Use the **Install in VS Code** button above (it asks for your key and stores it securely), or add this to `.vscode/mcp.json`:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "qrx-api-key",
      "description": "QRX API key (starts with qrx_)",
      "password": true
    }
  ],
  "servers": {
    "qrx": {
      "type": "http",
      "url": "https://qrx.codes/mcp",
      "headers": { "Authorization": "Bearer ${input:qrx-api-key}" }
    }
  }
}
```

From a terminal:

```bash
code --add-mcp '{"name":"qrx","type":"http","url":"https://qrx.codes/mcp","headers":{"Authorization":"Bearer ${input:qrx-api-key}"},"inputs":[{"type":"promptString","id":"qrx-api-key","description":"QRX API key","password":true}]}'
```

**When OAuth is live:** `{"type": "http", "url": "https://qrx.codes/mcp"}` is enough.

</details>

<details>
<summary><b>Windsurf / Devin Desktop</b></summary>

Edit `mcp_config.json` (macOS/Linux `~/.config/devin/mcp_config.json`, Windows `%APPDATA%\devin\mcp_config.json`; older Windsurf installs use `~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "qrx": {
      "serverUrl": "https://qrx.codes/mcp",
      "headers": { "Authorization": "Bearer ${env:QRX_API_KEY}" }
    }
  }
}
```

Note the key is `serverUrl`, not `url`.

</details>

<details>
<summary><b>Cline</b></summary>

Open **MCP Servers → Configure MCP Servers** and add to `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "qrx": {
      "type": "streamableHttp",
      "url": "https://qrx.codes/mcp",
      "headers": { "Authorization": "Bearer qrx_live_…" },
      "disabled": false,
      "autoApprove": ["list_styles", "get_qr_code", "list_qr_codes", "get_account", "get_profile"]
    }
  }
}
```

**When OAuth is live:** remove `headers` and use **Authorize OAuth** on the server.

</details>

<details>
<summary><b>Zed</b></summary>

Add to `settings.json`:

```json
{
  "context_servers": {
    "qrx": {
      "url": "https://qrx.codes/mcp",
      "headers": { "Authorization": "Bearer qrx_live_…" }
    }
  }
}
```

**When OAuth is live:** leave out `headers`; Zed runs the MCP sign-in flow when no `Authorization` header is set.

</details>

<details>
<summary><b>Goose</b></summary>

Run `goose configure` → **Add Extension** → **Remote Extension (Streamable HTTP)**, enter `https://qrx.codes/mcp`, and add the header `Authorization: Bearer qrx_live_…`. Or edit `config.yaml` (macOS/Linux `~/.config/goose/config.yaml`, Windows `%APPDATA%\Block\goose\config\config.yaml`):

```yaml
extensions:
  qrx:
    name: qrx
    type: streamable_http
    enabled: true
    uri: https://qrx.codes/mcp
    headers:
      Authorization: "Bearer qrx_live_…"
    timeout: 300
```

</details>

<details>
<summary><b>OpenAI Codex CLI</b></summary>

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.qrx]
url = "https://qrx.codes/mcp"
bearer_token_env_var = "QRX_API_KEY"
```

**When OAuth is live:** `codex mcp add qrx --url https://qrx.codes/mcp`, then `codex mcp login qrx`.

</details>

<details>
<summary><b>Gemini CLI</b></summary>

```bash
gemini mcp add --transport http --header "Authorization: Bearer $QRX_API_KEY" qrx https://qrx.codes/mcp
```

Or in `~/.gemini/settings.json` (note `httpUrl`, which selects Streamable HTTP):

```json
{
  "mcpServers": {
    "qrx": {
      "httpUrl": "https://qrx.codes/mcp",
      "headers": { "Authorization": "Bearer $QRX_API_KEY" }
    }
  }
}
```

</details>

<details>
<summary><b>Agent Skills (any compatible agent)</b></summary>

The `skills/qrx` folder follows the [Agent Skills](https://agentskills.io) standard, so the same skill works in Codex, Gemini CLI, GitHub Copilot, Cursor, Goose and others. Install it with the cross-agent installer:

```bash
npx skills add qrxcodes/qrx-mcp
```

The skill expects the QRX MCP server to be connected (see your client above), or a `QRX_API_KEY` for the REST API.

</details>

<details>
<summary><b>Gemini CLI extension</b></summary>

```bash
gemini extensions install https://github.com/qrxcodes/qrx-mcp
```

The extension asks for your QRX API key and stores it in your system keychain.

</details>

<details>
<summary><b>Any other MCP client</b></summary>

Point a Streamable HTTP client at `https://qrx.codes/mcp` and send `Authorization: Bearer qrx_…` (or `X-API-Key: qrx_…`). Clients that only speak stdio can use a bridge such as [`mcp-remote`](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "qrx": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://qrx.codes/mcp", "--header", "Authorization:Bearer ${QRX_API_KEY}"],
      "env": { "QRX_API_KEY": "qrx_live_…" }
    }
  }
}
```

</details>

## Tools

| Tool | What it does | Read-only | Needs an account |
|---|---|---|---|
| `generate_qr_code` | Starts a new art QR code from a prompt and a link (or Wi-Fi details on Starter). Returns the code's id straight away. | No | Yes |
| `get_qr_code` | Gets a code's status, image and short link. Waits up to `wait` seconds (0 to 25, default 25) for a code that's still being painted. | Yes | Yes |
| `list_qr_codes` | Lists your codes, newest first, a page at a time (`limit` 1 to 100, default 20; pass `nextCursor` as `cursor`). | Yes | Yes |
| `change_qr_code_destination` | Points an existing link code at a new absolute http or https URL (Starter plan). The printed code keeps working. Marked destructive, because it replaces the old destination. | No | Yes |
| `get_account` | Shows your plan, how many codes are left today, when the count resets and what the account can do. | Yes | Yes |
| `get_profile` | Shows which QRX account is connected. | Yes | Yes |
| `list_styles` | Lists the looks you can pass to `generate_qr_code`. | Yes | No |

In clients that show interactive views (MCP Apps), such as Claude, the code also appears in a card that fills in when it is ready.

## Example prompts

1. "Make a QR code for https://example.com/menu that looks like a watercolour street of cafés."
2. "Design a QR code for our wedding RSVP page, https://example.com/rsvp, as eucalyptus leaves and gold foil on cream paper."
3. "I need a QR code for a gig poster that opens https://example.com/tickets. Neon synthwave city at night."
4. "Show me the styles QRX has, then make a code for https://example.com in the one that best suits a bakery."
5. "List my QR codes from this week and give me the short links."
6. "The flyer code we printed last month should now open https://example.com/spring-sale instead."
7. "How many QR codes can I still make today?"
8. "Make three variations of a QR code for https://example.com/shop with a Japanese woodblock wave, and tell me which scans are verified."

## How generation works

- `generate_qr_code` returns within a few seconds with an id and `status: processing`. The artwork usually takes **under a minute** on a GPU.
- `get_qr_code` then waits for up to 25 seconds per call (`wait`, 0–25). Agents call it again until the status is `succeeded` (or `failed`). In MCP Apps clients the card fills in with the image when it's ready.
- A finished code includes the image URL, the short link it encodes (`shortUrl`: `https://qrx.to/<id>` on qrx.codes) and the destination it redirects to. Every code is decoded before it's marked `succeeded`. A code's `id` and short link never change.
- Each code you start counts against your plan, even if you don't keep the result.

## Plans and limits

| Plan | Codes | Re-point links | Wi-Fi codes |
|---|---|---|---|
| Free | 42 a day | No | No |
| Starter, US$20 a month | No daily limit | Yes | Yes |

The API, the MCP server and the website share one allowance. Each key is also rate limited (30 requests a minute and 6 new codes per 10 seconds). If you hit a limit the tool returns an error; `get_account` shows what is left and when the daily count resets. Plans: https://qrx.codes/upgrade. Limits: [qrx.codes/developers](https://qrx.codes/developers#limits).

## What this repository contains

| Path | For |
|---|---|
| `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.mcp.json` | Claude Code plugin and its marketplace (`/plugin marketplace add qrxcodes/qrx-mcp`) |
| `skills/qrx/` | The `qrx` skill (Agent Skills standard): prompting, waiting for the code, print checks |
| `gemini-extension.json`, `GEMINI.md` | Gemini CLI extension |
| `server.json` | The entry for the official MCP Registry |
| `glama.json` | Glama maintainer claim |
| `llms-install.md` | Step-by-step set-up written for AI agents (Cline and others) |

None of these files run code on your machine. They only point your client at `https://qrx.codes/mcp`.

## Data and network use

Clients send requests only to `https://qrx.codes/mcp` (and, when the skill falls back to the REST API, to `https://qrx.codes/v1`). Each request carries your API key and the prompt, destination link and style you asked for. A finished code's `imageUrl` is on `https://qrx.codes/media/`, which redirects to QRX's image CDN.

## Privacy, terms and support

- Privacy: https://qrx.codes/privacy
- Terms: https://qrx.codes/terms
- Support: https://qrx.codes/developers or hello@qrx.codes
- API docs: [qrx.codes/developers](https://qrx.codes/developers); MCP server: [qrx.codes/developers/mcp](https://qrx.codes/developers/mcp); for agents: [llms.txt](https://qrx.codes/llms.txt) and the [OpenAPI document](https://qrx.codes/v1/openapi.json). No key needed to read them.

QRX stores the prompts, links and images you create so they appear in your account. It doesn't read your chat history; it only sees the arguments the client sends to its tools.

## Licence

The configuration files, skill and documentation in this repository are released under the [MIT licence](LICENSE). The QRX service itself is a hosted product, governed by the [QRX terms](https://qrx.codes/terms).

<!--
Docs sources (re-check these when clients change; all read 8 Oct 2026):
- Claude Code MCP (claude mcp add --header, .mcp.json ${VAR} expansion, /mcp OAuth): https://code.claude.com/docs/en/mcp
- Claude custom connectors (Request headers fixed credentials, OAuth "Sign in when needed", Free = 1 connector): https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- ChatGPT custom MCP server (auth: OAuth / No authentication / mixed; no API key option; web only): https://developers.openai.com/api/docs/guides/custom-mcp-server
- ChatGPT plugins testing: https://developers.openai.com/plugins/deploy/connect-chatgpt.md
- Cursor mcp.json (url, headers, ${env:VAR}): https://cursor.com/docs/context/mcp
- Cursor install links (https://cursor.com/install-mcp?name=&config=<base64>, which hands off to cursor://anysphere.cursor-deeplink/mcp/install): https://cursor.com/docs/context/mcp/install-links
- VS Code MCP servers (type http, headers, ${input:}): https://code.visualstudio.com/docs/copilot/customization/mcp-servers
- VS Code MCP configuration reference (inputs is an array of {type,id,description,password}): https://code.visualstudio.com/docs/copilot/reference/mcp-configuration
- Windsurf / Devin Desktop MCP (serverUrl, headers, ${env:}, config paths; docs.windsurf.com now redirects here): https://docs.devin.ai/desktop/cascade/mcp
- Cline MCP (type streamableHttp, headers, Authorize OAuth): https://docs.cline.bot/mcp/configuring-mcp-servers
- Zed MCP (context_servers url + headers; OAuth when no Authorization header): https://zed.dev/docs/ai/mcp
- Goose config files (type streamable_http, uri, headers, paths): https://goose-docs.ai/docs/guides/config-files/
- Goose using extensions: https://goose-docs.ai/docs/getting-started/using-extensions/
- Codex MCP (bearer_token_env_var, codex mcp add --url, codex mcp login; developers.openai.com/codex/mcp redirects here): https://learn.chatgpt.com/docs/extend/mcp?surface=cli
- Gemini CLI MCP (httpUrl, headers, gemini mcp add --transport http --header): https://geminicli.com/docs/tools/mcp-server/
- VS Code install badge: https://vscode.dev/redirect/mcp/install?name=&inputs=&config= (opens VS Code via its redirect page).
-->
