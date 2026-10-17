# CellPath — Hackathon Build Playbook

**Audience:** Victoria (histology workflow and data owner) and Manthan (software, MCP and agent build). Use CELLPATH_MASTER_PRODUCT_VISUAL_SPEC.md as the authoritative source for scope, visual requirements, interactions and case timelines; this playbook is the concise implementation companion.

**Build status:** Project plan and fictional mock-data workbook are prepared. The prototype should be live and interactive over simulated events. It is not connected to a real laboratory or LIMS.

## 1. CellPath in one minute

**CellPath is an AI layer designed to sit alongside a laboratory information management system (LIMS). It turns lab workflow events into a live view of where each histology case is, what is holding it, and when lab preparation may be complete for pathologist handoff.**

A LIMS is the lab’s digital system for registering samples and recording their progress. CellPath adds a conversational interface, rule-based alerts and explainable handoff estimates. LIMS capabilities differ between sites, so do not claim that every LIMS lacks these features.

CellPath monitors the laboratory preparation workflow. It does not interpret tissue, diagnose, report cases, determine patient management, or predict the full screening-programme deadline.

## 2. Hackathon fit and honest scope

The Science Works “Reinvent the Wheel” brief asks teams to use agentic AI to improve existing scientific software. It calls out difficult interfaces, disconnected or closed data, and missing endpoints for agentic control. Its example categories include sample tracking and LIMS.

- **Existing software improved:** LIMS / laboratory workflow software.
- **Improvement:** an open, agent-usable interface over workflow events; natural-language case queries; traceable alerts; configurable handoff estimates.
- **Demonstration:** fictional workflow feed, deterministic rules and a live UI event that changes affected cases.
- **Not demonstrated:** real LIMS connectivity, production deployment, clinical validation or diagnostic AI.

**Presentation line:** “The agent reads case events from the lab’s existing workflow and information systems. We’re simulating those feeds in this demo; a live version would connect through the interfaces available at each lab.”

## 3. Workflow and shared clock

~~~mermaid
flowchart TD
  A["Receive and register sample"] --> B["Cut-up: tissue placed into labelled cassettes"]
  B --> C["Tissue processing, usually overnight"]
  C --> D["Embedding into wax blocks"]
  D --> E["Microtomy: thin sections placed on slides"]
  E --> F["H&E staining"]
  F --> G["Digital scanning where used"]
  G --> H["IQC: check slide and image quality"]
  H --> I["Lab checks complete; handoff to pathologist"]
~~~

**Shared simulated clock:** Tuesday, Day 1 at 11:30. Day 0 is Monday; Day -1 is the preceding working day.

- Staffed receipt and cut-up window: illustrative 07:00–17:00.
- Cases cut up and loaded before the illustrative 17:00 cutoff usually enter the overnight processor run. Embedding begins the next morning.
- Illustrative processor outputs: Pegasus A / Pegasus 2 about 06:45; Logos 1 about 08:40; Logos Evo about 12:00–13:00.
- Embedding window: about 07:00–11:30. Later large-specimen output may wait for the next available embedding slot.
- Microtomy: block is cut into thin sections and slides; protocols may require multiple levels such as L1–L3.
- H&E stain: illustrative 60 minutes for a 20-slide basket.
- Digital scan: illustrative 2 minutes per slide; scanners may run overnight. Queue and parallel capacity affect wall-clock time.
- IQC and case-level completion follow. The final CellPath state is **ready for pathologist handoff**.

### Dashboard counts at Tuesday 11:30

| Stage | Previous-day backlog | Current-day workload | Total |
|---|---:|---:|---:|
| Received / booked | 0 | 72 | 72 |
| Waiting for dissection / cut-up | 0 | 3 | 3 |
| Awaiting processor / processing | 0 | 152 | 152 |
| Decalcification | 0 | 20 | 20 |
| Embedding | 0 | 29 | 29 |
| Microtomy | 103 | 36 | 139 |
| H&E staining | 0 | 15 | 15 |
| Scanning | 1 | 7 | 8 |
| IQC | 0 | 5 | 5 |
| Ready for pathologist handoff | 0 | 7 | 7 |
| **Total** | **104** | **346** | **450** |

These are fictional demo figures. “Previous-day backlog” means work expected to be completed yesterday; “current-day workload” means cases due through the lab today. The scenario includes 103 older cases waiting at microtomy plus one older scan-gap case.

## 4. The fictional data pack

The workbook **CellPath_Mock_Data.xlsx** contains seven tabs:

| Tab | Use |
|---|---|
| Overview | Clock, stage totals, assumptions and human demo notes. |
| Cases450 | 450 cases with cohort, specimen, priority, screening tag, stage snapshot and demo marker. |
| Blocks | 712 linked tissue blocks; supports partial-case status. |
| Slides | 423 linked slides with block, level and basket. |
| Events | 1,230 timestamped workflow events. |
| Timing Rules | Editable illustrative durations, operating windows and unresolved values. |
| Demo Guide | Human pitch walkthrough. |

There are **22 detailed demo cases**. Background cases provide the 450-case scale and stage distribution; do not claim every background case has a complete event trail or validated ETA. For missing event history or a TBD timing, say “not enough information”.

### Demo case register

| Case ID(s) | Status / role in demo |
|---|---|
| **26H2345** | Urgent GI biopsy; cut-up completed 07:45, waiting for overnight processing. No fault is injected; keep its urgency visible. |
| **26H1001** | BCSP bowel polyp biopsy, embedded and waiting at microtomy. Screening-linked lab handoff only. |
| **26H1002** | Cervical-screening biopsy; three required levels recorded. No claim about the full programme deadline. |
| **26H1003** | Large resection, six blocks expected / five complete. A1–E1 in Logos Evo, output expected 12:00–13:00; F1 still awaits pathologist cut-up. No reliable whole-case ETA while F1 is outstanding. |
| **26H1004** | GI biopsy requires levels L1–L3; only L1 is recorded at microtome station 4. Flag for staff review. |
| **26H1005–26H1014** | Ten cases, two slides each, in PRISMA-BASKET-01: 20 slides total. One failed-stain event is staged as the live trigger. |
| **26H1015** | Scan-ready since Monday 15:30; no scan-complete event by Tuesday 11:30, while later cases have scan records. Flag the missing record; do not assert misplacement. |
| **26H1016** | Bone sample in decalcification after cut-up. Normal long-running step; no fixed ETA. |
| **26H1017** | Two slides scanned; waiting for routine IQC. |
| **26H1018** | IQC passed 10:55; lab preparation completed and ready for pathologist handoff at 11:15. |
| **26H1019** | Representative previous-day carry-over waiting for microtomy. |
| **26H1020, 26H1021** | Large samples awaiting pathologist cut-up before processor loading. |

All case IDs are fictional mock identifiers, not patient accession numbers. The screening mix in the workbook is synthetic and must not be presented as representative of a real lab.

## 5. Four alerts and how they behave

1. **Outstanding block — 26H1003.** Six expected, five complete. Show A1–E1 and F1 separately. The full case cannot be handed off until the required F1 work is complete.
2. **Protocol mismatch — 26H1004.** Three levels required, one recorded. Explain the recorded evidence and request staff review. Do not auto-advance or assume a recut.
3. **Failed H&E basket — 26H1005–26H1014.** Before the demo event, it is pending, not a real failure. A single explicit UI control appends the event. The alert lists exactly 20 linked slides and ten affected cases. Add the 60-minute illustrative repeat run plus any configured queue to affected estimates.
4. **Scan gap — 26H1015.** A scan-expected event exists, no scan-complete event exists, and later comparator cases were scanned. Say “missing scan event; check the slide location or scan record.” Do not assert the cause.

Other examples make the dashboard feel like a working lab: urgent 26H2345, screening-linked 26H1001 / 26H1002, bone decalcification 26H1016, IQC 26H1017, ready handoff 26H1018, backlog 26H1019, and cut-up queue 26H1020 / 26H1021.

## 6. Dashboard design

| Region | What staff see |
|---|---|
| Header | CellPath, simulated clock, visible “SIMULATED DATA”, 450 total, 104 backlog, 346 today, 7 ready for pathology. |
| Workflow lanes | Counts per stage; selecting a lane filters cases. Counts reconcile to 450. |
| Equipment view | Processor, embedding, microtomy, Prisma, scanner, IQC and handoff stations; click/hover lists linked cases/slides and latest event. No claim of live device connection. |
| Attention queue | Four alerts, affected case IDs, evidence, why flagged, suggested staff check and time. |
| Case drawer | Stage timeline, block/slide/level completion, priority and screening tag, hold, known ETA or why unavailable. |
| Chat | “Where is 26H1003?”, “Why is 26H1004 flagged?”, “Which cases are affected by the basket failure?”, “What is holding up urgent cases?” |
| Demo control | One-shot “Trigger Prisma basket failure” button. Keep the mutation out of the AI chat. |

## 7. High-level architecture

~~~mermaid
flowchart TD
  A["Simulated LIMS-style feed: cases, blocks, slides, events, rules"] --> B["Loader and data validation"]
  B --> C["Normalized case and event store"]
  C --> D["Deterministic workflow state and alert rules"]
  C --> E["ETA calculator using editable rules and queues"]
  D --> F["Application API"]
  E --> F
  F --> G["Dashboard: lanes, equipment, alerts and case drawer"]
  D --> H["Read-only MCP tools"]
  E --> H
  H --> I["AI assistant explains tool evidence in chat"]
  I --> G
~~~

### Runtime sequence

1. Load mock workbook or normalized JSON/CSV into the application.
2. Validate identifiers, links, event timestamps and rule values.
3. Derive case and per-block state. A case may have blocks at different stages.
4. Calculate stage counts, alerts and handoff estimates in code.
5. The dashboard and MCP server read the same state.
6. The LLM calls MCP tools and explains returned evidence; it does not calculate from memory.
7. The demo control appends the one basket-failure event. Recompute states, alerts and estimates; update the dashboard and chat.
8. A future live version would require lab-approved interfaces, access control, information-governance review, audit and validation.

## 8. Rules and ETA contract

### Illustrative values in the workbook

| Rule | Starting value | Status |
|---|---:|---|
| Processor loading cutoff | 17:00 | Illustrative; verify. |
| Pegasus A / Pegasus 2 output | ~06:45 | Illustrative output time. |
| Logos 1 output | ~08:40 | Illustrative output time. |
| Logos Evo output | ~12:00–13:00 | Illustrative large-specimen output. |
| Embedding | 07:00–11:30; 2–4 hours | Illustrative workflow window. |
| Microtomy | 4 min/block; +2 min/extra level | Illustrative. |
| Prisma H&E / repeat run | 60 min per 20-slide basket | Illustrative; queue may add time. |
| Digital scan | 2 min/slide; can run overnight | Illustrative; model parallel capacity and queue. |
| IQC review | 1 min/slide | Initial estimate; verify. |
| Case completion / emit | 2 min/case | Illustrative. |
| Physical handoff | 1 min/case | Illustrative. |
| Digital image send | 1 min/case where needed | Illustrative. |
| Two-slide scan + IQC + case complete + physical + digital handoff | About 10 minutes | Excludes queues, rework, and gaps. |
| Decalcification | No fixed duration | Do not invent an ETA. |
| Re-fix, alert thresholds | TBD | Keep configurable; no local SLA claim. |
| Processor capacity | 400 total; unit unresolved | Do not call this 400 cases, cassettes, or positions until confirmed. |

ETA is deterministic: current stage + remaining required work + configured duration + staffing windows + queue / overnight constraints + confirmed rework. For multiple blocks, whole-case readiness waits for the slowest required block, then shared downstream steps. Show active minutes separately from wall-clock time. Explain every component. If a prerequisite or timing is unknown, say there is no reliable whole-case ETA yet.

Screening tags may affect visibility and priority. CellPath estimates lab preparation and handoff only, not pathology reporting or the full screening deadline. A “late” status requires a configured lab handoff target; without one, display observed holds and say the target comparison is unavailable.

## 9. MCP and agent design

Minimum three read-oriented tools for the prototype:

- **get_case(case_id):** stage, cohort, priority, programme tag, block/slide/level state, timeline, alerts, and known ETA or reason it is unavailable.
- **list_alerts(filters):** active alerts with evidence, affected cases/entities, timestamp and suggested staff check.
- **cases_delayed(filters):** cases with recorded workflow holds or estimates beyond a configured lab expectation. If no target is configured, do not claim a deadline breach; return blockers and say target comparison is unavailable.

Optional if time permits: stage counts, equipment queue, and rule lookup.

**Write boundary:** MCP is read-only. The explicit dashboard demo control is the sole simulated mutation. The AI cannot create events, clear alerts, set priority, approve recuts, or modify protocols.

**Answer pattern:** direct answer → case IDs and latest recorded stage → event/rule evidence → configured ETA and assumptions or explicit unknown → staff check. Keep language simple and never make clinical recommendations.

## 10. Build plan and ownership

| Priority | Work | Done when |
|---|---|---|
| P0 | New public repository and licence | Clean hackathon-time code history; MIT/Apache 2.0 or another permitted licence. |
| P1 | Workbook loader / normalized data | Links validate; clock is Tuesday 11:30; no event is after it. |
| P2 | State and four alert rules | Counts reconcile; each alert returns the right evidence and case IDs. |
| P3 | ETA service | Uses timing rules; shows assumptions and returns unknown when needed. |
| P4 | MCP server | Three read-only tools work against the same state as the UI. |
| P5 | Dashboard + chat | Lanes, equipment, alerts, case details and grounded answers are usable. |
| P6 | Basket trigger | One click adds one event, lists 20 slides / ten cases, updates handoff estimates once. |
| P7 | Pitch | Three-minute demo rehearsed, two-minute Q&A ready, backup recording captured. |

**Victoria:** validate workflow labels, sample logic, protocol example, alert evidence, timing assumptions and boundary language; narrate the science.
**Manthan:** implement new repo, ingestion, deterministic state/rules/ETA, MCP tools, dashboard, chat and demo trigger.
**Together:** run acceptance checks, rehearse and ensure the build claims match the product.

## 11. Acceptance checks

- Stage counts sum to 450: 104 backlog + 346 current-day workload.
- Every case/block/slide/event link resolves.
- No demo event occurs after Tuesday 11:30; stage events are in a plausible order.
- 26H1003 is not ready while F1 is outstanding.
- 26H1004 shows one level recorded versus three required.
- The basket trigger affects exactly 20 slides across 26H1005–26H1014, once.
- 26H1015 is called a missing scan record, not proven misplacement.
- 26H1016 has no invented decalcification ETA.
- 26H2345 stays marked urgent without an invented incident.
- 26H1018 ends at ready for pathologist handoff.
- Screening queries never claim programme deadline or pathologist reporting time.
- Incomplete history or TBD timing produces explicit uncertainty.
- Chat, MCP and dashboard use the same source of truth.

## 12. Three-minute demo outline

1. **0:00–0:25 — Teach the room:** what a LIMS records; introduce the problem of discovering which stage is holding a case.
2. **0:25–0:45 — Show the whole lab:** 450 cases, 104 backlog, 346 due today, counts by stage.
3. **0:45–1:05 — Protocol check:** open 26H1004; three levels expected, one recorded.
4. **1:05–1:40 — Live moment:** trigger Prisma basket failure; show 20 slides across ten cases and recalculated handoff estimates.
5. **1:40–2:10 — Multi-block hold:** open 26H1003; F1 awaits cut-up while A1–E1 are on the processor run.
6. **2:10–2:40 — Ask the agent:** query urgent or screening-linked work; answer only from events and configured rules.
7. **2:40–3:00 — Trust boundary:** timings are editable rules; staff decide; CellPath predicts lab handoff, not diagnosis or reporting.

## 13. Hackathon compliance to check

The brief says to make a new public GitHub repository, include a permissive open-source licence, submit repository URL and commit hash by **Sunday 10:00**, and have no pre-hackathon code/build history. The judges allocate 10 points each to impact, technical execution and presentation; pitches are three minutes plus two minutes of judge questions.

The team has already prepared the project plan and mock-data workbook. **Ask the organisers whether this preparation is permitted under “no prior building”; do not conceal it.** Start code commits in a new repository during the official build window and do not import older code history.

Before publishing, consider generic equipment labels and remove private lab-specific details. The submitted snapshot remains open and may be cloned by the organisers.

