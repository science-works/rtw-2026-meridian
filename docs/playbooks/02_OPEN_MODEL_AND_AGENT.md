# Playbook `!meridian-agentic`: open event model, MCP tools and the agentic shift handover

## Overview
Make Meridian answer the brief literally:
- **"Disconnected tools or closed data"** → publish an open event model plus a FeedAdapter.
- **"No end points for agentic control"** → MCP server `meridian`.
- **"Use agentic AI"** → a `shift_handover` prompt that makes an agent investigate across tools.

Done = **Checkpoint 3**. Serves FR-11 to FR-13 in `docs/PRD.md`.

## What's Needed From User
- Claude Desktop installed and signed in (Max), and the user's OK to edit `~/Library/Application Support/Claude/claude_desktop_config.json` themselves (the agent only prints the snippet).
- Confirmation that Checkpoint 2 has passed.

## Procedure

### Phase A: open event model (server/, docs/)
1. Define `FeedAdapter` in `server/src/feed/`:
   ```ts
   interface FeedAdapter { name: string; load(): Promise<NormalisedFeed> }
   ```
   `NormalisedFeed` = `{ clock, cases[], blocks[], slides[], events[], rules[] }`, using the `shared/` types.
2. Refactor the existing loader into `WorkbookJsonAdapter implements FeedAdapter`. No behaviour change, and the tests stay green.
3. Add `GET /api/events?caseId=&since=&limit=&cursor=`: paged and read-only; returns events in the open schema.
4. Write `docs/EVENT_MODEL.md`:
   - the entities and fields, with types and an example JSON for each;
   - the event types used (CASE_RECEIVED … CASE_READY_FOR_PATHOLOGIST);
   - the ordering rules, and how alerts and estimates are derived;
   - a "Bring your own LIMS export" section: map your CSV columns to `NormalisedFeed`, implement `load()`, and register it with an env var `FEED_ADAPTER=`.
5. Add API tests for `/api/events` (paging, filtering, and that it's read-only). Commit and push.

### Phase B: MCP server (mcp/)
6. Scaffold `mcp/` with `@modelcontextprotocol/sdk` (stdio); server name `meridian`; `npm run mcp` starts it.
7. Implement the tools, each calling the HTTP API on `http://localhost:8787` (configurable through `MERIDIAN_API_URL`):
   - `get_case({case_id})` → CaseDetail plus alerts plus the estimate or the reason it's unknown.
   - `list_alerts({kind?, case_id?})` → alerts with evidence.
   - `cases_delayed({programme?, priority?})` → holds plus a target comparison, or "target comparison unavailable".
   - Sub-step: every tool description states "Read-only. Lab workflow only. Never diagnoses or predicts reporting time or screening deadlines. Data is simulated."
8. Implement the **prompt** `shift_handover({focus?})`, which instructs the model to:
   - call `list_alerts`;
   - for each affected case, call `get_case`;
   - call `cases_delayed`;
   - write a brief with these sections:
     1. *Open alerts* (each with evidence event IDs);
     2. *Cases at risk* (estimate, or "unknown + reason");
     3. *Things we can't know yet*;
     4. *Suggested staff checks*;
     5. *Not in scope* (diagnosis or reporting).
   It cites the IDs, invents nothing, and gives no clinical advice.
9. Optional: expose a **resource** `meridian://overview` that returns `/api/overview`.
10. Write MCP tests: tool schemas, that each tool proxies the API, that errors are surfaced (the API being down → a clear message), and that the prompt text contains the required steps.
11. Commit and push.

### Phase C: hook-up and proof
12. Print the Claude Desktop config snippet with **absolute paths**:
    ```json
    { "mcpServers": { "meridian": { "command": "npm", "args": ["--prefix", "/ABS/PATH/meridian-lab", "run", "mcp"] } } }
    ```
    (Or point it at the node entry file directly if `npm --prefix` misbehaves.)
13. Write `docs/MCP_SETUP.md`:
    - Claude Desktop setup;
    - **MCP Inspector**: `npx @modelcontextprotocol/inspector npm run mcp`;
    - the 4 demo questions plus running `shift_handover`;
    - a troubleshooting section.
14. ⏸ **Checkpoint 3:** with `npm run dev` running, show the answers to:
    1. "Where is 26H1003?"
    2. "What happened to the stainer basket?" (after the trigger)
    3. "I'm starting the next shift. What do I need to know?" (via `shift_handover`; the tool-call chain must be visible)
    4. "Which screening cases may be delayed?"
    
    Every answer cites IDs and invents nothing.
15. Add `B5`, `C2b` and `C3` lines to STATUS.md. Commit and push.

## Specifications
- `/api/events` is documented in `docs/EVENT_MODEL.md` with examples; the FeedAdapter seam exists; the workbook adapter is the default; all earlier tests are still green.
- `npm run mcp` starts with no errors; the Inspector lists 3 tools, 1 prompt and (optionally) 1 resource.
- `shift_handover` makes at least 3 distinct tool calls and returns all 5 sections with evidence IDs.
- The dashboard and the MCP answers agree after the trigger, from the same state.
- No tool can mutate state, and a test proves it.

## Advice and Pointers
- Keep the tool outputs compact, structured JSON: the model explains, the code computes.
- If Claude Desktop is slow to pick up config changes, quit it fully (⌘Q) and reopen it.
- **The Inspector is your stage backup:** rehearse the 4 questions there too.
- Mention the brief's words in the README's MCP section: "open interface", "end point for agentic control".

## Forbidden Actions
- Don't add write tools (e.g. "clear alert", "trigger failure"); the simulator stays a dashboard-only control.
- Don't give the MCP server its own copy of the data. Don't bypass the API.
- Don't edit the user's Claude Desktop config file yourself; print the snippet.
- Don't put API keys in code or the config snippet.
