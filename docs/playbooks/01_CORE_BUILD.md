# Playbook `!meridian-core`: the core build to the demo path (Checkpoint 2)

## Overview
Build the minimum that proves Meridian works live: the data loads and validates, state comes from the latest events, the 4 alerts fire with evidence, simple estimates are calculated, there's an API with SSE, the dashboard shows lanes, alerts and the case drawer, and the stainer-failure trigger and reset work. Done = **Checkpoint 2**, the moment to record the backup video. Serves FR-1 to FR-11 (minus the MCP parts) and FR-14 in `docs/PRD.md`.

## What's Needed From User
- Answers to the open questions (already given: SheetJS from its CDN; minimal estimates before the trigger; background cases get stage-based estimates labelled illustrative; Logos Evo uses 13:00; labels Processor A–D, Stainer 1, Scanner 1–4; amber #C98A1B; Tailwind approved; `motion`; stay on Node 20).
- `config/targets.json` values from Victoria (the code must work with or without them).
- A confirmation, at ⏸ points, that the screen looks right.

## Procedure

### Phase A: rules engine (server/src/domain/, tests/domain/)
1. Write failing tests for A3: one per alert (IDs, evidence event IDs, what, why, suggested check, exact wording).
2. Implement `outstandingBlock`: compare expected blocks to completed blocks per case; for 26H1003, list A1–E1 vs F1 separately.
3. Implement `protocolMismatch`: compare levels required to levels recorded per block; 26H1004 → 1 of 3.
4. Implement `basketFailure`: inactive until EV-01215 is applied; then resolve PRISMA-BASKET-01 → 20 slides → 10 cases.
5. Implement `scanGap`: scan expected and no scan complete; comparators are later cases with a scan complete; wording "missing scan event; check the slide location or scan record".
6. Write the A4 acceptance tests (CLAUDE.md "Required tests"), plus the **overclaim test**: scan every user-facing string for "diagnos", "reporting time", "deadline", "misplaced", "production".
7. Implement the minimal A5 estimator:
   - remaining steps × durations from the Timing Rules, inside working windows;
   - output `components[]`, `assumptions[]` ("queues not modelled"), and `status` (estimated / unknown / ready);
   - cover the 10 basket cases, plus 26H1003 = unknown (F1), 26H1016 = unknown (decalcification) and 26H1018 = ready;
   - background cases are labelled "illustrative, stage-based".
   - Sub-step: the trigger adds the 60-minute repeat run (illustrative rule) to the 10 basket cases.
8. Run `npm test`. Everything must be green. Commit `A3-A5min: alerts + minimal estimates`. Push.

### Phase B: server (server/src/, tests/api/)
9. Load `data/cellpath.json` into one in-memory store at startup (B1). Never re-read it per request.
10. Implement the routes from MASTER_PLAN §4: `/api/overview`, `/api/cases`, `/api/cases/:id`, `/api/alerts`, `/api/delayed`.
11. Add SSE `GET /api/stream` that emits `state-changed {version}` on every mutation (B2).
12. Add `POST /api/sim/basket-failure`: if it's pending, append EV-01215, recompute, bump the version, emit SSE and return `{fired:true, affectedCases:10, affectedSlides:20}`; otherwise return 409 (B3).
13. Add `POST /api/sim/reset`: restore the initial state and emit SSE (B4).
14. Write the API tests: route shapes, 404s, trigger once → 409, reset → trigger works again, 3 cycles.
15. Commit and push.

### Phase C: dashboard (web/src/, not story/)
16. D1 shell:
    - set up the design tokens in CSS variables: CLAUDE.md palette plus `--amber`;
    - fonts: a serif for headings, Inter for UI, monospace for IDs;
    - header: "Meridian", the clock "Tue · Day 1 · 11:30", a SIMULATED DATA badge, and tiles for 450 / 104 / 346 / ready.
17. D2 lab map: 10 stage lanes (backlog vs today); click a lane to filter the case list; the totals must reconcile to 450.
18. D3 attention queue: cards showing **what / evidence / why / suggested check / time**; click one to open the case drawer.
19. D5-lite case drawer:
    - a journey bar across the 10 stages;
    - blocks and levels;
    - the estimate with its components, or "unknown" plus the reason.
20. D4 live:
    - subscribe to SSE and re-fetch on `state-changed`;
    - add a "Trigger stainer failure" button (demo control) and a "Reset demo" button;
    - affected cards pulse crimson once.
21. Check the layout at a 1440×900 viewport, with base text 16px or larger.
22. Commit and push.

### ⏸ Checkpoint 2
23. Run `npm run dev`. Demonstrate:
    - the lanes reconcile to 450;
    - the 4 alerts render;
    - the trigger flags 20 slides / 10 cases and updates estimates live;
    - reset works;
    - 3 cycles in a row with no errors in the console.
24. Report to the user and tell them: **"Record the backup video now."**

## Specifications
- `npm test` is green; the test count is reported; the overclaim test exists and passes.
- `npm run dev` serves localhost:5173 (UI) and :8787 (API) with no console errors.
- The numbers on screen equal the API responses, which equal the test expectations (450 / 104 / 346; 20 / 10; 1 of 3; F1 outstanding).
- The trigger is idempotent (409 on a second call); reset restores the start state; SSE updates the UI in under 1 s.
- Every alert card has all five fields; the scan-gap wording is exact.
- STATUS.md has one line per task; every task has a commit and has been pushed.

## Advice and Pointers
- Build in vertical slices: one alert end to end (rule → API → card) before the next.
- Keep the domain functions pure (state in, alerts and estimates out). The server only orchestrates. That makes the tests trivial.
- Store times as minutes since Day 0 00:00 internally; format as "Day 1 13:42" only at the edge.
- For the estimates, prefer "unknown + reason" over a guess. Judges reward honesty, and the safety rules require it.
- If the dashboard looks plain, that's fine at CP2. Motion comes later (VISUAL_LAYER).

## Forbidden Actions
- Don't edit `data/CellPath_Mock_Data.xlsx`, `context/` or `external/` (except appending rows to REGISTRY).
- Don't use the npm-registry `xlsx` package. Don't add dependencies outside STACK_REPOS (plus Tailwind) without asking.
- Don't let any route other than `/api/sim/*` mutate state. Don't give MCP or chat any write path.
- Don't invent events, times or causes. Don't say "misplaced", "diagnosis", "deadline" or "production-ready".
- Don't force-push, commit `.env`, or commit secrets.
- Don't start MCP, motion or 3D work before Checkpoint 2 passes.
