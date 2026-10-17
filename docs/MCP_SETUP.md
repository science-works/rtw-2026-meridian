# Connect Claude Desktop to Meridian (MCP)

Meridian exposes three **read-only** MCP tools over stdio. Each tool calls the Meridian HTTP API on `http://localhost:8787`, so Claude, the dashboard and any other agent see the same live state. The tools cannot create events, clear alerts, change priority or edit data; the only change in the demo is the dashboard's "Trigger stainer basket failure" button.

| Tool | Returns |
|---|---|
| `get_case(case_id)` | Recorded stage, cohort, priority, programme tag, blocks, slides and levels, recorded timeline, alerts, and the pathologist handoff estimate with its components and assumptions, or why it is unknown |
| `list_alerts(kind?, case_id?)` | Active alerts, each with what, evidence, why it is flagged, affected cases and slides, the time, and the suggested staff check |
| `cases_delayed(programme?, priority?)` | Cases with a recorded hold, plus cases past a configured target (`config/targets.json`); otherwise "target comparison unavailable". Also an urgent watch list by recorded priority |

One **prompt**, `shift_handover`, makes an agent investigate across the tools. It has two modes:

- **`mode=agent` (default)**: the prompt tells the model to call `list_alerts` → `get_case` for each affected case → `cases_delayed`, then write a brief with five sections (open alerts with evidence event IDs, cases at risk, things we can't know yet, suggested staff checks, not in scope). Every call is visible in Claude Desktop, and in Meridian's agent console. Optional `focus` (e.g. `26H1005`).
- **`mode=brief`**: Meridian builds the same brief in code from the same calls and returns it ready-made. Use it in the MCP Inspector, where no model runs, or as a fallback on stage.

One **resource**, `meridian://overview`, returns the live clock, totals and stage counts.

In Claude Desktop, pick the prompt from the "+" (attach) menu → meridian → shift_handover.

All data is simulated. Meridian estimates readiness for pathologist handoff only; it never diagnoses, reports, or predicts reporting times or screening deadlines.

## Watching the agent on the dashboard

Every call the MCP server makes is tagged (`X-Meridian-Client: mcp`, `X-Meridian-Tool`, `X-Meridian-Run`), so the dashboard's **agent console** (right column, "Claude via MCP · read-only") shows each call live:
- time, tool name, case IDs and a one-line summary built by Meridian's code, never model text;
- the cases being read get a periwinkle outline;
- a one-way beam points from the badge into the dashboard.

`shift_handover` calls are grouped as one run. Logging never changes case state. **Reset demo** (or the console's **Clear**) empties it. On stage, put Claude Desktop on the left and Meridian on the right.

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

### The shift_handover prompt in the Inspector

```bash
curl -X POST localhost:8787/api/sim/basket-failure     # optional: same as the dashboard button
npx @modelcontextprotocol/inspector@0.15.0 --cli "$(which node)" "$PWD/node_modules/tsx/dist/cli.mjs" "$PWD/mcp/src/index.ts" \
  --method prompts/get --prompt-name shift_handover --prompt-args mode=brief
```

In the visual Inspector, open the **Prompts** tab → `shift_handover`, set `mode` to `brief` → **Get prompt**. Without `mode=brief` you get the agent instructions instead, because the Inspector has no model to run them. Output captured after the trigger (abridged):

```text
# Shift handover: Day 1 11:30 (simulated data)
Built from list_alerts → get_case for each affected case → cases_delayed. Read-only; staff decide every action.

## Open alerts (4)
1. [HIGH] H&E-BASKET-01 H&E run failed: 20 slides across 10 cases (raised Day 1 10:45)
   Evidence: EV-01215, EV-01250, EV-01255, EV-01251, EV-01254, EV-01256. Cases: 26H1005, 26H1006, … 26H1014.
2. [HIGH] 26H1004 block A1: 1 of 3 required levels recorded (raised Day 1 10:40)
   Evidence: EV-01230, EV-01210. Cases: 26H1004.
3. [MEDIUM] 26H1003: 5 of 6 blocks complete; F1 outstanding (raised Day 1 11:15)
   Evidence: EV-01121, EV-00368, EV-01226, EV-01227, EV-01228, EV-01229. Cases: 26H1003.
4. [MEDIUM] 26H1015: missing scan event (scan expected since Day 0 15:30) (raised Day 1 11:30)
   Evidence: EV-01098, EV-01099. Cases: 26H1015.

## Cases at risk (13)
- 26H1005 · H&E staining · handoff estimate Day 1 11:45 (includes the repeat H&E run)
  … (26H1006–26H1014 the same)
- 26H1004 · Microtomy · estimate unknown: Block A1: 1 of 3 required levels recorded; staff review is needed before the case advances.
- 26H1003 · Waiting for dissection/cut-up · estimate unknown: No reliable whole-case estimate: 5 of 6 blocks complete; F1 outstanding. …
- 26H1015 · Scanning · estimate unknown: Missing scan event; scan status unknown until the slide location or scan record is checked.

## Unknowns (not enough information)
- 72 × Cut-up duration is not configured and no processor is assigned yet.
- 20 × Decalcification has no configured duration (a normal, longer-running step).
- 2 × Pathologist cut-up time is not recorded or configured.

## Urgent watch list (15; recorded priority, not a delay claim)
- 26H2345 · Ready for pathologist handoff · ready since Day 1 09:30
  …

## Staff checks
- [ ] 10 cases (26H1005–26H1014): Check the H&E auto-stainer and the 20 slides in H&E-BASKET-01; record the repeat run and the follow-up check.
- [ ] 26H1004: Staff review: check the protocol and the cutting record at Microtome station 4 before the case advances.
- [ ] 26H1003: Confirm with the cut-up bench when F1 will be cut up; the rest of the case cannot be handed off without it.
- [ ] 26H1015: Missing scan event; check the slide location or scan record.

## Targets
target comparison unavailable

## Not in scope
Diagnosis, reporting times and screening-programme deadlines are not in scope. Meridian covers lab preparation up to pathologist handoff.
```

## Troubleshooting

- **"Meridian API not reachable"**: start `npm run dev`, or set `MERIDIAN_API_URL` (or `MERIDIAN_API`) in the config if the API runs elsewhere.
- **No tools appear in Claude Desktop**: check `~/Library/Logs/Claude/mcp-server-meridian.log`. The usual cause is a wrong absolute path.
