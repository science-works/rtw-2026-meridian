# MASTER_PLAN.md: Meridian, built to score 30/30

**Every agent and every human reads this before taking a task.** It ties each task to how the project is judged, splits the work so several agents can run in parallel without colliding, and says exactly what "done" means.

Order of authority:
1. Safety and scope rules in `CLAUDE.md`.
2. `docs/PRD.md` (problem, users, flows, functional requirements).
3. `docs/CELLPATH_MASTER_PRODUCT_VISUAL_SPEC.md`, when present (screens, interactions, timelines).
4. **This file** (tasks, contracts, timeline, judging).
5. `docs/playbooks/*` (how; start at `docs/playbooks/00_INDEX.md`).
6. `context/05_DECISION_LOG.md`.
7. Everything else.

Related: `docs/DATA_PROVENANCE.md` (how the synthetic dataset was made and why it is credible), `docs/EVENT_MODEL.md` (open event model), `docs/MCP_SETUP.md`.

---

## 0. The north star

> **Meridian is an open, AI-ready layer that sits alongside a histology lab's LIMS. It shows every case, block and station live, flags problems the moment they happen, and lets any AI agent query the lab, while the AI only reads and explains and scientists decide.**

- Team: **Block Party**. Victoria (histology lab lead: domain, narration, Q&A) and Manthan (build).
- Tagline: *"Every case, every station, mapped live."*
- Hard deadline: **submit the repo URL + commit hash by Sunday 10:00.** Pitches 10:15–12:15. The venue closes Saturday 20:00.
- **Pitch quality decides more than build size.** A small tool that clearly works and is clearly explained beats a big one that half works.

---

## 1. How we are judged: 10 + 10 + 10 points

Every task below names the criterion it serves. If a task serves none, don't do it.

### 1.1 Impact (10): "How useful is the tool to the scientific community? Does it solve a real pain point?"

| Judges need to see | Our evidence | Delivered by |
|---|---|---|
| A real pain point, from a real person | Victoria: "finding what's holding a case means checking several screens, asking each bench, walking the lab; errors are often found down the line" | F2 (opening) |
| It matches the brief | "Sample tracking and LIMS" is on the organisers' own tool list; we hit **closed data** and **no end points for agentic control** | F2, F3 |
| Useful beyond one lab | An open repo plus an MCP endpoint that any lab's agent can use; the same layer fits 24-hour labs (shift handover) | C1–C3, F3 (vision slide) |
| Quality and safety value | Errors caught at the bench, not at final QC; traceability on existing sign-offs | A3 alerts, F3 |
| Scale | 450 cases, 712 blocks, 1,230 events: a realistic day, not a toy | A1, D2 |

### 1.2 Technical execution (10): "Is the tool working and usable? Does it solve the problem it claims to solve?"

| Judges need to see | Our evidence | Delivered by |
|---|---|---|
| It works live | The basket-failure trigger: one click, 20 slides and 10 cases flagged, estimates recalculated, everything consistent | B3, D4 |
| It's real AI agency, not a chatbot skin | Claude Desktop calling our **MCP tools** against live state; it sees the failure instantly | C1–C3 |
| It does what it claims | **Green test run** for all acceptance tests, shown on a slide or in the README | A4, G1 |
| Trustworthy engineering | Deterministic rules; the AI is read-only; explicit "unknown" instead of invented numbers | A3, A5, C2 |
| Usable | Every alert says what, evidence, why and the suggested check; one click to the case | D3, D5 |
| Open and reproducible | Public repo, MIT LICENSE, `npm install && npm run dev` works first time, README with setup | H1–H3 |

### 1.3 Presentation (10): "Can non-experts understand the problem, its importance and the solution?"

| Judges need to see | Our evidence | Delivered by |
|---|---|---|
| Teach the room: what the software is for | "A LIMS is the lab's digital system for registering samples and recording their progress." | F2 |
| What wasn't working | Victoria's lived example, plus "no AI tool can ask it anything" | F2 |
| What we made better | One live view, instant alerts, handoff estimates, an open AI endpoint | F1 script |
| Plain metaphors | "A flight tracker for tissue." "The AI is a commentator, not a player." | F1, D2 |
| A memorable moment | The live failure ripple (Story mode) | E1, B3 |
| Calm under questions | Prepared Q&A (§9), with Victoria answering from experience | F4 |

### 1.4 Score-killers (avoid at all costs)

- A demo that crashes or shows wrong numbers. → Record the backup video (G3) and use "Reset demo" (B4).
- Claiming more than is built (diagnosis, real LIMS connection, trends, production-ready). → Use the approved wording only (§8).
- Jargon nobody explains (H&E, levels, IQC, MCP). → Explain each term once, in plain words.
- Running over 3 minutes. → Rehearse with a timer (G4).
- Agents overwriting each other's files. → Follow the folder ownership in §3.

---

## 2. Architecture in one picture

```
data/CellPath_Mock_Data.xlsx ──convert──▶ data/cellpath.json
                                              │
                                   server/ (Hono, :8787)
                    load → validate → state → rules → estimates
                    REST + SSE  ◀── POST /api/sim/basket-failure (only mutation)
                         │                         │
                web/ (Vite+React, :5173)     mcp/ (stdio MCP server)
             dashboard · drawer · story       get_case · list_alerts · cases_delayed
                                                   │
                                          Claude Desktop (the agent demo)
```

**One source of truth:** only `server/` holds state. `web/` and `mcp/` call its HTTP API, so the dashboard and the agent can never disagree.

---

## 3. Parallel work: folder ownership

Each workstream owns its folders. **An agent never edits files outside its folders.** Shared types change only through task T0.

| Workstream | Owns | Criterion it serves |
|---|---|---|
| **T0 Contract** (do first, ~20 min) | `shared/` (types and API contract), root `package.json` | Everything |
| **A Data and rules** | `scripts/`, `server/src/domain/`, `tests/domain/` | Technical, Impact |
| **B Server and simulator** | `server/src/` except `domain/`, `tests/api/` | Technical |
| **C MCP agent** | `mcp/`, `tests/mcp/` | Technical, Impact (brief fit) |
| **D Dashboard UI** | `web/src/` except `story/` | Presentation, Technical |
| **E Story mode** | `web/src/story/` | Presentation |
| **F Pitch** (humans, plus an agent for drafts) | `pitch/` | Presentation, Impact |
| **G Validation and QA** | `tests/e2e/`, `docs/QA.md` | Technical |
| **H Repo and submission** | `README.md`, `LICENSE`, `.gitignore`, `docs/` (except specs) | Technical |
| **V Victoria (domain)** | `config/targets.json`, review comments in `pitch/` | Impact, Presentation |

**Coordination protocol**
1. T0 lands on `main` first. After that, A, B, C and D can run in parallel against the contract, with mocks where needed.
2. Each agent works on its own branch (`ws-a-rules`, `ws-c-mcp`…) and merges into `main` once its tests pass.
3. Each agent appends a status line to `STATUS.md` when it starts, gets blocked or finishes a task: `[time] [workstream] [task] started|blocked:<why>|done`.
4. If a contract change is needed, stop and post in `STATUS.md`. Only the T0 owner edits `shared/`.
5. Commit small and often, from Manthan's account. No secrets; `.env` is gitignored.
6. A single agent doing everything follows the same order: T0 → A → B → D → C → E, with F/G/H in between.

---

## 4. T0: the shared contract (do this first)

`shared/types.ts` (sketch; the agent may refine names but must keep the meaning):

```ts
export type Stage =
  | "Received/booked" | "Waiting for dissection/cut-up" | "Awaiting processor or processing"
  | "Decalcification" | "Embedding" | "Microtomy" | "H&E staining"
  | "Scanning" | "IQC" | "Ready for pathologist handoff";

export interface CaseSummary {
  caseId: string; cohort: "Previous-day backlog" | "Current-day workload";
  specimen: string; priority: string; programmeTag: string | null;
  stage: Stage; stageEnteredAt: string; isDemo: boolean; alertIds: string[];
  estimate: Estimate;
}
export interface Estimate {
  status: "estimated" | "unknown" | "ready";
  readyAt?: string;            // simulated clock, e.g. "Day 1 13:42"
  activeMinutes?: number;      // hands-on time
  components: { step: string; minutes?: number; note?: string; ruleId?: string }[];
  assumptions: string[];       // e.g. "queues not modelled"
  reasonUnknown?: string;      // e.g. "F1 still at cut-up"
  target?: { label: string; dueAt: string; late: boolean } | "target comparison unavailable";
}
export interface Alert {
  id: string; kind: "outstanding_block" | "protocol_mismatch" | "basket_failure" | "scan_gap";
  severity: "high" | "medium"; raisedAt: string; caseIds: string[]; slideIds?: string[];
  what: string; evidence: { eventId?: string; text: string }[]; why: string; suggestedCheck: string;
}
export interface CaseDetail extends CaseSummary {
  blocks: { blockId: string; stage: Stage; levelsRequired?: number; levelsRecorded?: number }[];
  slides: { slideId: string; blockId: string; level?: string; basket?: string }[];
  timeline: { eventId: string; at: string; type: string; stage: Stage; blockId?: string }[];
}
export interface Overview {
  clock: string; total: number; backlog: number; today: number; ready: number;
  stages: { stage: Stage; backlog: number; today: number; total: number }[];
  triggerFired: boolean;
}
```

API (all JSON, served by `server/` on :8787):

| Method and path | Returns |
|---|---|
| `GET /api/overview` | `Overview` |
| `GET /api/cases?stage=&priority=&programme=&demo=` | `CaseSummary[]` |
| `GET /api/cases/:id` | `CaseDetail`, or 404 `{error}` |
| `GET /api/alerts` | `Alert[]` |
| `GET /api/delayed?programme=` | `{ cases: CaseSummary[], note?: string }` |
| `GET /api/stream` | SSE `state-changed` events (`{version}`) |
| `POST /api/sim/basket-failure` | `{ fired: true, affectedCases: 10, affectedSlides: 20 }`, or 409 if already fired |
| `POST /api/sim/reset` | Restores the initial state (for rehearsals) |

Done when the types compile, the server stub returns fixture JSON for every route, and the contract is committed to `main`.

---

## 5. Task cards

Format: **ID: title.** Deps, time box, criterion. Done-when.

### A: Data and rules (owner: Agent A; use `/tdd`)
- **A1: Convert the workbook.** Deps T0. 30 min. Technical.
  - `scripts/convert.ts` turns the xlsx into `data/cellpath.json`, skipping blank rows.
  - Done when the JSON has 450 cases, 712 blocks, 423 slides and 1,230 events.
- **A2: Validator.** Deps A1. 30 min. Technical.
  - Checks: links resolve; nothing after Day 1 11:30; event order valid; exactly one pending event (EV-01215).
  - Done when the tests are green.
- **A3: Four alert rules.** Deps A2. 60 min. Technical, Impact.
  - Rules: outstanding block (26H1003), protocol mismatch (26H1004), basket failure (inactive until triggered; then 20 slides, 10 cases), scan gap (26H1015).
  - Wording per CLAUDE.md. Each alert has what, evidence, why and the suggested check.
  - Done when the tests are green.
- **A4: Acceptance test suite.** Parallel with A3. 30 min. Technical.
  - All 13 tests in CLAUDE.md.
  - Done when `npm test` shows them all, then all green.
- **A5: Estimate engine.** Deps A3. 60 min. Technical.
  - Remaining steps × configured durations, within working windows; components listed; "queues not modelled".
  - Unknown for 26H1003 (F1) and 26H1016 (decalcification). Ready for 26H1018.
  - Target comparison only if `config/targets.json` has values.
  - Done when the tests are green.

### B: Server and simulator (owner: Agent B)
- **B1: Load into memory and serve the API.** Deps T0 and A2 (use a fixture until A is ready). 45 min. Technical.
  - Done when every route returns real data.
- **B2: SSE stream.** Deps B1. 20 min. Technical.
  - Done when any state change emits `state-changed`.
- **B3: Basket-failure trigger.** Deps A3, B1. 30 min. Technical, Presentation.
  - Appends EV-01215 once, recomputes, emits SSE; a second call returns 409.
  - Done when a test passes.
- **B4: Reset.** Deps B3. 10 min. Presentation (rehearsals).
  - Done when, after reset, the trigger works again.

### C: MCP agent (owner: Agent C)
- **C1: MCP server skeleton.** Deps T0. 30 min. Technical, Impact.
  - `mcp/` uses the official SDK over stdio; name `meridian`.
  - Done when it lists 3 tools.
- **C2: Three read-only tools.** Deps B1. 45 min. Technical.
  - `get_case`, `list_alerts`, `cases_delayed`, each calling the HTTP API.
  - Tool descriptions state that the tools are read-only, non-diagnostic, and predict handoff only.
  - Done when tool calls return live data.
- **C3: Claude Desktop hookup and script.** Deps C2. 20 min. Presentation.
  - Write `docs/MCP_SETUP.md` with the config snippet (an absolute path to `npm run mcp`).
  - Test these questions:
    1. "Where is 26H1003?"
    2. "What happened to the stainer basket?" (after the trigger)
    3. "I'm starting the next shift. What do I need to know?"
    4. "Which screening cases may be delayed?"
  - Done when all four are answered from the tools, with no invented facts.
- **C4 (optional): In-app chat.** Deps C2 and an API key. Only if time allows.

### D: Dashboard UI (owner: Agent D; use the design skill)
- **D1: App shell and tokens.** Deps T0. 30 min. Presentation.
  - Palette and fonts from CLAUDE.md; header with the clock, a "SIMULATED DATA" badge and 4 stat tiles.
- **D2: The "lab river" pipeline.** Deps D1, B1. 60 min. Presentation, Impact.
  - 10 stage lanes with backlog and today counts; click to filter.
  - Use the "flight tracker for tissue" look; counts must reconcile to 450.
- **D3: Attention queue.** Deps B1. 40 min. Technical, Presentation.
  - Alert cards showing what, evidence, why and the check; click opens the case.
- **D4: Live update and trigger button.** Deps B2, B3. 30 min. Technical, Presentation.
  - The button calls the simulator; the UI updates over SSE; affected cards pulse crimson once.
- **D5: Case drawer.** Deps B1. 60 min. Technical, Presentation.
  - A journey bar across the stages; blocks shown separately (A1–E1 vs F1); levels 1/3.
  - The estimate with its components, assumptions, and "unknown" plus the reason.
- **D6: Projector check.** Deps D1–D5. 15 min. Presentation.
  - Readable at 1440×900, base text 16px or larger, no clipped text.

**Open-source stack:** see `docs/STACK_REPOS.md` for the ranked repos (MCP SDK + Inspector, Hono, Vitest, Motion, Magic UI, shadcn, NumberFlow, React Flow) and what to avoid.

**Visual layer:** see `docs/VISUAL_LAYER.md` for the approved open-source toolkit (Motion, Magic UI, NumberFlow, shadcn/ui) and tasks VX0–VX7, which extend D and E without touching the backend.

### E: Story mode (owner: Agent E; only after D4 works)
- **E1: Story mode.** Five steps, per CLAUDE.md. Arrow keys to advance; uses only the real API (including the trigger and reset); each animation ≤ 900 ms; a "skip animations" toggle.
  - Done when it runs end to end three times in a row without a refresh.

### F: Pitch (owners: Manthan and Victoria; an agent may draft)
- **F1: 3-minute script** (`pitch/SCRIPT.md`), following the beats in §7.
- **F2: Teach-the-room opening** (Victoria, 25 seconds), from her own experience.
- **F3: Slides** (`pitch/`), at most 5:
  1. Title (Block Party · Meridian);
  2. Problem (teach the room);
  3. Live demo (switch to the app);
  4. How it works (one architecture diagram: rules decide, the AI explains, scientists act);
  5. Vision: Live → Shift → Lab-wide, plus next steps.
  - Use the event palette. A green test-run screenshot goes on slide 4 or in the README.
- **F4: Q&A card** (`pitch/QA.md`), from §9. Victoria owns the domain answers.

### G: Validation and QA (owner: Agent G or Manthan)
- **G1: Full test run.** `npm test` all green; screenshot it.
- **G2: Clean-clone check.** On a fresh clone, `npm install && npm run dev` works by following the README alone.
- **G3: Backup demo video.** A 3-minute screen recording of the full demo. **Record it before 20:00 Saturday**, then again once the build is final.
- **G4: Timed rehearsals.** Two before leaving the venue, two at home, one on Sunday morning. Each must be ≤ 3:00.

### H: Repo and submission (owner: Manthan)
- **H1: New public repo `meridian-lab`.** MIT LICENSE in the root; `.gitignore` covers `context/`, `.env`, `node_modules` and skill folders.
- **H2: README.** What it is (one paragraph), a screenshot, the architecture, setup, MCP setup, test results, "Simulated data: not connected to a real lab", "Built with" (including credit for the skills), and the licence.
- **H3: Submission.** By **09:45 Sunday**, submit the repo URL plus the final commit hash. Check that `git status` is clean and no secrets were committed.
- **H4: Ask the organisers** today whether preparing the mock data and plan before the event is allowed.

### V: Victoria (domain)
- **V1:** Fill in `config/targets.json` (illustrative handoff hours for urgent, screening and routine).
- **V2:** Confirm the generic equipment labels and the stage names in the UI.
- **V3:** Review every alert's wording ("what / why / suggested check").
- **V4:** Write the opening (F2) and own the domain answers in Q&A (F4).

---

## 6. Timeline (it's 17:15 on Saturday)

| Window | Goal | Tasks |
|---|---|---|
| 17:15–17:45 | Repo up, contract in place | H1, T0, H4, V1 started |
| 17:45–19:15 | The core works end to end | A1–A3, B1–B3, D1–D3, C1 in parallel |
| 19:15–19:45 | The demo path works | D4, C2, A4 green |
| 19:45–20:00 | **Safety net** | G3 backup video, G4 rehearsal #1, push |
| Evening (home) | Depth and polish | A5, D5, C3, E1, F1–F4, G1–G2, rehearsals #2–3 |
| Sunday 09:00–09:45 | Freeze | Final test run, final video, H3 submit, rehearsal #4 |

**If you're behind, cut in this order:** C4 in-app chat → E1 Story mode → the equipment view → detail in A5 (keep the "unknown" cases right). **Never cut:** B3 trigger, A3 alerts, C2 MCP tools, G3 backup video.

---

## 7. The 3-minute demo, beat by beat

| Time | Who | Beat | Criterion |
|---|---|---|---|
| 0:00–0:25 | Victoria | Teach the room: what a LIMS is for; what isn't working (from her experience) | Presentation, Impact |
| 0:25–0:50 | Manthan | Meridian: the whole lab at a glance (450 cases); open 26H1003, A1–E1 in the processor, F1 still at cut-up, so "no handoff time yet" | Technical |
| 0:50–1:40 | Both | **Live moment:** trigger the stainer failure; 20 slides and 10 cases flagged; new handoff times | Technical, Presentation |
| 1:40–2:20 | Manthan | Claude Desktop through MCP: "I'm starting the next shift. What do I need to know?" | Technical, Impact |
| 2:20–2:40 | Victoria | Trust: rules decide, the AI only reads and explains, scientists act; it runs on the lab's own network | Impact |
| 2:40–3:00 | Victoria | Vision: Live → Shift → Lab-wide, built on the sign-offs labs already record | Impact |

---

## 8. Approved wording (use exactly; never overclaim)

- "Meridian is designed to sit alongside a LIMS. We're simulating the lab's feeds in this demo; a live version would connect through the interfaces available at each lab."
- "It predicts when a case should be ready for the pathologist. It never diagnoses, reports or predicts screening deadlines."
- "The AI is a commentator, not a player. It can explain anything and change nothing."
- "Synthetic data, built from real lab timings."
- Never say: production-ready, connected to a real lab, diagnoses, predicts deadlines, or "LIMS can't do this".

---

## 9. Judges and the Q&A card

| Judge | Likely question | Answer (owner) |
|---|---|---|
| Alexander Hasson (Apheris) | "How would real patient data be protected?" | Runs on the lab's own network; read-only; a live version needs lab-approved interfaces, access control, IG review and audit. (Manthan) |
| Maxim Tsenkov (PDBe) | "How does it connect to different labs' systems?" | An open event model plus MCP tools; real connections go through each lab's existing interfaces. (Manthan) |
| Cyril Schröder (Ellison Institute) | "What's the real-world impact?" | Errors caught at the bench, not at final QC; shift handovers; equipment trends. (Victoria) |
| Austin Mroz (CuspAI) | "What does the AI actually do?" | Code computes every number; the agent calls tools and explains with evidence; it can't change data. (Manthan) |
| Ed Hughes (Inherent) | "Does it solve what it claims?" | Show the green tests and the trigger working. (Manthan) |
| Joanne Sheppard (UCL) | "Who would use this day to day?" | Lab scientists, shift leads and quality leads. (Victoria) |
| Anyone | "Is this monitoring staff?" | Every histology step is already signed by the scientist who did it; we use that for training, not blame. (Victoria) |
| Anyone | "Why not just build it into the LIMS?" | Closed vendors are slow and don't open up to agents; an open layer works with any LIMS. (Manthan) |
| Anyone | "Is this real data?" | No, it's synthetic, built from real lab timings. (Victoria) |

---

## 10. Final scoring self-check (run before submitting)

Score each line 0–2 honestly. Aim for 18 or more out of 20. Fix the lowest line first.

- **Impact:** (1) the pain point comes from a real person; (2) the fit with the brief is stated in words; (3) usefulness beyond one lab is clear; (4) the vision is clearly marked as future work.
- **Technical:** (5) the trigger works three times in a row after a reset; (6) MCP answers four questions from live data; (7) the tests are green and the screenshot is ready; (8) a clean clone runs from the README; (9) no invented numbers anywhere ("unknown" shows correctly).
- **Presentation:** (10) a non-expert friend can explain Meridian back to you after a single run-through.
