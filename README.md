# Meridian

**Every case, every station, mapped live.**

Meridian is an open, AI-ready layer designed to sit alongside a histology lab's LIMS. It shows every case, block and station live, flags problems the moment the data shows them, estimates when each case will be ready for the pathologist (or says "unknown" and why), and gives any AI agent a read-only endpoint to query the lab through MCP. Rules decide, the AI explains, scientists act.

> ⚠️ **Simulated data: not connected to a real lab.** Meridian runs on a fictional, expert-elicited dataset with illustrative timings ([how it was made](docs/DATA_PROVENANCE.md)). It predicts lab preparation and handoff to the pathologist only. It never diagnoses, interprets tissue, reports cases, or predicts reporting times or screening-programme deadlines.

Built for the Science Works *Reinvent the Wheel* hackathon (London, 16–18 October 2026) by team **Block Party**: Victoria (histology lab lead, domain) and Manthan (build).

![Meridian dashboard at Tuesday 11:30: 450 cases (346 new, 104 backlog), the lab-clock showing 8 of 450 handed to the pathologist, urgent cases in red, BCSP and CSP progress, and one new incident flag at Microtomy station 4](docs/img/dashboard.png)

## What we reinvented: sample tracking and the LIMS

1. **What the software is for.** A LIMS is the lab's digital record of every sample: when it arrived and each step it has passed through. In histology, tissue is cut into blocks, processed overnight, set in wax, sliced into slides, stained, scanned and quality-checked before a pathologist sees it. That is up to 10 stations, with many blocks and slides per case.
2. **What wasn't working** (from Victoria's experience; LIMS capabilities vary):
   - the record isn't a live view, so finding what's holding a case means checking several screens and walking the lab;
   - errors (a missing block, missing levels, a failed stain run, a missing scan) are often found down the line;
   - one equipment failure silently delays many cases;
   - no AI agent can ask the system anything.
3. **What Meridian makes better:**
   - one live map of every case, block and station;
   - evidence-backed alerts, each with what, evidence, why and the suggested staff check;
   - honest handoff estimates;
   - an **open event model** and an **MCP endpoint for agentic control**, read-only by design.

It answers the brief's "disconnected tools or closed data" with an open event model, `GET /api/events` and a `FeedAdapter`; and "no end points for agentic control" with the `meridian` MCP server and its `shift_handover` workflow.

## What it does

The whole workbook is loaded as recorded at **Tuesday 11:30**, the shared simulated clock. Nothing is staged or invented.

| | |
|---|---|
| **Dashboard** | 450 cases = 346 new + 104 backlog; a 3D "lab clock" for cases handed to the pathologist (8 of 450); urgent cases in red with ETAs; BCSP, CSP and cytopathology tiles; one search box for any case ID |
| **Incident flags** | Four deterministic rules, each with what, evidence, why and the suggested staff check. New incidents bounce until a person acknowledges them; acknowledging never resolves (26H1004: 1 of 3 levels at Microtomy station 4) |
| **Case pages** | Every station a case passed with recorded times, blocks and levels, why it is waiting, and its handoff estimate or "unknown" with the reason |
| **Light simulation** | Victoria's "Histo main lab" board replays the recorded events from Day -1 06:30 to 11:30 in about 40 s. Samples move only along drawn lines and only at their recorded times; at 11:30 the board equals the live state (tested) |
| **Station pages** | Current cases, queue, load, cases worked there earlier, staff from recorded initials only |
| **Stainer incident** | `H&E-BASKET-01` failed at 10:45 (20 slides, 10 cases): notified, acknowledged, troubleshot, reloaded, repeat run from 11:05, with every step from the event log |
| **Section pages** | Backlog, new, urgent, BCSP, CSP, cytopathology: completion donut, received and cleared over time, every case with location and ETA |
| **Ask Meridian** | A chat on every page answering the six spec questions from the same functions as the dashboard; no model, read-only, honest about unknowns |
| **MCP + agent console** | Claude Desktop (or any MCP client) calls `get_case`, `list_alerts`, `cases_delayed` and the `shift_handover` prompt; each call lights up the dashboard's console |
| **LIMS view, presenter, Story mode** | A plain grey "old way" event table for contrast; speaker notes from `pitch/SCRIPT.md` with a 3:00 countdown; Story mode moves the demo window through the script's beats in step with the presenter |

![Light simulation of the histology lab at 11:30: stations from samples received to cases emitted, the microtomy queue at 137, incident markers at the stainer and Microtome 4](docs/img/simulation.png)

![Stainer incident H&E-BASKET-01: recorded action timeline from run failed at 10:45 to repeat run started at 11:05, the 3×3 basket grid, and the 10 affected cases with ETAs](docs/img/incident-stainer.png)

## Quick start (Node 20+)

```bash
git clone https://github.com/Manthanbhanushali010/meridian-lab.git
cd meridian-lab
npm install
npm run dev        # API on http://localhost:8787, dashboard on http://localhost:5173
npm test           # 225 acceptance tests
```

Open http://localhost:5173. Search 26H2345, open **Simulation** and press **Play the lab's morning**, double-click the incident flag and press **Acknowledge**, then **Reset demo**. **Presenter** opens the speaker notes in their own window.

| Command | What it does |
|---|---|
| `npm run dev` | API and dashboard together, with hot reload |
| `npm test` | All acceptance tests (Vitest) |
| `npm run mcp` | The MCP server on stdio. For Claude Desktop use the absolute-path config in [docs/MCP_SETUP.md](docs/MCP_SETUP.md) |
| `npm run convert` | Rebuild `data/cellpath.json` from the workbook (already committed) |
| `npm run demo:walk` | Walks the 8-beat demo in a real browser (Playwright, installed Chrome) and fails on any broken beat |
| `npm run screenshots` | Screenshots every page at 1440×900 and 1280×720 into `docs/screenshots/` and checks for overflow |
| `npm run export:hf` | Rebuild the open dataset CSVs in `hf_dataset/` |
| `VITE_FX=off npm run dev` | Plain dashboard with every animation off (the stage fallback) |

Tool versions are pinned so the project runs on Node 20.11 (Vite 6, Vitest 3, TypeScript 5.9). `npm audit` reports advisories in Vitest's own dependencies (tinypool, @vitest/mocker). They affect only the local test runner, never the app. On Node 22+ you can move to Vitest 5 to clear them.

## Architecture

```mermaid
flowchart LR
  X[data/CellPath_Mock_Data.xlsx] -->|npm run convert| J[data/cellpath.json]
  J --> F[FeedAdapter<br/>workbook by default]
  F --> S[server/ · Hono :8787<br/>single in-memory state]
  S --> R[rules: 4 alerts]
  S --> E[estimates: timing rules]
  R & E --> A[REST API + SSE]
  T[Acknowledge / Reset<br/>a person on the dashboard] -->|the only mutations| S
  A --> W[web/ · React dashboard<br/>+ Ask Meridian chat]
  A --> M[mcp/ · MCP server 'meridian'<br/>read-only tools + prompt]
  M --> C[Claude Desktop / any agent]
  M -. tagged reads .-> A
  A -. agent-activity .-> W
```

- **One source of truth.** Only `server/` holds state. The dashboard and the MCP server both read the same HTTP API, so they can never disagree.
- **Deterministic first.** Code computes every count, alert and estimate. The model only explains tool results. An overclaim guard scans alert, estimate and tool output for banned claims (diagnosis, reporting times, screening deadlines, "misplaced").
- **Read-only AI.** MCP tools are annotated read-only. Agent activity is logged without touching case state, and a test proves it.

## MCP: an endpoint for agentic control

See **[docs/MCP_SETUP.md](docs/MCP_SETUP.md)** for the Claude Desktop config (absolute paths), MCP Inspector commands (the on-stage backup), the four demo questions and troubleshooting.

- **Tools:** `get_case(case_id)`, `list_alerts(kind?, case_id?)`, `cases_delayed(programme?, priority?)`.
- **Prompt:** `shift_handover` makes the agent call `list_alerts` → `get_case` for each affected case → `cases_delayed`, then write a sourced brief: open alerts with evidence IDs, cases at risk, unknowns, staff checks, and what is not in scope. `mode=brief` returns the same brief built by code.
- **Resource:** `meridian://overview`.

## Open event model: bring your own LIMS export

See **[docs/EVENT_MODEL.md](docs/EVENT_MODEL.md)**:
- the entities (case → block → slide, basket, station, event) and the 36 event types;
- the paged `GET /api/events`;
- the `FeedAdapter` interface;
- an **IEEE XES / OCEL 2.0 mapping**;
- step-by-step "bring your own LIMS export" (`MERIDIAN_DATA=/path/to/export.json npm run dev`).

## Data

- **[docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md)**: how the synthetic, expert-elicited dataset was built and validated, the evidence base, and its limitations.
- `hf_dataset/`: the open dataset (five CSVs, CC BY 4.0) with generic equipment names and demo notes removed. See its [dataset card](hf_dataset/README.md).
- Volumes: 450 cases · 712 blocks · 426 slides · 1,253 events · 22 detailed demo cases. All identifiers, devices and staff initials (AA/BB) are fictional.

## Tests

`npm test` runs **225 tests in 25 files**, all passing. They cover:
- data reconciliation and validation (counts, links, ordering, the 11:30 clock);
- each alert's IDs, evidence and state (New, Check needed, Acknowledged — awaiting check, In progress);
- estimates (26H1003 and 26H1016 unknown, 26H1018 and 26H2345 ready, the 30-minute repeat run from 11:05);
- the simulation: `stateAt(11:30)` places every one of the 450 cases on the station card that holds it;
- the six chat questions, unknown questions and out-of-scope questions;
- the presenter script parsed word for word from `pitch/SCRIPT.md`;
- every API route, SSE, the events API and the feed adapter;
- MCP tools, prompt and resource over an in-memory MCP client, and agent activity never mutating state;
- design rules (tokens, contrast, red only for urgent, no text under 14 px, reduced motion) and the overclaim guard.

`npm run demo:walk` checks the demo itself, beat by beat, in a browser.

## Safety boundaries

- Histopathology lab preparation only, up to handoff to the pathologist. No diagnosis, tissue interpretation, reporting, patient management or screening-deadline prediction.
- No invented events, times or causes. Missing data returns "unknown" or "not enough information" with the reason.
- A missing scan record never proves a slide is misplaced: "missing scan event; check the slide location or scan record."
- Decalcification is a normal stage: no alert and no invented duration.
- Urgency comes only from the recorded priority.
- Delay is claimed only against `config/targets.json`; otherwise "target comparison unavailable".
- AI tools are read-only; only a person pressing the dashboard's demo controls changes state.
- Fictional IDs only, generic equipment labels, and "SIMULATED DATA" always visible.

## Built with

| | Licence |
|---|---|
| [Hono](https://github.com/honojs/hono) + @hono/node-server: API and Server-Sent Events | MIT |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) + [zod](https://github.com/colinhacks/zod): the `meridian` MCP server | MIT |
| [MCP Inspector](https://github.com/modelcontextprotocol/inspector): testing the tools (via npx) | MIT |
| [React](https://react.dev) + [Vite](https://vitejs.dev): dashboard | MIT |
| [Motion](https://motion.dev) (formerly Framer Motion): incident flags, lab clock, page transitions | MIT |
| [NumberFlow](https://number-flow.barvian.me): rolling counts and times | MIT |
| [Tailwind CSS](https://tailwindcss.com) | MIT |
| [Vitest](https://vitest.dev): tests | MIT |
| [Playwright](https://playwright.dev): demo walk and screenshots (dev only) | Apache-2.0 |
| [SheetJS](https://sheetjs.com) (from cdn.sheetjs.com): workbook conversion | Apache-2.0 |
| tsx, concurrently, TypeScript | MIT / MIT / Apache-2.0 |
| [Matt Pocock's skills](https://github.com/mattpocock/skills) (`/tdd` and others) and [Impeccable](https://github.com/pbakaus/impeccable) (design): agent skills used while building; not shipped in this repo | see each repo |
| Built with [Claude Code](https://claude.com/claude-code) | |

Third-party repos consulted for reference are logged in [external/REGISTRY.md](external/REGISTRY.md); no code was copied from them.

## Approved wording

> Meridian is designed to sit alongside a LIMS. The agent reads case events from the lab's workflow systems. We're simulating those feeds in this demo; a live version would connect through the interfaces available at each lab, with lab-approved access control, information-governance review and audit.

## Licence

Code: MIT, see [LICENSE](LICENSE). Dataset in `hf_dataset/`: CC BY 4.0.
