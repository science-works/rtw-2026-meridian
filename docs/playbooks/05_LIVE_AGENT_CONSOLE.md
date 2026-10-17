# Playbook `!meridian-agent-live`: show the AI agent working, live, on the dashboard

## Overview
Make the agent **visible on the same localhost page**. When Claude Desktop (or the MCP Inspector) calls a Meridian tool, the dashboard shows it happening in real time:
- an **Agent console** panel streams each tool call ("Claude is reading the alerts… opening 26H1005…");
- the cases being investigated get a soft periwinkle outline;
- a one-way animated beam runs from the "Claude via MCP" badge **into** the case, proving the agent only reads.

This turns the 1:45 beat of the pitch into something the room *sees*, not just hears. It serves the brief's "use agentic AI" and "end points for agentic control", plus Presentation.

**Do this after Checkpoint 3 (C2b `shift_handover` done) and VX0.** It's worth more than the 3D view.

## What's Needed From User
- Checkpoint 3 passed. Claude Desktop connected, or the MCP Inspector working.
- Agreement that the console shows tool names, arguments (case IDs) and short result summaries, **never** free-text model output that could contain invented claims.

## Procedure

### Phase A: server (server/src/)
1. Accept an optional header `X-Meridian-Client: mcp` and `X-Meridian-Tool: <tool name>` on read routes. The MCP server sets both on every call it makes.
2. On each tagged request, append an **activity record** to an in-memory ring buffer (last 50):
   `{ id, at (wall clock), tool, args (case_id / filters only), resultSummary (e.g. "4 alerts", "26H1005 · H&E staining · est. 12:55"), caseIds[] }`.
   Sub-step: the summary is built by code from the response, never by the model.
3. Broadcast each record over the existing SSE stream as event `agent-activity`. Add `GET /api/agent/activity` returning the buffer.
4. **Read-only guarantee:** activity logging must not change case state. Add a test that a tagged request leaves the state version unchanged.
5. Add `POST /api/agent/clear` (simulator-only, like reset) so rehearsals start clean. Make `/api/sim/reset` clear it too.

### Phase B: MCP (mcp/)
6. Make the MCP tools send `X-Meridian-Client: mcp` and `X-Meridian-Tool: <name>` on every API call.
7. For `shift_handover`, add a `X-Meridian-Run: <uuid>` header so the console groups one run's calls together.

### Phase C: dashboard (web/src/agent/)
8. Build an `AgentConsole` panel (collapsible, right column under the attention queue):
   - header "Claude via MCP · read-only", with a live dot while calls arrive;
   - a **Magic UI Animated List** of activity rows: time · tool · case IDs as chips · summary;
   - rows grouped by run, with a run header "Shift handover · 7 calls".
9. On each activity, give the referenced case rows and lane counts a periwinkle outline for 1.5 s (≤900 ms in, fade out).
10. Draw a **Magic UI Animated Beam** from the console badge to the referenced case or alert card, **one direction only**, ≤900 ms.
11. Respect `VITE_FX=off` (plain list, no beam) and reduced motion.
12. In Story mode (E1), add a step "Ask the agent" that waits for the first `agent-activity` event and then follows the beam.

### Phase D: proof
13. ⏸ **Checkpoint Agent-Live.** With `npm run dev` running, run `shift_handover` from Claude Desktop (or the Inspector). The console shows each tool call within 1 s, grouped as one run; the case rows glow; the beam points into the dashboard. Reset clears the console. Record a 30-second clip.
14. Commit, push, and log it in STATUS.md.

## Specifications
- Every console row comes from a real API call made by the MCP server; nothing is simulated or typed by the UI.
- Activity never mutates case state (proven by a test). Clearing it is a simulator control only.
- The console never shows model-generated prose; only tool names, arguments and code-built summaries.
- It works with `VITE_FX=off`. No new dependencies beyond Motion and Magic UI (already approved).

## Advice and Pointers
- On stage, put **Claude Desktop on the left and Meridian on the right**, so the room sees the question asked and the dashboard light up as the agent reads.
- If Claude Desktop is slow, run the same prompt from the MCP Inspector; the console works identically.
- Keep the beam subtle. It's evidence of the direction of data flow, not decoration.

## Forbidden Actions
- Don't let the agent trigger the simulator or clear alerts. Only humans press demo controls.
- Don't stream the model's free text into the dashboard.
- Don't fake activity rows for the demo.
