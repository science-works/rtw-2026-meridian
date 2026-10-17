# CLAUDE.md — Meridian build contract

> **v7 (Saturday night): `docs/playbooks/07_V7_SPEC_BUILD.md` is the active build plan, and `docs/CELLPATH_MASTER_PRODUCT_VISUAL_SPEC.md` (Victoria's final spec) decides screens, labels and the demo story. The playbook's "Decisions already made" override this file where they conflict. Fallback demo: git tag `demo-safe-v6`.**

> **Product name: Meridian** (formerly CellPath, briefly Microtome). Tagline: *"Every case, every station, mapped live."* Use "Meridian" in the UI, README and MCP server name (`meridian`). File names such as `CellPath_Mock_Data.xlsx` and `CELLPATH_*.md` keep their original names.

Read this file, **`docs/PRD.md` (problem, users, flows, functional requirements)**, **`docs/MASTER_PLAN.md` (judging criteria, task cards, contracts, folder ownership for parallel agents)**, the playbooks in `docs/playbooks/` (start at `00_INDEX.md`), `docs/DATA_PROVENANCE.md` (how the synthetic data was made), `docs/CELLPATH_MASTER_PRODUCT_VISUAL_SPEC.md` and `docs/CELLPATH_HACKATHON_PLAYBOOK.md` before changing anything. The master visual spec decides screens, interactions and exact case timelines. This file decides the stack, the build order, safety and the fixes listed here. If the two conflict, stop and ask. For background and the reasons behind decisions, read `context/00_READ_ME_FIRST.md` (`context/05_DECISION_LOG.md` overrides older documents in `context/`). **Order of authority: CLAUDE.md > `docs/PRD.md` > `docs/MASTER_PLAN.md` > `docs/playbooks/*`.** These rules apply to Claude Code, Devin or any coding agent. (`AGENTS.md` is a copy of this file for other agents.)

## Context and deadline

- Hackathon: Science Works "Reinvent the Wheel". Brief: *use agentic AI to improve scientific software*. Our target: **an open, AI-ready layer that sits alongside a lab's LIMS**.
- **Submission: Sunday 10:00** (public repo URL + commit hash). The venue closes Saturday 20:00. Pitch: 3 min demo + 2 min judge questions.
- Judged equally on Impact, Technical execution ("is it working, usable, does it do what it claims?") and Presentation.
- **Scope rule: working and honest beats feature-rich.** Build in priority order (below). Do not start a later priority until the earlier one works end to end.

## Mission

A live, interactive prototype that layers a dashboard and an AI agent over **fictional** histology workflow events. Deterministic code computes current state, alerts and handoff estimates. The LLM only explains tool results in plain language. The data feed is simulated; never describe the prototype as connected to a live lab.

## Stack (fixed; do not change without asking)

- **TypeScript everywhere, Node 20+.** One language for the server, the MCP server and the UI.
- `data/CellPath_Mock_Data.xlsx` is the source artifact and is never edited. `scripts/convert.ts` (SheetJS `xlsx` package) converts it to `data/cellpath.json`. Skip blank rows.
- **`server/`**: a small Hono or Express app on `http://localhost:8787`. It holds the **single in-memory state** and exposes a read API plus the demo controls `POST /api/sim/replay-incident` (once; 409 after), `POST /api/alerts/:id/acknowledge` (a human action from the dashboard) and `POST /api/sim/reset`. It pushes updates to the UI with Server-Sent Events (`GET /api/stream`).
- **`mcp/`**: an MCP server using `@modelcontextprotocol/sdk` (stdio). Its three tools call the HTTP API on :8787, so the dashboard, the chat and Claude Desktop always see the same state. It must not keep its own copy of the data.
- **`web/`**: Vite + React. Design tokens below. The approved visual toolkit is in `docs/VISUAL_LAYER.md`: Motion, Magic UI, NumberFlow and shadcn/ui, all MIT. Add nothing else without asking. Keep a `VITE_FX=off` plain fallback.
- **Tests:** Vitest. `npm test` runs every acceptance test.
- **Scripts:**
  - `npm run dev` starts the server and the web app together (with `concurrently`) and hot-reloads;
  - `npm run mcp` starts the MCP server;
  - `npm test` runs the tests.
- **In-app chat (optional, P6):** uses the Anthropic API with the same three tools. The key is read only from `.env` as `ANTHROPIC_API_KEY`. Never commit `.env`; only `.env.example` is committed. If there is no key, the chat panel shows "Connect Claude Desktop via MCP" instead of failing.

## Build order (priorities)

| P | Work | Done when |
|---|---|---|
| P0 | Repo skeleton, MIT `LICENSE`, README stub, `.gitignore` (node_modules, .env, dist, .agents, skill folders) | `npm run dev` serves a blank page |
| P1 | Convert, load and validate | Counts reconcile (450 = 104 + 346); every link resolves; no event after Day 1 11:30 |
| P2 | State plus the four alert rules, written test-first | Each alert returns the right evidence and IDs (tests green) |
| P3 | Simple handoff estimate | Remaining steps × configured durations within working windows; queues listed as "not modelled"; explicit unknowns |
| P4 | Dashboard: header, stage lanes, attention queue, case drawer | Usable and live via SSE |
| P5 | Basket-failure trigger | One click appends one event, flags 20 slides / 10 cases, recomputes estimates; a second click does nothing |
| P6 | MCP server, then optional in-app chat | Claude Desktop can answer "Where is 26H1003?" from the tools |
| P7 | **Story mode** (see below), polish, README with screenshots | Story mode plays end to end on live state; backup video recorded |

The equipment/station view is **optional** (do it only if P0–P7 are done).

## Safety and scope (non-negotiable)

- **Histopathology preparation only.** Cervical examples are cervical *biopsies* processed through histology, not cervical liquid-based cytology or HPV testing. Do not add LLETZ, patient recall, diagnosis, reporting, patient management or full screening-deadline prediction.

- Never diagnose, interpret tissue, report cases, decide patient management or judge clinical adequacy.
- Predict **lab preparation and handoff to the pathologist only**. Never predict reporting time or screening-programme deadlines.
- Never invent events, times, protocols, sample attributes or causes of delay. If something is missing or contradictory, say "not enough information".
- A missing scan record never proves a slide is misplaced. Wording: "missing scan event; check the slide location or scan record."
- Decalcification is a normal stage. Never flag it by duration alone, and never give it an estimate unless a duration is configured.
- Urgency comes only from the recorded priority (26H2345 is urgent, with no fault injected).
- **MCP tools are read-only.** Only the dashboard's demo controls (a person pressing "Replay H&E incident" or "Acknowledge") may append the staged incident events. MCP may not replay, acknowledge, reset or write anything. No model may create events, clear alerts, change priority, approve recuts or edit protocols or source data.
- Use only fictional IDs and no patient information. Use only the spec's generic equipment labels on screen: Processor A–D, Embedding station 1–2, Microtomy station 1–6, H&E auto-stainer 1 (3 boxes × 3 baskets × 20 slides), Digital scanner 1–2 and IQC workstation 1. Never "Stainer 1" or Scanners 3–4. Normalise inconsistent raw station strings in the loader for display; keep the raw values in data. Fictional staff initials (AA/BB, embedding only) are for traceability and are never ranked.

## Data model

Case → blocks → slides; case/block/slide → timestamped events; basket → slides → cases; rule → alert or estimate component. A case can have blocks at different stages. Whole-case handoff waits for every required block. **The latest recorded event per case is the source of truth** (some cases have no snapshot event). Ignore the free-text "Timing inputs pending" ETA column and compute from the rules instead. Shared clock: Tuesday, Day 1 11:30; Day 0 = Monday; Day -1 = the previous working day. The 22 cases marked as demo cases carry the detailed stories; the 428 background cases give scale only.

## Alert rules (deterministic)

1. **Outstanding block (26H1003):** completed required blocks < expected. A1–E1 are in the large-specimen processor (output expected 12:00–13:00); F1 is still at cut-up. No reliable whole-case estimate while F1 is outstanding.
2. **Protocol mismatch (26H1004):** levels recorded (1) < levels required (3). Request staff review; never auto-advance.
3. **Failed basket (H&E-BASKET-01):** the recorded incident (EV-01215 fault 10:45 → EV-01255 acknowledged 10:47 → EV-01254 basket reloaded 11:04 → EV-01256 repeat H&E run started 11:05) is held back on start and on reset, and replayed from the dashboard ("Replay H&E incident", then the presenter's "Acknowledge"). It affects exactly 20 slides across 26H1005–26H1014. Add the **30-minute** repeat run from 11:05 to the affected estimates. The alert stays open at 11:30 (no completion event exists). Do not assume recuts. Event IDs are not chronological: always sort by parsed simulated time.
4. **Scan gap (26H1015):** scan expected Monday 15:30, no scan-complete event, while later comparator cases have one.

## Handoff estimate

Estimate = now + remaining required steps × configured durations, moved into working windows (staffed 07:00–17:00; processors run overnight with the stated output times). Show the parts of the calculation, and show active minutes separately from wall-clock time. Label queues and parallel capacity "not modelled". **Delay** is claimed only against a configured target in `config/targets.json` (illustrative values set by Victoria). If no target is configured, return the holds and say "target comparison unavailable".

## MCP tools

- `get_case(case_id)`: stage, cohort, priority, programme tag, block/slide/level state, timeline, alerts, and the estimate or the reason it is unavailable.
- `list_alerts(filters?)`: alerts with evidence, affected entities, event time and the suggested staff check.
- `cases_delayed(filters?)`: holds and cases past a configured target; otherwise "target comparison unavailable".

Answer pattern: direct answer → case IDs and recorded stage → evidence → estimate with assumptions, or "unknown" → the staff check. Plain language, never a clinical recommendation.

## Design system

Per the spec (§4 Screen A) and playbook 07 decision 1:

- **Theme:** deep navy background, high-contrast white text, a restrained green accent; purple for BCSP tags and green for cervical-screening tags. Set through CSS variables only.
- **No red/amber/green severity ranking.** Every open alert uses one uniform `!` marker. States: New (gentle bounce) → Acknowledged (no bounce, card stays) → In progress (shows the recorded staff action) → Resolved (only on a recorded completion/check event). No sound, no blocking modal; a static equivalent under reduced motion.
- **Branding:** wordmark `MERIDIAN` (light green to white) with the sub-label `CellPath lab workflow assistant`. The `SIMULATED` badge is always visible.
- **Fonts:** Inter for UI text, a monospaced font for case IDs and times.
- **Layout:** top bar (clock, case search, tabs Overview · Lab flow · Screening · Diagnostic cytopathology · Archive); headline counts; stage strip; attention area; the lab-flow map is the hero; the case drawer slides in; a deterministic Meridian chat panel. Every alert card shows **what, evidence, why it is flagged, and the suggested check**.
- **Motion:** calm and event-driven only, each animation ≤900 ms; `VITE_FX=off` and `prefers-reduced-motion` fallbacks.
- Must work on a 1440×900 projector; base text 16px, secondary text at least 14px.

## Story mode (P7, only after P5 works)

A "Story mode" button plays the pitch arc **on the live app, driven by real state, never a recorded video**. Use Motion (the `motion` package, formerly Framer Motion).

1. **Lab wakes up:** case dots flow into the stage lanes and counts tick up to the real totals.
2. **Zoom to 26H1003:** A1–E1 shown in the processor (teal), F1 pulsing at cut-up (amber); caption "No whole-case handoff time yet: F1 outstanding."
3. **Incident replay:** calls the real `POST /api/sim/replay-incident`; the basket's 20 slides and 10 cases are flagged, the presenter clicks Acknowledge, and the reload and repeat-run events follow; estimates update.
4. **Hand-off:** a caption invites the agent question (asked live in Claude Desktop via MCP).
5. **End on the normal, fully clickable dashboard.**

Rules:
- Each animation is no longer than about 900 ms.
- Respect `prefers-reduced-motion` and provide a "skip animations" toggle.
- Advance with the arrow keys or a click, so the presenter controls the pace.
- Story mode never fakes numbers; it only reads the API.
- A "Reset demo" control restarts the server state (undoes the trigger) for rehearsals.

## Core vs external (add-ons)

- **Core** is our code: `server/`, `mcp/`, `web/`, `shared/`, `scripts/`, `data/`, `config/`, `docs/`.
- **`external/`** holds third-party repos cloned for reference only (see `external/README.md` and `REGISTRY.md`). You may *read* them for patterns. **Never import from or copy code out of `external/`.** Adopt libraries as npm dependencies, mark them `adopted` in `external/REGISTRY.md`, and credit them in the README.
- **`context/`** is private background; read it, never publish it.

## Engineering rules

- Read before editing. Make small changes. Run `npm test` after every data or rule change.
- Write the acceptance tests first (TDD), then make them pass.
- No new infrastructure (no database or Docker). In-memory state, reset on restart.
- Commit after each priority with a clear message. Never commit secrets.
- Keep the repository history inside the hackathon window, and never import older code.

## Required tests

- 450 cases = 104 backlog + 346 current-day; stage buckets: Received/booked 72 · Waiting for dissection/cut-up 3 · Awaiting processor or processing 151 · Decalcification 20 · Embedding 29 · Microtomy 139 · H&E staining 15 · Scanning 8 · IQC 5 · Ready for pathologist handoff 8.
- 712 blocks, 426 slides, 1,253 events; unique IDs; all case/block/slide/event links resolve.
- Event order is valid (`scripts/check_event_order.py` all zeros), sorted by parsed time, and nothing is after Day 1 11:30.
- Staff initials appear only as AA/BB, on embedding events.
- Equipment set is exactly: Processor A–D, Embedding station 1–2, Microtomy station 1–6, H&E auto-stainer 1, Digital scanner 1–2, IQC workstation 1.
- Each of the four alerts returns the expected IDs and evidence.
- The incident replay appends exactly the four recorded events in time order, once (409 after); it flags exactly 20 slides and 10 cases; acknowledge only stops the motion and never resolves; reset restores the staged state; MCP can do none of these.
- Affected estimates include the 30-minute repeat run from 11:05.
- 26H1003 is not ready while F1 is outstanding.
- 26H1004 shows 1 of 3 levels.
- 26H1015 is described only as a missing scan event.
- 26H1016 has no invented estimate.
- 26H2345 stays urgent with no invented fault (ready for handoff at 09:30).
- 26H1018 is ready for pathologist handoff.
- Chat answers the six spec questions with exact IDs from the same server functions as the UI, and handles an unknown question honestly.
- No output claims a diagnosis, a reporting time or a screening deadline.
- Missing data returns explicit uncertainty.

## Approved wording

"Meridian is designed to sit alongside a LIMS. The agent reads case events from the lab's workflow systems. We're simulating those feeds in this demo; a live version would connect through the interfaces available at each lab." Never claim that LIMS in general cannot do this.
