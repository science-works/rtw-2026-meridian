# Connect Claude Desktop to Meridian (MCP)

Meridian exposes three **read-only** MCP tools over stdio. Each tool calls the Meridian HTTP API on `http://localhost:8787`, so Claude, the dashboard and any other agent see the same live state. The tools cannot create events, clear alerts, change priority or edit data; the only change in the demo is the dashboard's "Trigger stainer basket failure" button.

| Tool | Returns |
|---|---|
| `get_case(case_id)` | Recorded stage, cohort, priority, programme tag, blocks, slides and levels, recorded timeline, alerts, and the pathologist handoff estimate with its components and assumptions, or why it is unknown |
| `list_alerts(kind?, case_id?)` | Active alerts, each with what, evidence, why it is flagged, affected cases and slides, the time, and the suggested staff check |
| `cases_delayed(programme?, priority?)` | Cases with a recorded hold, plus cases past a configured target (`config/targets.json`); otherwise "target comparison unavailable". Also an urgent watch list by recorded priority |

All data is simulated. Meridian estimates readiness for pathologist handoff only; it never diagnoses, reports, or predicts reporting times or screening deadlines.

## 1. Start the API

```bash
npm install
npm run dev        # API on :8787, dashboard on :5173
```

## 2. Add Meridian to Claude Desktop

Open Claude Desktop → Settings → Developer → Edit Config, which opens
`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS. Add the `meridian` entry. Replace the paths with your own: `which node` gives the first one, and the others point into your clone of this repo.

```json
{
  "mcpServers": {
    "meridian": {
      "command": "/usr/local/bin/node",
      "args": [
        "/Users/manthanbhanushali/Projects/meridian-lab/node_modules/tsx/dist/cli.mjs",
        "/Users/manthanbhanushali/Projects/meridian-lab/mcp/src/index.ts"
      ],
      "env": { "MERIDIAN_API": "http://localhost:8787" }
    }
  }
}
```

Use absolute paths. Claude Desktop does not inherit your shell's `PATH`, and `npm run mcp` prints npm's banner to stdout, which would corrupt the MCP stream (use `npm run -s mcp` if you run it by hand).

Quit and reopen Claude Desktop. "meridian" should appear under the tools (hammer) menu with three tools.

## 3. Demo questions

Ask these with `npm run dev` running:

1. "Where is 26H1003?"
2. (Click **Trigger stainer basket failure** on the dashboard first.) "What happened to the stainer basket?"
3. "I'm starting the next shift. What do I need to know?"
4. "Which screening cases may be delayed?"

Expected shape of every answer: direct answer → case IDs and recorded stage → evidence → handoff estimate with assumptions, or "unknown" with the reason → the suggested staff check.

Click **Reset demo** on the dashboard between rehearsals.

## 4. Test the tools without Claude (MCP Inspector)

The Inspector is also the on-stage backup if Claude Desktop misbehaves. Version 0.15.0 is the newest that runs on Node 20; on Node 22.19+ you can drop the `@0.15.0`.

Visual UI (opens a browser tab):

```bash
npx @modelcontextprotocol/inspector@0.15.0 \
  "$(which node)" "$PWD/node_modules/tsx/dist/cli.mjs" "$PWD/mcp/src/index.ts"
```

Command line:

```bash
npx @modelcontextprotocol/inspector@0.15.0 --cli "$(which node)" "$PWD/node_modules/tsx/dist/cli.mjs" "$PWD/mcp/src/index.ts" --method tools/list
npx @modelcontextprotocol/inspector@0.15.0 --cli "$(which node)" "$PWD/node_modules/tsx/dist/cli.mjs" "$PWD/mcp/src/index.ts" \
  --method tools/call --tool-name get_case --tool-arg case_id=26H1003
```

Run these from the repo root, with `npm run dev` running.

## Troubleshooting

- **"Meridian API not reachable"**: start `npm run dev`, or set `MERIDIAN_API` in the config if the API runs elsewhere.
- **No tools appear in Claude Desktop**: check `~/Library/Logs/Claude/mcp-server-meridian.log`. The usual cause is a wrong absolute path.
