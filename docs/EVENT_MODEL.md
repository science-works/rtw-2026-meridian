# Meridian event model

Meridian reads **workflow events**, the timestamped records a histology lab's systems already keep ("block A1 cut up", "slide scanned", "IQC passed"). Everything else is derived from them by deterministic code: stage counts, the four alerts, handoff estimates, the MCP tools and the dashboard. The rules never see a vendor's format, only this model, so connecting a different lab means writing a **feed adapter**, not changing the rules.

> The demo feed is fictional and simulated. A live version would connect through the interfaces available at each lab, with lab-approved access control, information-governance review and audit.

## 1. Entities

```
case ──< block ──< slide >── basket
  │        │         │
  └────────┴─────────┴──< event >── station
```

| Entity | Key | Main fields (shared/types.ts) |
|---|---|---|
| **Case** | `caseId` (e.g. `26H1003`) | cohort, specimen, priority, programme tag, recorded stage and when it was entered, blocks expected/complete, levels required/recorded, processor, demo flag |
| **Block** | `caseId` + `blockId` (e.g. `26H1003`/`F1`) | location, status, levels required/recorded |
| **Slide** | `slideId` (e.g. `26H1005-S01`) | case, block, level (`L1`…), stainer basket, slide status, scan status |
| **Basket** | basket ID on the slide (e.g. `H&E-BASKET-01`; `URGENT-H&E-RUN-01`) | the slides loaded together into one H&E run (H&E auto-stainer 1: 3 boxes × 3 baskets × 20 slides) |
| **Station** | `station` on the event (e.g. "Microtome station 4") | where the event happened; generic labels in the UI |
| **Event** | `eventId` (e.g. `EV-01215`) | time, case, optional block and slide, stage, station, type, details, activation |
| **Timing rule** | rule name | the editable durations and windows that estimates use (Timing Rules tab) |

A case can have blocks at different stages. Whole-case handoff waits for every required block. The latest recorded event per case is the source of truth.

## 2. Events

| Field | Type | Notes |
|---|---|---|
| `eventId` | string | unique |
| `at` | `"Day N HH:MM"` | shared simulated clock: Day 0 = Monday, Day 1 = Tuesday; "now" is Day 1 11:30 |
| `caseId` | string | must resolve to a case |
| `blockId` | string \| null | must resolve to a block of that case when present |
| `slideId` | string \| null | must resolve to a slide of that case when present |
| `stage` | string | stage the event belongs to |
| `station` | string \| null | raw workbook strings are normalised for display (e.g. "Microtome 1" → "Microtomy station 1", "IQC desk" → "IQC workstation 1"); stainer box/basket are split into `box` / `basket` |
| `type` | string | see below |
| `details` | string | free text; workbook authoring notes are removed for display |
| `activation` | string | `Recorded`, or an incident state: `Detected; attention required`, `Acknowledged`, `In progress` |
| `initials` | string \| null | fictional staff initials `AA`/`BB` on embedding events only: traceability, never ranking |

Event types in the demo feed (36), grouped by workflow step:

| Step | Types |
|---|---|
| Receipt | `CASE_RECEIVED`, `URGENT_REFERRAL_FLAG`, `URGENT_PRIORITY_TRACKED`, `SCREENING_CLOCK_ACTIVE` |
| Cut-up | `CUTUP_STARTED`, `CUTUP_COMPLETE`, `PATHOLOGIST_CUTUP_PENDING`, `BLOCK_PENDING` |
| Decalcification | `DECALCIFICATION_STARTED` |
| Processing | `PROCESSOR_LOADED`, `PROCESSOR_RUN_STARTED`, `PROCESSOR_COMPLETE` |
| Embedding | `EMBEDDING_STARTED`, `EMBEDDING_COMPLETE` |
| Microtomy | `BACKLOG_ENTERED_MICROTOMY`, `MICROTOMY_STARTED`, `LEVELS_CUT`, `LEVEL_PROTOCOL_MISMATCH` |
| H&E staining | `SLIDE_OVEN_STARTED`, `SLIDE_OVEN_COMPLETE`, `BASKET_LOADED`, `STAINING_STARTED`, `STAINING_COMPLETE` |
| H&E incident | `STAIN_RUN_FAILED`, `TEAM_NOTIFIED`, `INCIDENT_ACKNOWLEDGED`, `TROUBLESHOOTING_STARTED`, `BASKET_RELOADED`, `REPEAT_STAIN_STARTED` |
| Scanning | `SCAN_EXPECTED`, `SCANNING_STARTED`, `SCAN_COMPLETE` |
| IQC | `IQC_STARTED`, `IQC_PASSED` |
| Handoff | `CASE_READY_FOR_PATHOLOGIST` |
| Snapshot | `CURRENT_STAGE_SNAPSHOT` (recorded stage at the clock) |

Validation (`server/src/domain/validate.ts`) checks that links resolve, IDs are unique, nothing is after the clock, every case has a receipt, events are in a valid order (e.g. staining before scanning, scanning before IQC), and each case's latest event agrees with its recorded stage.

## 3. Reading events: `GET /api/events`

Paged and read-only. Returns recorded events only, in time order.

```
GET /api/events?offset=0&limit=100            # limit 1–500, default 100
GET /api/events?caseId=26H1003                # one case
GET /api/events?type=SCAN_COMPLETE            # one event type
```

```json
{
  "feed": "workbook",
  "total": 1237,
  "offset": 0,
  "limit": 100,
  "nextOffset": 100,
  "events": [
    { "eventId": "EV-00006", "at": "Day -1 06:30", "caseId": "26H1015", "stage": "Received/booked",
      "station": "Booking", "type": "CASE_RECEIVED", "details": "Small biopsy received on the previous working day." }
  ]
}
```

The server holds back the 16 events of the recorded H&E incident (its six events plus the ten affected cases' 11:30 snapshots, which describe it) until it is replayed from the dashboard: `total` is 1237 before the replay, 1253 (the whole workbook) after it, and 1237 again on reset. Events are always ordered by parsed simulated time; event IDs are not chronological. Any agent or tool can pull the full log by following `nextOffset` until it is `null`.

## 4. Feed adapters

```ts
// server/src/feed.ts
export interface FeedAdapter {
  readonly name: string;         // shown in /api/health and /api/events
  readonly description: string;  // where the data comes from
  load(): CellpathData;          // the full normalised dataset
}
```

| Adapter | Selected by | Source |
|---|---|---|
| `workbookFeed()` (default) | nothing set | `data/cellpath.json`, converted from the fictional workbook by `npm run convert` |
| `jsonExportFeed(path)` | `MERIDIAN_DATA=/path/to/export.json` | any lab export already mapped to the `CellpathData` shape |

At start-up the server validates whatever the adapter returns and prints every finding. A lab's own export may legitimately fail the demo workbook's reconciliation checks, such as the Overview totals or the staged trigger, so findings are reported, not fatal.

## 5. Standards mapping

Meridian's events are already an **event log**, the same shape as real, published hospital process logs (see `docs/DATA_PROVENANCE.md` §3). They map directly onto the two open process-mining standards: **IEEE XES** (case id, activity, timestamp, attributes) and **OCEL 2.0** (Object-Centric Event Logs, [arXiv:2403.01975](https://arxiv.org/abs/2403.01975)), where each event relates to several objects. Tools such as PM4Py, ProM or Celonis can then analyse months of history (bottlenecks, rework loops, error trends). This is the "Lab-wide" step on the roadmap; it is not built yet.

### IEEE XES (IEEE 1849): one trace per case

| XES attribute | Meridian field | Notes |
|---|---|---|
| trace `concept:name` (written `case:concept:name` in flattened logs) | `caseId` | one trace per case |
| event `concept:name` | `type` | activity, e.g. `LEVELS_CUT` |
| event `time:timestamp` | `at` | convert "Day N HH:MM" with an anchor date for Day 0 (any Monday) |
| event `org:resource` | `station` | e.g. "Microtome station 4" |
| event `lifecycle:transition` | `complete` | events are recorded on completion |
| extra event attributes | `eventId`, `stage`, `blockId`, `slideId` | prefix as `meridian:*` |
| trace attributes | `priority`, `programmeTag`, `cohort`, `specimen` | |

XES flattens everything onto the case. That loses the fact that one stain-run failure touches 20 slides across 10 cases, which is why OCEL fits better.

### OCEL 2.0: object-centric

| OCEL 2.0 concept | Meridian |
|---|---|
| **Object types** | `case`, `block`, `slide`, `basket`, `station` |
| Object attributes | case: priority, programmeTag, cohort, specimen; block: levelsRequired, levelsRecorded; slide: level, scanStatus |
| **Event types** | the 36 event types above |
| Event attributes | `eventId`, `stage`, `details` |
| **Event-to-object (E2O)** | event → case (`for`), → block (`on`), → slide (`on`), → station (`at`); `STAIN_RUN_FAILED` → basket (`run`) |
| **Object-to-object (O2O)** | block → case (`part of`), slide → block (`cut from`), slide → basket (`loaded into`) |
| Timestamps | `at`, converted as for XES |

In OCEL the basket failure is a single event linked to one basket object, which is linked to 20 slide objects in 10 cases. That is exactly the knock-on effect Meridian shows on the dashboard.

**Structural references** (shape only; none of their data is used here): the *BPIC 2011 Hospital log*, a real-life event log from a Dutch academic hospital (4TU.ResearchData, DOI 10.4121/uuid:d9769f3d-0ab0-4fb8-803b-0d1120ffcf54), and the *Sepsis Cases* event log (4TU.ResearchData). Because the shape is standard, a lab's real export, if approved, maps onto Meridian through a `FeedAdapter` without changing the rules engine.

Exporters to `.xes` and OCEL 2.0 JSON are straightforward from `GET /api/events` plus the case, block and slide records. They are listed as next steps, not claimed as built.

## 6. Bring your own LIMS export

No vendor permission or code changes are needed to try Meridian on another lab's data:

1. **Export** case, block, slide and event records from your LIMS or tracking system, for example as a CSV or report export. Labs, interfaces and fields differ. Use only what your information-governance process approves, and start with de-identified or synthetic data.
2. **Map** them to the `CellpathData` JSON shape in `shared/types.ts`: `cases`, `blocks`, `slides`, `events` and `timingRules`, plus `meta.clock`. `scripts/convert.ts` is a worked example for a spreadsheet. Keep your own event types if you have them; the four alert rules key on these types:
   - outstanding block: `CUTUP_COMPLETE` per block;
   - protocol mismatch: levels on blocks plus `LEVELS_CUT`;
   - basket failure: `STAIN_RUN_FAILED` plus slide baskets;
   - scan gap: `SCAN_EXPECTED` / `SCAN_COMPLETE`.
3. **Set your timing rules** (`timingRules`). Any duration you leave out makes the affected estimates "unknown" instead of guessed.
4. **Run** `MERIDIAN_DATA=/path/to/export.json npm run dev` and read the validation findings in the server log.
5. **Query** it: the dashboard, `GET /api/events` and the MCP tools now describe your data.

For a live connection, write a `FeedAdapter` that reads from your system's interface (for example an HL7 v2 feed via the trust's integration engine, a FHIR `Specimen`/`Task` API, or an open LIMS such as SENAITE or OpenELIS) and returns the same shape.
