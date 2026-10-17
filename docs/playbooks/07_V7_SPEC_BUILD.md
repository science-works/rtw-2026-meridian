# Playbook `!meridian-v7`: build Victoria's final spec on the new workbook

## Overview
Victoria (domain lead) has delivered the final mock workbook and the final product/visual spec (`docs/CELLPATH_MASTER_PRODUCT_VISUAL_SPEC.md`, replaced tonight). This playbook moves the working build onto them **without ever losing a working demo**.

The spec now decides screens, interactions, labels and the demo story. This playbook resolves the known conflicts with CLAUDE.md in advance (section "Decisions already made"), so the agent doesn't need to stop and ask about them.

Code freeze: **Sunday 09:00**. Submission: 09:45. The safety tag `demo-safe-v6` (step 1) is always the fallback.

## What's Needed From User
- The new files are already in place: `data/CellPath_Mock_Data.xlsx`, `docs/CELLPATH_MASTER_PRODUCT_VISUAL_SPEC.md`, this playbook, and the fixed `scripts/check_event_order.py`.
- Approval at each ⏸ checkpoint (a screenshot plus test count).

## Verified facts about the new workbook (checked by script)
- 450 cases = 104 backlog + 346 current-day. Stage snapshot buckets sum to 450:
  Received/booked 72 · Waiting for dissection/cut-up 3 · Awaiting processor or processing 151 · Decalcification 20 · Embedding 29 · Microtomy 139 · H&E staining 15 · Scanning 8 · IQC 5 · Ready for pathologist handoff 8.
- 712 blocks · **426 slides** (non-blank rows; the ChatGPT note saying 434 is wrong) · **1,253 events**, unique IDs, none after Day 1 11:30.
- New Events column: `Fictional staff initials` (AA = 40 events, BB = 36, embedding only).
- Programme tags: BCSP 11 · Cervical screening 132 · None 307. Priority: Urgent 15 · Routine 435.
- Basket `H&E-BASKET-01` (Slides sheet) → exactly 20 slides across 26H1005–26H1014. `URGENT-H&E-RUN-01` → 3 slides.
- **The incident is now already recorded, not pending:**
  - EV-01215 Day 1 10:45 `STAIN_RUN_FAILED` (Activation: "Detected; attention required")
  - EV-01255 Day 1 10:47 `INCIDENT_ACKNOWLEDGED` ("Acknowledged")
  - EV-01254 Day 1 11:04 `BASKET_RELOADED` ("In progress")
  - EV-01256 Day 1 11:05 `REPEAT_STAIN_STARTED` ("In progress")
  Event IDs are **not** chronological. Always sort by parsed simulated time, never by ID or row order.
- Station labels are inconsistent in the raw data. Normalise in the loader (display labels only; keep raw in data):
  `Microtome station N` / `Microtome N` → `Microtomy station N`; `IQC desk` / `IQC station` → `IQC workstation 1`; `H&E stainer` / `H&E auto-stainer` / `H&E auto-stainer 1 / Box 1 / Basket 1` / `H&E auto-stainer basket H&E-BASKET-01` / `H&E auto-stainer / repeat run` → `H&E auto-stainer 1` (keep box/basket as separate fields where present); `Digital scanner` / `Digital scan queue` → scanner queue; `Scanner 1` → `Digital scanner 1`.
- Equipment set (spec §3, §10): Processor A–D · Embedding station 1–2 · Microtomy station 1–6 · H&E auto-stainer 1 (3 boxes × 3 baskets × 20 slides = 180, 30-min run) · **Digital scanner 1–2 only** (≈100 slots each, 2 min/slide) · IQC workstation 1. **Remove Scanners 3–4 and "Stainer 1"** everywhere (UI, MCP, HF export, README, tests).

## Decisions already made (these override CLAUDE.md where they conflict)
1. **Theme:** adopt the spec's deep-navy theme (white text, restrained green accent, purple BCSP tag, green cervical tag). Replace the cream/plum tokens via CSS variables only. **No red/amber/green severity ranking**; alerts use one uniform exclamation marker. Keep text ≥14px (base 16px), `VITE_FX=off` and reduced-motion fallbacks.
2. **Branding:** wordmark `MERIDIAN` (light-green-to-white), sub-label `CellPath lab workflow assistant`. Keep the `SIMULATED` badge always visible.
3. **The live moment becomes an incident replay.** On server start (and on Reset), hold back the four incident events (EV-01215, EV-01255, EV-01254, EV-01256) as a staged sequence; the clock still shows Tuesday 11:30. A **"Replay H&E incident"** demo button appends EV-01215 (failure: marker bounces, 20 slides / 10 cases flagged, estimates update). The **presenter then clicks "Acknowledge"** on the alert, which appends EV-01255 (bounce stops, card stays open). Then the replay appends EV-01254 (reload) and EV-01256 (repeat run started), ~2 s apart, so basket 1 visibly goes `Run failed → Acknowledged → Repeat stain in progress`. The alert stays **open** (no completion event exists at 11:30). Replace `POST /api/sim/basket-failure` with `POST /api/sim/replay-incident` (409 if already replayed) and `POST /api/alerts/:id/acknowledge` (dashboard only, records the staged ack event; a human action). `/api/sim/reset` restores the staged state.
4. **Repeat run is 30 minutes** (not 60). Affected estimates add the 30-minute repeat from 11:05. Do not assume recuts.
5. **Meridian chat (spec Screen E) is deterministic.** No LLM call, no API key: match the six spec questions (and close variants by case ID / equipment name / basket ID / "urgent" / "screening") to the same server functions the UI uses, and answer with a template: direct answer → IDs and stage → evidence (event times) → estimate or "unknown" → link that opens the case/alert. Unknown question → "I can answer about cases, equipment, alerts and urgent or screening work" plus the six examples as clickable chips. It must never produce a diagnosis or reporting deadline.
6. **MCP stays** (read-only) as the "any AI agent" endpoint, and the Agent console stays, but it is **secondary** in the pitch. Rename/add MCP tools to match the spec: `get_case`, `get_station_contents`, `list_alerts`, `cases_delayed`. MCP may **not** replay or acknowledge.
7. **Stop What-if.** If it's partly built, keep it behind `VITE_SIM=off` (default off), commit only if tests are green, and do no more work on it.
8. **"Old way" view:** keep/build the `LIMS view` toggle only if time remains after Phase D. Fallback is a screenshot of the workbook's Events sheet.
9. **Targets:** `config/targets.json` stays null; screening-delay answers say "lab handoff only; target comparison unavailable". The spec's "illustrative noon aim" for urgent may be shown as text on 26H2345 only, labelled illustrative.

## Procedure

### Phase 0: safety net (10 min)
1. `git pull --rebase`. Confirm `npm test` is green on the current build.
2. `git tag demo-safe-v6 && git push origin demo-safe-v6`. This is the fallback demo for the pitch if anything below breaks.
3. Update CLAUDE.md and AGENTS.md: point to this playbook, replace the Design system, alert rule 3 (H&E-BASKET-01, 30-min repeat, replay), equipment labels and "Required tests" to match. Keep all safety rules.

### Phase A: data swap (≤40 min) ⏸
4. Re-run convert. Update the loader: new initials column; station-label normalisation map (above); sort events by parsed time; staged incident set.
5. Update tests deliberately (never weaken a test to pass): 426 slides, 1,253 events, 20 basket slides / 10 cases, equipment set, staged incident, stage buckets above, initials only AA/BB, event order (run `python3 scripts/check_event_order.py data/CellPath_Mock_Data.xlsx`, all zeros). Keep the existing demo-case tests (26H1003, 26H1004, 26H1015, 26H1016, 26H2345, 26H1018).
6. Update `scripts/export_hf_dataset.ts` and `hf_dataset/README.md` counts and labels.
7. ⏸ **Checkpoint A:** test count, counts table vs the numbers above. Commit `Data v7: Victoria's final workbook`. Push.

### Phase B: overview + theme + alert states (≤70 min) ⏸
8. Navy theme tokens; wordmark; top bar with clock, search (case ID), tabs `Overview · Lab flow · Screening · Diagnostic cytopathology · Archive` (tabs without content yet show a short honest placeholder).
9. Headline counts: tracked, backlog, current-day, urgent, screening-linked, ready for pathologist, open attention items. All from data.
10. Stage strip with the 10 stages, count and % of 450; decalcification shown as normal work. Click → filtered case list.
11. Attention area: uniform `!` marker; states New (gentle bounce) → Acknowledged (no bounce, card stays) → In progress (shows recorded staff action) → Resolved (only on a completion/check event; none at 11:30). Static equivalent under reduced motion. No sound, no blocking modal.
12. ⏸ **Checkpoint B:** screenshot at 1440×900. Commit, push.

### Phase C: lab-flow map, the hero (≤90 min) ⏸
13. Simul8-style connected zones: `Reception / dissection → [Decalcification holding] → Processors A–D → Embedding 1–2 → Microtomy 1–6 → H&E auto-stainer 1 → Digital scanners 1–2 → IQC workstation 1 → Pathologist handoff (physical tray + digital send)`.
14. Each zone: live count, 2–4 case chips, `+N more`. Tokens move only when events are appended. Calm motion (motion lib), ≤900 ms.
15. Hover (single, readable popover): equipment name, state, contents/queue, load/capacity, latest event time, next expected milestone and its rule source. Click → drawer listing its cases/blocks/slides. Embedding popover shows station + time + initials (traceability only; never ranked).
16. Stainer card: 3 boxes × 3 baskets grid; Basket 1 shows its 20 slides / 10 cases and its state. Scanners: two queues with progress/ETA (no 100 animated slides).
17. Case drawer (Screen C): reuse the existing one; add blocks/levels required vs recorded, "Why is it waiting?" (latest event + missing next event), ETA with the rule explanation, alert history.
18. ⏸ **Checkpoint C:** screenshot of the map, a hover on Processor D, the stainer grid. Commit, push.

### Phase D: incident replay + chat (≤75 min) ⏸
19. Implement decision 3 (replay + acknowledge) with tests: replay is idempotent (409), acknowledge only stops motion and never resolves, reset restores staging, MCP cannot call either.
20. Implement decision 5 (deterministic chat) as a panel/expandable button on Overview and Lab flow, with tests for all six spec questions (exact IDs in answers) and one unknown question.
21. Update Story mode to the new beats: overview → lab map hover → 26H2345 (urgent, ready 09:30) → 26H1004 mismatch → replay incident (pause for the presenter to click Acknowledge) → chat question. Arrow keys advance.
22. ⏸ **Checkpoint D:** 30-second clip or screenshots of the replay sequence and one chat answer; tests green. Commit, push.

### Phase E: only if time remains before 08:30
23. LIMS view toggle (decision 8). 24. Screening / cytopathology / archive tabs (spec Screen D). 25. README screenshots and counts refreshed, "Built with" unchanged, safety wording from spec §3.

### Freeze
26. 09:00 Sunday: only README or typo fixes. `npm test`, clean `git status`, push, print `git rev-parse HEAD`.

## Specifications
- Every acceptance check in spec §10 passes, with a test where it's testable.
- Counts on screen equal the verified numbers above; nothing hard-coded in the UI.
- The incident replay produces exactly the recorded 4-event sequence and states; the alert never shows Resolved.
- Chat answers come only from the same server functions as the UI; tests cover the six questions.
- `demo-safe-v6` tag exists on GitHub before any v7 change is committed.

## Advice and Pointers
- If a phase overruns its timebox by more than 20 minutes, commit what's green, note it in STATUS.md and move to the next phase. A working map plus replay beats a perfect overview.
- Phases C and D are what the judges will see. Protect them.
- Use the spec's exact wording for the ETA and safety boundary.

## Forbidden Actions
- Don't edit `data/CellPath_Mock_Data.xlsx`. Don't weaken or delete tests to make them pass.
- Don't add an LLM call to chat, new dependencies, 3D, or Scanner 3–4 / "Stainer 1" labels.
- Don't let MCP replay, acknowledge, reset or write anything.
- Don't use red/amber/green severity, sound, or modals that block the lab view.
- Don't claim diagnosis, reporting time, screening deadlines, live connection or staff monitoring.
- Don't force-push. Don't delete the `demo-safe-v6` tag.
