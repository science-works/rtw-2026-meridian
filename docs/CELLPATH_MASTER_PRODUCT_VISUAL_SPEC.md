# Meridian by CellPath — Build and Visual Specification

**Version:** Hackathon build brief  
**Demo snapshot:** Tuesday, Day 1, 11:30 (Day 0 is Monday; Day -1 is the preceding working day)  
**Data:** Fictional, editable simulation data. No live laboratory connection.

## 1. Product in one sentence

**CellPath is a bench-facing workflow assistant. Meridian reads simulated lab events, shows where each case, block and slide is, flags a mismatch as it appears, and explains the expected time to completed laboratory handoff.**

The demo adds an agent-readable layer to the kind of workflow information held in a laboratory information system (LIMS). The LIMS remains the record system. CellPath’s mock feed demonstrates how an integration could read the events and interfaces available at a real laboratory; it does not connect to one during this hackathon.

## 2. Scope and safety boundary

CellPath covers histology preparation from receipt and booking through physical and digital handoff to the pathologist. It monitors workflow; staff decide what to do and record the action. The app does not control equipment, monitor staff performance, diagnose, report results, or predict the full BCSP/cervical programme deadline.

The handoff clock ends when the lab has completed its preparation work and made the case available to the pathologist. A processor ETA is one milestone, not a case handoff ETA. All calculations use editable rules and recorded queue/events. The language model may explain tool results; it must not invent counts, durations, stage status or a diagnosis.

The demo day includes:
- Histology biopsies and larger tissue samples, including multi-block resections.
- Urgent cases, with urgent status kept visible.
- Bowel Cancer Screening Programme (BCSP) and cervical-screening biopsy tags. These show laboratory progress/handoff only.
- Bone samples in decalcification. While decalcification is still in progress, display the current status and do not invent an ETA. Start the downstream processor clock when the case is recorded ready and loaded for processing.
- Diagnostic cytopathology cell blocks and clots as a dashboard category. This simulated day has **zero received**. Provide mock-archive search by case ID/date, but do not invent a live case or imply this day’s flow processes diagnostic cytology.

All identifiers such as `26H2345`, staff initials `AA`/`BB`, device labels and times are fictional. Staff initials exist only to demonstrate event traceability, never to rank or monitor staff.

## 3. Demo operating model and data

### Shared clock and workload

- Simulated now: **Tuesday 11:30**.
- **450** cases are visible: **104 previous-day backlog + 346 current-day workload**.
- Backlog means cases carried into today for completion. The large microtomy queue is the main backlog example: **103 embedded cases await cutting**, and one older case is waiting for a scan event.
- Three cases are waiting for pathologist cut-up before they can enter the overnight processor run.
- Use the workbook’s event log as the source of truth. Current stage is the latest valid timestamped event, not a manually guessed label. Calculate counts from events when feasible; retain the workbook’s 11:30 totals as reconciliation checks.
- Case counts and machine load use different units. A case can contain several blocks and slides. Do not describe 450 tracked cases as processor capacity. Processor slot capacity is unspecified.

### Daily workflow clock

| Stage | Demo rule |
|---|---|
| Receipt / booking and cut-up | Staffed day approximately 07:00–17:00. Cases received today are cut up when needed and, if ready before the illustrative 17:00 cutoff, loaded for overnight processing. |
| Processing | Processor runs overnight. Outputs vary by processor and tissue. |
| Embedding | Two stations. Main staffed embedding window approximately 07:00–11:30. Record which station handled the case and fictional initials `AA` or `BB`. |
| Microtomy | Six stations cut tissue into thin sections. Illustrative timing: 4 minutes per block plus 2 minutes per additional level. Protocol-required levels are checked against levels actually recorded. |
| H&E | Drying oven is shown as a short step before staining. H&E auto-stainer holds 9 baskets per run: 3 boxes × 3 baskets × 20 slides = **180 slides maximum**. Illustrative run time: **30 minutes**. |
| Digital scanning | Two scanners, approximately 100 slide slots each, 200 total loaded capacity. Illustrative scan duration: 2 minutes per slide. Scanners may run overnight. A capacity figure is not a promise that the whole load finishes simultaneously. |
| IQC | One review PC. Staff match the digital image, physical slide and request form. Illustrative review time: 1 minute per slide. |
| Handoff | Case is closed/emitted in the simulated LIMS, the digital images/case are sent electronically, and the physical tray is put in the pathologist’s pigeonhole. CellPath ends here. |

### Generic equipment in the simulation

Use only these labels on screen and in the mock events:

- **Processor A, B, C and D.** Preserve the illustrative output windows already represented in the data: A/B about 06:45, C about 08:40, D about 12:00–13:00. Show run state, expected output, and the cases/blocks currently assigned. These are demonstration values, not validated service standards.
- **Embedding station 1 and 2.** Show cases processed, timestamp and fictional staff initials.
- **Microtomy station 1–6.** Show work queue, case/block, requested versus recorded levels and elapsed/estimated work.
- **H&E auto-stainer 1.** Show three boxes, each with three baskets; each basket can hold up to 20 slides. The demo incident uses `H&E-BASKET-01`.
- **Digital scanner 1 and 2.** Show capacity, queue, current scans and expected completion. Do not invent scanner IDs 3 or 4.
- **IQC workstation 1.** Show the case/slide review queue and whether physical/digital/request form matching is recorded.

The device names above are generic mock labels. The interface must not claim a live connection. The phrase for the pitch is: **“The agent reads case events from the lab’s existing workflow and information systems. We’re simulating those feeds in this demo; a live version would connect through the interfaces available at each lab.”**

## 4. Required screens

### Screen A — Overview dashboard

**Goal:** a judge understands the workload and notices what needs attention in under five seconds.

- Deep navy background; clear high-contrast white text; restrained green accent. Use purple for BCSP and green for cervical-screening tags. Avoid rainbow status colors and severity ranks.
- Top-left identity: `MERIDIAN` with a light-green-to-white wordmark; sub-label `CellPath lab workflow assistant`.
- Top bar: fixed simulated clock, global case search with magnifying-glass affordance, and tabs for `Overview`, `Lab flow`, `Screening`, `Diagnostic cytopathology`, and `Archive`.
- Compact headline counts: tracked cases, previous-day backlog, current-day workload, urgent cases, screening-linked cases, cases ready for pathologist, and open attention items. Every number must come from the data model.
- Main stage-count strip/list: received/booked, cut-up, processing, decalcification, embedding, microtomy, H&E, scanning, IQC, ready for handoff. Show count and, where useful, percentage of 450. Keep “decalcification” visible as normal work, not an error.
- Attention area: one uniform exclamation marker per open issue. A new marker gently bounces until acknowledged; acknowledging stops the motion but leaves the issue visible as `Acknowledged` or `In progress`. No severity ranking, sound, or modal that blocks the lab view. Close only when the corresponding completion/check event is recorded.
- A small assistant chat panel or expandable chat button stays available on the overview.
- Clicking a metric/category opens a filtered list, not a tiny unreadable chart. A chart may support the stage counts, but case IDs and next actions remain easy to find.

### Screen B — Interactive lab-flow simulation

**Goal:** make the end-to-end bench process the hero visual. Build a clean Simul8-style map with equipment cards and animated case tokens; keep it simple enough to implement quickly.

Show the ordered workflow as connected zones:

`Reception / dissection → Processors A–D → Embedding 1–2 → Microtomy 1–6 → H&E auto-stainer → Scanners 1–2 → IQC → Pathologist handoff`

Add a conditional **Decalcification** holding zone before processor loading. A case stays there until a recorded “ready for processing” event.

- Each zone shows a live count and 2–4 visible example case chips. If the count is large, show `+N more` rather than rendering every case as a tiny label.
- Small tokens move only when the simulated event stream advances. Keep movement calm; no decorative conveyor animation that implies real machine telemetry.
- Hover over equipment to open a readable tooltip/popover: equipment name, current state, cases/blocks/slides inside or queued, load/capacity, latest event time, next expected milestone and ETA source. A click opens a detail drawer/list. Do not require double-click.
- For the stainer, show the 3 boxes, 9 basket positions and each basket’s linked slide/case list. Basket 1 can visibly change from `Run failed` to `Acknowledged` to `Repeat stain in progress`.
- For scanners, show two independent queues and up to 100 loaded slide slots per unit. Use progress/ETA rather than animating 100 individual slides.
- Draw a clear handoff endpoint with separate indicators for physical tray/pigeonhole and digital LIMS send.

### Screen C — Case detail drawer/page

Search or click a case to show:
- Case ID, fictional sample type, urgent/screening tag, cohort and current stage.
- Case-level status plus each block (A1, B1…); show that a larger sample can have multiple blocks and one remaining block keeps the whole case from handoff.
- Slide IDs and level labels where they exist. Compare required levels with recorded levels.
- Stage/equipment history in timestamp order, including station, fictional embedding initials, basket/scanner and staff-recorded actions.
- “Why is it waiting?” answered with the latest event and the missing next event.
- Handoff estimate and a short calculation explanation from the deterministic timing rules. If information is missing or decalcification is not complete, say why no ETA is available.
- Open alert state and acknowledgement/resolution history.

### Screen D — Category and archive views

- `Urgent`: list cases and current station; keep priority visible, without inventing faults.
- `BCSP` and `Cervical screening`: separate, filterable lists with distinct purple/green tags. State clearly that times refer to lab handoff only.
- `Diagnostic cytopathology`: today shows `No cases received today` for cell blocks/clots. Allow mock archive search by case ID or date.
- Search never pretends to query real patient records; it searches the fictional demo workbook only.

### Screen E — Meridian chat

Questions to support:
- “Where is case 26H2345?”
- “Why is 26H1004 waiting?”
- “Which cases are in Processor D?”
- “Which cases are affected by H&E-BASKET-01?”
- “What is holding the urgent cases?”
- “Which screening-linked cases may reach the pathologist later than expected?”

Answers should name the case/equipment, cite the event evidence in plain language, give the calculated ETA or say what is unknown, and offer a link to open the relevant case or alert. If the tools return no data, say so. Never fabricate.

## 5. Attention rules and demo incidents

Use deterministic code for detection. Meridian describes the result; it does not decide staff action.

1. **Outstanding block — 26H1003.** Six blocks expected; A1–E1 are in Processor D and F1 awaits pathologist cut-up. Show partial-case progress. Do not mark the case complete or invent a whole-case ETA before F1 is prepared.
2. **Protocol/levels mismatch — 26H1004.** GI biopsy requires levels 1–3; only L1 is recorded at Microtomy station 4. Flag the discrepancy and ask staff to check the protocol/cutting record. Staff action is required before the case advances.
3. **Failed basket — H&E-BASKET-01.** The 10:45 fault affects 20 linked slides across cases 26H1005–26H1014. The event sequence is: fault detected 10:45; team notified; acknowledgement stops the bouncing marker; troubleshooting; basket reloaded at 11:04; 30-minute repeat H&E run starts 11:05. At the 11:30 snapshot it is still in progress. Keep the alert open until repeat stain and follow-up check are recorded. Do not assume slides need recutting.
4. **Scan gap — 26H1015.** Scan-ready since Monday 15:30, no scan-complete by Tuesday 11:30, while later cases have scan records. Flag the mismatch and suggest checking the queue/location/event record. Do not state that it is misplaced as a fact.

Urgent example **26H2345** is intentionally error-free: received/cut up Monday, processed overnight, first at microtomy Tuesday at 07:45, then through staining, scanning and IQC; ready for lab handoff at 09:30, before the illustrative noon operational aim. This demonstrates priority tracking, not diagnosis/reporting.

## 6. Alert interaction states

- **New:** exclamation bounces gently; no sound.
- **Acknowledged:** bounce stops immediately; alert card remains in the queue.
- **In progress:** show recorded staff action, such as troubleshooting or basket reloaded; the card remains open.
- **Resolved:** only after a recorded pass/completion event. Preserve a compact history.

Acknowledge is not a fix. Do not use red/amber/green severity ranking. Use motion only for new items and ensure reduced-motion settings have a static equivalent.

## 7. Data and technical build contract

### Data entities

The workbook is the mock source. Keep its linked records intact:

- `Cases450`: one row per fictional case; 450 total.
- `Blocks`: block IDs and case-level completeness; 712 rows.
- `Slides`: slide ID, block, level, basket and scan status.
- `Events`: timestamped source of truth, including station/equipment, event type, details, activation/incident state and fictional embedding staff initials.
- `Timing Rules`: editable simulated timings and device capacities.

Every event must resolve to a valid case; block and slide links must resolve when present. Sort by parsed simulated time for case history. Do not use spreadsheet row order as chronology. Treat the repeated H&E cycle and any queue delay as explicit events/inputs.

### Suggested architecture

1. Workbook/JSON loader normalizes cases, blocks, slides, stations and event timestamps.
2. Deterministic workflow engine computes latest state, occupancy, protocol mismatches, open alerts and handoff estimates.
3. Small agent tool layer exposes read-only functions such as `get_case`, `get_station_contents`, `list_alerts`, and `cases_delayed`. A controlled `replay_incident` demo action may append the staged event sequence; it must not send commands to equipment.
4. Meridian chat calls those tools and explains returned evidence. The model does not calculate numbers itself.
5. Browser dashboard subscribes to simulation state and refreshes counts, equipment, alerts, case detail and chat together.

For an MVP, a local JSON event feed and one deterministic incident replay are enough. The feed must visibly say `Simulated` so nobody mistakes the demo for a live NHS lab connection.

## 8. Three-minute pitch plan from the organiser brief

Keep context high-level and use most time to show the working product.

- **0:00–0:25 — Problem.** Histology cases pass through many preparation stages before a pathologist can report them. Staff need a quick way to see where a case is and what is holding it.
- **0:25–0:40 — Existing tool / old way.** One sentence and a screenshot: the LIMS records cases and events; answering cross-stage questions can mean piecing together different status views. Avoid claiming every LIMS lacks a feature.
- **0:40–2:45 — Reinvention demo.** Open the calm overview; show the animated lab map and hover a processor; find urgent 26H2345; open the 26H1004 level mismatch; replay the H&E failure and show acknowledgement/repeat progress; ask Meridian one natural-language question. Choose only the strongest moments if timing is tight.
- **2:45–3:00 — Close.** “Meridian gives bench teams a live, explainable view of preparation and handoff, using the workflow events they already record.” Add the boundary: “Today those feeds are simulated; a live version would use each lab’s available interfaces.”

Do not use unsupported external evidence such as “40 versus 5 errors per 1,000” unless a reliable source is provided. Avoid a detailed technical architecture slide. Judges should see the dashboard, movement, alert and agent answer working.

## 9. Build priorities for a short hackathon

**Must work for the pitch:**
1. Overview with correct 11:30 totals and search.
2. Interactive stage/equipment map with hover/click case contents.
3. Case detail with blocks, slides, event history and rule-based ETA.
4. Four attention rules and acknowledge/in-progress/resolved states.
5. One-button H&E incident replay that updates the map, affected cases, alert and ETA.
6. Meridian chat grounded in the same deterministic functions.

**If time remains:** category/archive screens, scanner queue animation, printable event timeline and richer transitions. Keep the visual clear and the interaction responsive; do not build a complex 3D laboratory.

## 10. Acceptance checks

- Case totals reconcile: 104 backlog + 346 current-day = 450; main-stage buckets sum to 450.
- Latest event at 11:30 produces each case’s current stage. No event occurs after the shared demo clock unless it is an explicit projected ETA field.
- No duplicate event IDs, orphaned blocks/slides, or slide rows for cases that have not reached microtomy.
- Equipment labels are generic; exactly four processors, two embedding stations, six microtomy stations, one H&E stainer, two scanners and one IQC workstation are shown.
- H&E run configuration is 9 baskets × 20 slides, 30 minutes; failed incident is one affected basket of 20 slides across 10 cases.
- Scanner capacities are two units × 100 slide slots; scan duration is labelled illustrative.
- No case is handed off before all required blocks/levels and downstream steps are complete.
- Alert motion stops on acknowledgement; resolution requires a completion/check event.
- All ETAs expose the timing assumptions and queue/rework basis. No ETA is fabricated for unknown decalcification.
- Chat uses the same case/event tools as the UI and never returns a diagnosis or reporting deadline.
- Demo is clearly labelled simulated, with no real patient/staff information or live equipment control.
