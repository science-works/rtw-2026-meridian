# PRD: Meridian (v1.0, hackathon build)

| | |
|---|---|
| **Product** | Meridian, *"Every case, every station, mapped live."* |
| **Team** | Block Party: Victoria (histology lab lead; domain owner) and Manthan (build owner) |
| **Event** | Science Works *Reinvent the Wheel*, London, 16–18 October 2026 |
| **Deadline** | Submit the repo URL + commit hash by Sunday 10:00; 3-minute pitch + 2 minutes of judge questions from 10:15 |
| **Authority** | `CLAUDE.md` (safety, stack) > this PRD (what and why) > `docs/MASTER_PLAN.md` (tasks, timeline) > `docs/playbooks/*` (how) > everything else |

---

## 1. Problem

**The tool being reinvented is sample tracking and the LIMS.** It's on the organisers' own list of tools to reinvent, in the category "Lab instruments, samples and records".

A histology case passes through up to 10 stations:
receipt → cut-up → (decalcification) → overnight processing → embedding → microtomy (levels) → H&E staining → scanning → IQC → handoff to the pathologist.

Each case contains several blocks, and each block several slides.

| # | Pain (Victoria's lived experience) | Consequence |
|---|---|---|
| P1 | The LIMS **records** events but gives **no live view** of what's holding a case | Staff check several screens, ask each bench and walk the lab; whiteboards, spreadsheets and paper fill the gaps |
| P2 | **Errors are found down the line** (a missing block, missing levels, a failed stain run, a missing scan) | Every downstream step is wasted work and risk; the error is caught at final QC instead of at the bench |
| P3 | **One equipment failure silently delays many cases** (a 20-slide basket affects 10 patients) | Nobody sees the knock-on effect on handoff times |
| P4 | **Handover between shifts** depends on memory and notes | Open problems get lost between teams |
| P5 | **The data is closed to AI:** no endpoint an agent can query | Scientists can't simply ask "what's at risk today?" |

Capabilities vary between LIMS products. Always frame these points as Victoria's experience, never as "LIMS can't do X".

## 2. Solution

**Meridian is an open, AI-ready layer that sits alongside the LIMS.** It reads workflow events and gives:

1. **A live lab map:** every case, block and station at once ("a flight tracker for tissue"). → P1
2. **Instant, evidence-backed alerts**, flagged the moment the data shows them, each with what, evidence, why it is flagged, and the suggested staff check. → P2, P3
3. **Honest handoff estimates:** when each case should be ready for the pathologist, with the reasons, or "unknown" when the data can't support one. → P3
4. **An open MCP endpoint plus an agentic shift-handover workflow:** any AI agent can query the lab, read-only. → P4, P5
5. **An open event model plus a FeedAdapter**, so any lab can map its own LIMS export to Meridian. → the "closed data" problem

## 3. Brief fit (say these words on stage)

| Brief | Meridian |
|---|---|
| "Use agentic AI to improve scientific software" | An agent investigates across tools (the `shift_handover` prompt); deterministic code computes everything |
| Difficult interfaces | One live map replaces several screens and walking the lab |
| Disconnected tools or closed data | Open event model (`docs/EVENT_MODEL.md`), `GET /api/events`, `FeedAdapter` |
| No end points for agentic control | MCP server `meridian` with read-only tools and prompts |
| Installation or maintenance | `npm install && npm run dev`, plus a documented MCP setup |
| Teach the room: 01 / 02 / 03 | §1 table (01–02) and §2 list (03); Victoria delivers 01–02 |

## 4. Users and jobs to be done

| User | Job | Primary flow |
|---|---|---|
| Bench scientist | "What needs me now, and why?" | F1, F2 |
| Shift lead | "What does the next team need to know?" | F4 |
| Lab lead / quality lead | "Where is the pressure, and what's failing?" | F3 now; F5 is vision |
| Any AI agent | "Answer lab questions from live, sourced data" | F4 via MCP |

## 5. User flows

- **F1, Morning glance:** open the dashboard → header (clock, SIMULATED DATA badge, 450 / 104 / 346 / ready) → lab map lanes → the attention queue with 4 alerts.
- **F2, Investigate:** click an alert → case drawer → journey bar (where it's been, where it is, what's next) → blocks and levels (e.g. A1–E1 vs F1; levels 1/3) → the estimate with its components, or "unknown" plus the reason → the suggested staff check.
- **F3, Live failure:** click "Trigger stainer failure" (the demo control) → the server appends EV-01215 → SSE → a crimson ripple from Stainer 1 to its 20 slides and 10 cases → their estimates roll forward 60 minutes → a new alert at the top. "Reset demo" restores the start state.
- **F4, Agentic shift handover:** in Claude Desktop (or the MCP Inspector), the `shift_handover` prompt → the agent calls `list_alerts` → `get_case` (for each affected case) → `cases_delayed` → a sourced brief (open alerts with evidence IDs, cases at risk, unknowns, staff checks). The tool calls are visible on screen.
- **F5 (vision only):** shift handover across 24-hour labs; lab-wide trends (staffing, training, equipment); station sign-in and digital sign-off; live mismatch checks.

## 6. Functional requirements

| ID | Requirement | Acceptance |
|---|---|---|
| FR-1 | Load the workbook → normalised JSON; validate links, ordering and the clock | 450 = 104 + 346; 712 blocks; 423 slides; 1,230 events; nothing after Day 1 11:30; exactly 1 pending event (EV-01215) |
| FR-2 | State: each case's stage comes from its latest recorded event; per-block state | Latest-event stage equals the snapshot stage for all 450 cases |
| FR-3 | Alert: outstanding block | 26H1003: 6 expected / 5 complete; F1 at cut-up; no whole-case ETA |
| FR-4 | Alert: protocol mismatch | 26H1004: 1 of 3 levels recorded; staff review; never auto-advance |
| FR-5 | Alert: basket failure (pending until triggered) | After the trigger: exactly 20 slides and 10 cases (26H1005–26H1014); +60 min to their estimates |
| FR-6 | Alert: scan gap | 26H1015: "missing scan event; check the slide location or scan record"; comparators listed as evidence, not a cause |
| FR-7 | Estimates | Deterministic: stage + remaining steps × configured durations within working windows; components listed; queues "not modelled"; 26H1016 (decalcification) unknown; 26H1018 ready; background cases marked "illustrative, stage-based" |
| FR-8 | Delay | Only against `config/targets.json`; otherwise "target comparison unavailable" |
| FR-9 | API + SSE | Per the MASTER_PLAN §4 contract; SSE `state-changed` on every mutation |
| FR-10 | Simulator | `POST /api/sim/basket-failure` (once; 409 after); `POST /api/sim/reset` |
| FR-11 | MCP tools | `get_case`, `list_alerts`, `cases_delayed`; read-only; they call the API |
| FR-12 | MCP prompt | `shift_handover`: a multi-step, sourced brief |
| FR-13 | Open model | `GET /api/events` (paged); `docs/EVENT_MODEL.md`; `FeedAdapter` interface plus the workbook adapter |
| FR-14 | Dashboard | Header, lab map lanes (click to filter), attention queue, case drawer with journey bar, trigger and reset controls |
| FR-15 | Motion | Lab river, rolling counts, alert stream, failure ripple, spotlight (`docs/VISUAL_LAYER.md`) |
| FR-16 | 3D lab floor (optional) | `docs/playbooks/03_3D_LAB_FLOOR.md`; behind `VITE_3D`, with an automatic 2D fallback |
| FR-17 | Story mode | Plays the pitch arc on live state; arrow keys advance; no faked numbers |

## 7. Non-functional requirements

- **Truthfulness:** every number on screen comes from the server; an overclaim test scans all alert, estimate and tool strings for banned claims.
- **Safety:** read-only AI; the only mutation is the simulator. Fictional IDs only. Generic equipment labels (Processor A–D, Stainer 1, Scanner 1–4). "SIMULATED DATA" always visible.
- **Performance:** first paint under 2 s on the laptop. Trigger to UI update under 1 s. Each 2D animation ≤ 900 ms. 3D at 60 fps target, with 30 fps as the floor, on the presentation laptop.
- **Accessibility and projection:** 1440×900; base text 16px or larger; contrast AA; `prefers-reduced-motion`; `VITE_FX=off` and `VITE_3D=off` fallbacks.
- **Reproducibility:** Node 20+; `npm install && npm run dev`; tests via `npm test`; a README that a stranger can follow.
- **Licensing:** MIT root LICENSE; dependencies only from `docs/STACK_REPOS.md` (plus Tailwind, approved, and the 3D stack in playbook 03); every library credited in the README.

## 8. Out of scope (never build or claim)

- Diagnosis, tissue interpretation, reporting time, patient management, screening-programme deadlines.
- A real LIMS connection or real patient data; "production-ready".
- Staff performance tracking. (Sign-off traceability is vision only, framed as training, not blame.)
- Cytology / HPV / LLETZ / patient recall.

## 9. Success = the judging rubric

| Criterion (10 each) | What must be demonstrably true |
|---|---|
| Impact | Victoria's pain point opens the pitch; brief words spoken; vision slide clearly marked as future; open model shown |
| Technical | F3 works 3 times in a row; F4 shows real tool calls; tests green on screen; clean clone runs; "unknown" shown correctly |
| Presentation | A non-expert can repeat back what Meridian does after one run; at most 3:00; Q&A card ready (MASTER_PLAN §9) |

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The demo crashes on stage | Backup video (recorded before 20:00 Saturday and again after the final build); `Reset demo`; `VITE_FX=off` / `VITE_3D=off` |
| Claude Desktop or MCP fails live | MCP Inspector as backup; a screenshot in the slides |
| The 3D view stutters on the projector | Auto-fallback to 2D; default `VITE_3D=off` unless rehearsed on the venue screen |
| Overclaiming | Approved wording (MASTER_PLAN §8) and the overclaim test |
| Running out of time | Cut order (MASTER_PLAN §6); never cut FR-3–FR-6, FR-10 or FR-11 |
