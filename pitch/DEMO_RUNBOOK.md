# Demo runbook (v8)

The spoken lines are in `SCRIPT.md` and on `/presenter`; the judges' Q&A is in `QA.md`. This file is the setup, the click path and what to do when something breaks.

## The night before

- [ ] **Backup clone:** `git clone https://github.com/Manthanbhanushali010/meridian-lab.git ~/Projects/meridian-backup && cd ~/Projects/meridian-backup && git checkout demo-safe-v8-p6 && npm install`. Run `npm run demo:serve` once there to check it starts.
- [ ] **Backup video** of the full 3-minute run recorded, on the desktop, opened once to check it plays.
- [ ] `npm run demo:walk` passes (9/9).

## Pre-demo checklist (10 minutes before)

- [ ] Charger in; battery not in low-power mode.
- [ ] Focus mode on (notifications off); Slack, Mail and Messages quit.
- [ ] Keep the Mac awake: in the macOS Terminal app run `caffeinate -dis &`.
- [ ] **Close every Claude Code session and VS Code.** Nothing else should be editing or watching the repo.
- [ ] Projector cable in; System Settings → Displays: **Extend, not mirror**. The demo window goes on the projector, `/presenter` stays on the laptop.
- [ ] From the **macOS Terminal app** (not an editor terminal), in `~/Projects/meridian-lab`:
  - `npm run demo:serve` for the pitch: a fixed build with no hot reload. If ports are busy, `npm run demo:start` frees them (then Ctrl-C it and run `demo:serve`).
  - Or `npm run demo:start` for the live dev server (frees ports 8787 and 5173, then starts).
- [ ] Demo window: http://localhost:5173/ in full screen on the projector, browser zoom **100%** (⌘0). "simulated feed" shows in green.
- [ ] Presenter: http://localhost:5173/presenter on the laptop. Check the 3:00 timer, then press Restart.
- [ ] Press **Reset demo**: one bouncing flag (26H1004), the agent console empty.
- [ ] "Skip animations" **unticked** (tick it only if the projector stutters).
- [ ] Claude Desktop open and signed in, with **meridian** connected under the tools menu. Ask one test question, then start a new chat.
- [ ] MCP Inspector command ready in a second Terminal tab (do not run it yet): `npx @modelcontextprotocol/inspector npx tsx mcp/src/index.ts` (details in `docs/MCP_SETUP.md`).
- [ ] Backup video open in QuickTime, paused at 0:00, behind the browser.

## Click path (follows `SCRIPT.md`)

| Beat | Screen and action |
|---|---|
| 1 · The problem (Victoria) | Dashboard, no clicks. |
| 2 · The old way (Victoria) | Demo bar → **LIMS view**: the biopsy strip and the grey event rows. |
| Side by side | Demo bar → **Compare** (26H1004): a LIMS today on the left, Meridian on the right. |
| 3 · The reinvention (Manthan) | Dashboard: 450 · 346 new · 104 backlog, the clock, urgent cases in red. |
| One search | Type **26H2345** in the search → the case page draws its journey, ending "Ready since 09:30". |
| The lab's morning (Victoria) | **Simulation** → **Play the lab's morning** (≈40 s). Captions narrate; the stainer pulses at 10:45. It ends with "a new incident is waiting" → **Dashboard**. |
| Incident (Manthan) | Double-click the bouncing flag "Incident · Microtomy station 4": 1 of 3 levels, evidence, suggested check. |
| Acknowledge (Victoria) | **Acknowledge**: the card flies to Incidents; it stays open as "Acknowledged — awaiting check". |
| Stainer (Manthan) | **Incidents** → the H&E basket failure: blast radius (20 slides, 10 cases), action timeline, "Stain run completes ~11:35". |
| The agent | Claude Desktop beside Meridian: "I'm starting the next shift. What do I need to know?" The agent console lights up. Say nothing for ~8 s. |
| Close (Victoria) | Dashboard. |
| After | **Reset demo**. |

Story mode can drive the screens from the presenter window: press → on `/presenter`, then **Open demo window**.

## Recovery

| Symptom | Do this |
|---|---|
| The page freezes or looks wrong | Hard reload (⌘⇧R), then **Reset demo**. |
| "reconnecting" or no updates | Hard reload. If it's still stuck, in Terminal press Ctrl-C, then run `npm run demo:start` (it frees ports 8787 and 5173 and restarts). Reload the browser. |
| Ports still busy, or the app won't start | `lsof -ti tcp:8787 tcp:5173 \| xargs kill`, then `npm run demo:serve`. |
| The repo is broken | Switch to the backup: `cd ~/Projects/meridian-backup && npm run demo:start`. |
| Claude Desktop doesn't answer or doesn't see "meridian" | Run the MCP Inspector command and call `get_case 26H1003`, `list_alerts`, or `shift_handover` with `mode=brief`. The agent console shows those calls too. |
| Animations stutter on the projector | Tick **Skip animations**. Everything still works. |
| Anything else | Play the backup video and narrate over it. Don't debug on stage. |

## After the demo

- **Reset demo**.
- Leave the app running for the Q&A; judges may ask to see a case. `/how-it-works` shows the architecture and the test count.
