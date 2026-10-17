# Self-check (MASTER_PLAN §10), scored honestly

Scored 17 October, about 20:10, against what has actually been run, not what is planned. 0 = not done, 1 = partly done or unverified, 2 = done and verified.

| # | Line | Score | Evidence / what's missing |
|---|---|---|---|
| 1 | **Impact:** the pain point comes from a real person | 1 | Victoria's lived experience is the framing throughout (PRD §1, ONE_PAGER, README). **Missing:** her final 25-second opening in `pitch/SCRIPT.md` (the script is to be pasted verbatim by the team). |
| 2 | **Impact:** the fit with the brief is stated in words | 2 | README "What we reinvented" and brief mapping; PRD §3; `pitch/SLIDES.md` slide 4; MCP = "end point for agentic control"; open event model = "closed data". |
| 3 | **Impact:** usefulness beyond one lab is clear | 2 | `docs/EVENT_MODEL.md` (FeedAdapter, bring your own LIMS export, XES / OCEL 2.0 mapping); MCP works with any agent; `hf_dataset/` open dataset (export tested; not yet published to Hugging Face). |
| 4 | **Impact:** the vision is clearly marked as future work | 1 | Marked "future work, not built" in `pitch/SLIDES.md` slide 5 and `pitch/QA.md`. **Missing:** the actual slides (only the outline exists). |
| 5 | **Technical:** the trigger works three times in a row after a reset | 2 | Automated test (`tests/api/sim.test.ts`, B4) and browser runs (trigger → 409 → reset, ×3) on the dashboard and in Story mode (×3, no refresh). |
| 6 | **Technical:** MCP answers four questions from live data | 1 | All four answered from the live tools over real stdio and via MCP Inspector 0.15.0; the agent console shows the calls. **Missing:** a run inside Claude Desktop itself by the team (needs the config in `docs/MCP_SETUP.md`). |
| 7 | **Technical:** the tests are green and the screenshot is ready | 1 | `npm test`: 149 passed in 16 files (also on a fresh clone). **Missing:** a screenshot of the green run for slide 4 (take it from your terminal). |
| 8 | **Technical:** a clean clone runs from the README | 2 | Fresh `git clone` of `c959784` into an empty folder → `npm install` → `npm test` (149/149) → `npm run dev`: dashboard 450 = 104 + 346, trigger 3 → 4 alerts. |
| 9 | **Technical:** no invented numbers anywhere ("unknown" shows correctly) | 2 | Every number comes from the API; lane counts = dots = 450; unknowns for 26H1003 / 26H1004 / 26H1015 / decalcification / received / cut-up queue, each with a reason; overclaim guard tests on alerts, estimates, API responses, MCP output and the dataset export. |
| 10 | **Presentation:** a non-expert can explain Meridian back after one run-through | 0 | Not yet tested. **Do:** one timed rehearsal in front of someone outside the team, and ask them to explain it back. |

**Total: 14 / 20.** Target: 18 or more.

## Lowest lines first: how to raise the score

1. **#10 (0):** rehearse in front of a non-expert; fix whatever they couldn't repeat back. → +2
2. **#1 (1):** paste Victoria's final opening into `pitch/SCRIPT.md` and time it at 25 s or less. → +1
3. **#4 (1):** build the 5 slides from `pitch/SLIDES.md`. → +1
4. **#6 (1):** add the `meridian` config to Claude Desktop and ask the four questions once. → +1
5. **#7 (1):** screenshot the green `npm test` run for slide 4. → +1

All five are human tasks; none needs code. Doing them all gives 20 / 20.
