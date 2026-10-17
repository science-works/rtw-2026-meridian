# Demo runbook

The spoken lines are in `SCRIPT.md`. This file is the click path, the checklist and what to do when something breaks.

## Pre-demo checklist (5 minutes before)

- [ ] Charger in; battery not in low-power mode.
- [ ] Notifications off (Focus mode on); Slack, Mail and Messages quit.
- [ ] Display mirrored or extended to the projector at 1440×900; browser zoom **100%**.
- [ ] `npm run dev` already running in a terminal (API :8787, dashboard :5173).
- [ ] http://localhost:5173 open, full screen. The live dot in the header is green.
- [ ] **Reset demo** pressed: 3 alerts, the trigger button enabled, the agent console empty.
- [ ] "Skip animations" **unticked** (tick it only if the projector stutters).
- [ ] Claude Desktop open, signed in, "meridian" visible under the tools menu. Test question asked once, then the chat cleared.
- [ ] MCP Inspector open in a backup browser tab (command in `docs/MCP_SETUP.md`).
- [ ] Backup video on the desktop, opened once to check it plays.
- [ ] 3D view: off (`VITE_3D` unset), unless rehearsed on the venue screen.
- [ ] Timer ready (3:00).

## Click path

| Beat | Action on screen |
|---|---|
| Opening (Victoria) | Slide 2. |
| The whole lab | Switch to Meridian. Point at the header tiles (450 = 104 + 346) and the lanes (103 backlog at microtomy). |
| One block holds a case | Click **26H1003** in the case list → the drawer shows the journey bar, A1–E1 at Processor and F1 at Cut-up, with "Unknown" and the reason. Optional: **Spotlight**. Close with Esc. |
| Live failure | Click **Trigger stainer basket failure** → ripple from H&E, 10 rows flash, 4 alerts, estimates roll to Day 1 12:55. Click **26H1005** → the "Repeat H&E run 60 min" line. Esc. |
| The agent | Claude Desktop on the left, Meridian on the right. Ask "I'm starting the next shift. What do I need to know?" (or attach the `shift_handover` prompt). The agent console fills with tool calls and the beam points into the cases. |
| Trust and vision (Victoria) | Slides 4 and 5. |
| After the pitch | **Reset demo** for the next rehearsal. |

**Alternative:** **Story mode** plays the same arc on live state; → or Space to advance, Esc to exit. Use it if the presenter prefers one button.

## Recovery

| Symptom | Do this |
|---|---|
| The page freezes or looks wrong | Reload (⌘R), then **Reset demo**. |
| Live dot grey / no updates (SSE stalled) | Reload the page. If still stuck, restart `npm run dev` (Ctrl-C, ↑, Enter) and reload. |
| The trigger button is disabled | It already fired: **Reset demo**, then trigger again. |
| Claude Desktop doesn't answer or doesn't see "meridian" | Switch to the Inspector tab and run `get_case 26H1003`, `list_alerts`, or `shift_handover` with `mode=brief`. The agent console shows those calls too. |
| Animations stutter on the projector | Tick **Skip animations**. Everything still works. |
| Anything else | Play the backup video and narrate over it. Don't debug on stage. |

## After the demo

- **Reset demo**.
- Leave `npm run dev` running for the Q&A; judges may ask to see a case.
