// Meridian shared contract (T0). Only the T0 owner edits this folder.
// Two layers: (1) the normalised data file produced by scripts/convert.ts,
// (2) the HTTP API shapes served by server/ and read by web/ and mcp/.

// ---------- Workflow stages ----------

/** Case-level stages, in workflow order (the workbook's "Stage snapshot" values). */
export const STAGES = [
  "Received/booked",
  "Waiting for dissection/cut-up",
  "Awaiting processor or processing",
  "Decalcification",
  "Embedding",
  "Microtomy",
  "H&E staining",
  "Scanning",
  "IQC",
  "Ready for pathologist handoff",
] as const;
export type Stage = (typeof STAGES)[number];

export type Cohort = "Previous-day backlog" | "Current-day workload";

/** Simulated clock string, e.g. "Day 1 11:30" (Day 0 = Monday, Day 1 = Tuesday). */
export type SimTime = string;

// ---------- Normalised data file (data/cellpath.json) ----------

export interface CaseRecord {
  caseId: string;
  cohort: Cohort;
  specimen: string;
  priority: string; // "Urgent" | "Routine" as recorded; never inferred
  programmeTag: string | null; // null when the workbook says "None"
  stageSnapshot: Stage;
  stageEnteredAt: SimTime;
  summary: string;
  blocksExpected: number;
  blocksComplete: number;
  levelsRequired: number;
  levelsRecorded: number;
  processor: string | null;
  stainerBasket: string | null;
  slidesInCase: number;
  alertCategory: string | null;
  isDemo: boolean;
  // The workbook's free-text "Handoff ETA status" column is deliberately NOT carried over:
  // estimates are computed from the timing rules instead.
}

export interface BlockRecord {
  caseId: string;
  blockId: string;
  specimen: string;
  location: string;
  status: string;
  levelsRequired: number;
  levelsRecorded: number;
  caseLevelEffect: string | null;
}

export interface SlideRecord {
  caseId: string;
  blockId: string;
  slideId: string;
  level: string | null;
  basket: string | null;
  status: string;
  scanStatus: string;
}

/** Workbook activation/incident state, e.g. "Recorded", "Detected; attention required", "Acknowledged", "In progress". */
export type ActivationState = string;

export interface EventRecord {
  eventId: string;
  at: SimTime;
  caseId: string;
  blockId: string | null;
  slideId: string | null;
  /** Event-level stage as recorded (may be a sub-step such as "Dissection/cut-up"). */
  stage: string;
  station: string | null;
  type: string;
  details: string;
  activation: ActivationState;
  /** Fictional staff initials (AA/BB), embedding events only. Traceability, never ranking. */
  initials: string | null;
}

export interface TimingRule {
  rule: string;
  description: string;
  value: string;
  unit: string;
  status: string;
  notes: string;
}

export interface OverviewStageRow {
  stage: Stage;
  backlog: number;
  today: number;
  total: number;
}

export interface CellpathData {
  meta: {
    source: string; // workbook file name
    clock: SimTime; // "Day 1 11:30"
    simulated: true;
    /** Stage totals as printed on the workbook's Overview tab, used to reconcile. */
    overviewStages: OverviewStageRow[];
    overviewTotals: { total: number; backlog: number; today: number; ready: number };
  };
  cases: CaseRecord[];
  blocks: BlockRecord[];
  slides: SlideRecord[];
  events: EventRecord[];
  timingRules: TimingRule[];
}

// ---------- API contract (served on :8787) ----------

export interface EstimateComponent {
  step: string;
  minutes?: number;
  note?: string;
  ruleId?: string;
}

export interface Estimate {
  status: "estimated" | "unknown" | "ready";
  readyAt?: SimTime;
  /** Sum of configured step minutes (excludes overnight processing and embedding batch time). */
  activeMinutes?: number;
  /** Elapsed time from the simulated clock to readyAt. */
  wallClockMinutes?: number;
  components: EstimateComponent[];
  assumptions: string[]; // e.g. "queues not modelled"
  reasonUnknown?: string; // e.g. "F1 still at cut-up"
  target?: { label: string; dueAt: SimTime; late: boolean } | "target comparison unavailable";
}

export type AlertKind = "outstanding_block" | "protocol_mismatch" | "basket_failure" | "scan_gap";

/** Spec §6. Derived only from recorded events; Resolved needs a recorded completion/check. */
export type AlertState = "new" | "acknowledged" | "in_progress" | "resolved";

export interface Alert {
  id: string;
  kind: AlertKind;
  /** No severity ranking (spec): every open alert gets the same marker. */
  state: AlertState;
  /** For In progress: the latest recorded staff action, e.g. "Repeat H&E run started 11:05". */
  stateDetail?: string;
  history: { at: SimTime; eventId?: string; label: string }[];
  raisedAt: SimTime;
  caseIds: string[];
  slideIds?: string[];
  what: string;
  evidence: { eventId?: string; text: string }[];
  why: string;
  suggestedCheck: string;
}

export interface CaseSummary {
  caseId: string;
  cohort: Cohort;
  specimen: string;
  priority: string;
  programmeTag: string | null;
  stage: Stage;
  stageEnteredAt: SimTime;
  isDemo: boolean;
  alertIds: string[];
  estimate: Estimate;
}

export interface CaseDetail extends CaseSummary {
  /** Block `stage` is null when it cannot be derived from recorded data ("not enough information"). */
  blocks: { blockId: string; stage: Stage | null; location: string; status: string; levelsRequired?: number; levelsRecorded?: number }[];
  slides: { slideId: string; blockId: string; level?: string; basket?: string }[];
  timeline: FeedEvent[];
}

export interface Overview {
  clock: SimTime;
  total: number;
  backlog: number;
  today: number;
  urgent: number;
  screeningLinked: number;
  ready: number;
  /** Alerts not yet resolved. */
  openAttention: number;
  stages: OverviewStageRow[];
  triggerFired: boolean;
}

export interface DelayedResponse {
  cases: CaseSummary[];
  note?: string; // "target comparison unavailable" when no target is configured
}

/** One recorded event as served by GET /api/events (generic labels, display text). */
export interface FeedEvent {
  eventId: string;
  at: SimTime;
  caseId: string;
  blockId?: string;
  slideId?: string;
  stage: string;
  station?: string;
  /** Stainer box and basket, split out of the raw station string where present. */
  box?: string;
  basket?: string;
  type: string;
  details: string;
  activation?: string;
  initials?: string;
}

export interface EventsPage {
  feed: string;
  total: number;
  offset: number;
  limit: number;
  nextOffset: number | null;
  events: FeedEvent[];
}

/** One read made by an AI agent through the MCP server (shown in the dashboard's agent console). */
export interface AgentActivity {
  id: number;
  /** Wall-clock time of the call, HH:MM:SS (not the simulated clock). */
  at: string;
  tool: string;
  runId?: string;
  path: string;
  /** Case ID and filters only. */
  args: Record<string, string>;
  /** Built by code from the API response, never by a model. */
  resultSummary: string;
  caseIds: string[];
}

export interface TriggerResponse {
  fired: true;
  affectedCases: number;
  affectedSlides: number;
}

export interface ApiError {
  error: string;
}

export const API_PORT = 8787;
