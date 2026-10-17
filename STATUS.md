# STATUS.md — one line per update: [time] [workstream] [task] started|blocked:<why>|done
[18:12] [T0] [contract: shared/types.ts, root package.json] started
[18:17] [T0] [contract: shared/types.ts, shared/clock.ts, API stub server/src/app.ts for every route] done
[18:17] [H] [P0 skeleton: package.json scripts, tsconfig, vitest, web/ Vite+React shell, .env.example, README run section] done
[18:17] [A] [A1 convert: scripts/convert.ts (SheetJS from cdn.sheetjs.com, not npm registry) -> data/cellpath.json: 450 cases, 712 blocks, 423 slides, 1230 events, 26 rules] done
[18:17] [A] [A2 validate: server/src/domain/validate.ts: counts 450=104+346 + Overview stage table, links, clock cutoff, event order, receipt, dup IDs, single pending EV-01215, snapshot=latest event] done
[18:17] [G] [npm test: 4 files, 36 tests green; tsc clean; npm run dev serves :5173 + :8787] done
[18:17] [T0] [note: Node here is 20.11.1, so vite@6 / vitest@3 / typescript@5.9 are pinned. npm audit flags vitest@3 deps (dev-only). Fix: Node 22 LTS, then vitest@5] blocked:needs-owner-decision
[18:17] [T0] [note: docs/CELLPATH_MASTER_PRODUCT_VISUAL_SPEC.md still missing; /tdd skill not installed, TDD done by hand (red->green)] blocked:missing-input
[18:21] [A] [A3+A4 alert rules + acceptance tests] started
[18:23] [A] [A3+A4 four alert rules (server/src/domain/alerts.ts), one-shot trigger (trigger.ts), wording guard, generic labels (shared/labels.ts), CLAUDE.md acceptance suite; 64 green, 1 todo (#13 waits for A5)] done
[18:24] [B] [B1 in-memory state + real API] started
[18:26] [B] [B1 in-memory state (server/src/state.ts), real read API with alerts, filters, holds + 'target comparison unavailable', generic labels and authoring-note filter on all display text; contract: timeline.station added] done
[18:26] [B] [B2 SSE /api/stream emits state-changed {version} on connect, trigger and reset] done
[18:26] [B] [B3+B4 trigger appends EV-01215 once (20 slides/10 cases, 409 after), reset restores state; 3 runs in a row tested; tests mutation-checked] done
[18:27] [D] [D1-D4 dashboard shell, pipeline, attention queue, live trigger] started
[18:34] [D] [D1-D4 dashboard: header (clock, SIMULATED DATA, 4 tiles, trigger + reset), 10 stage lanes (sum 450, click to filter), case table, attention queue (what/evidence/why/check), case drawer (basic), SSE live updates, one-shot crimson pulse; browser-verified at 1440x900: trigger->4 alerts/13 cases/10 flagged in H&E, 409 on repeat, reset, x3] done
[19:18] [T0] [decisions applied: --amber #C98A1B (fills only, 2.7:1 on cream) + --amber-ink #8A5A00 for text; CLAUDE/AGENTS say 'motion'; basket alert id basket_failure:PRISMA-BASKET-01; README notes Node 20 pins + dev-only audit. FLAG: --muted #8A7A82 is 3.7:1 on cream (below AA 4.5 for small text)] done
[19:18] [A] [A5 estimate engine (decisions 2-4)] started
[19:22] [A] [A5 estimate engine: rules parsed from Timing Rules tab (missing -> unknown); remaining steps x durations in 07:00-17:00 windows; Processor D 12:00-13:00 shown, 13:00 used; embedding 2-4h upper bound, missed window 'not modelled'; basket +60 repeat; background 'illustrative, stage-based'; decalc/received/cut-up/alert cases unknown with reasons; targets compared only when configured; active vs wall-clock in drawer; 99 green, browser-verified 11:55->12:55->11:55] done
[19:22] [C] [C1-C3 MCP server] started
[19:25] [C] [C1-C3 MCP server 'meridian' (mcp/src): get_case, list_alerts, cases_delayed (+urgent watch list) - read-only annotations, boundaries in instructions, calls :8787 only; 11 MCP tests incl. live trigger visibility + no-mutation + wording guard; verified over real stdio and Inspector 0.15.0 CLI; docs/MCP_SETUP.md; REGISTRY rows for adopted libs] done
