# Playbook `!meridian-ship`: demo-ready, submitted and rehearsed

## Overview
Turn a working build into a winning submission:
- a README a stranger can follow;
- a clean-clone check;
- the pitch script and Q&A card;
- a scored self-check;
- the backup video;
- the final commit hash submitted by 09:45 Sunday.

The pitch counts for as much as the build, so this playbook is not optional. Serves all three judging criteria.

## What's Needed From User
- Victoria's final teach-the-room opening (25 seconds) and her domain answers for Q&A.
- A screen recording of the full demo (the agent can't record the screen).
- The submission link (shared by the organisers on Sunday) and the actual submission.

## Procedure

### Phase A: repository polish (README.md, docs/)
1. Write `README.md`:
   - Meridian in one paragraph (from ONE_PAGER), plus the tagline;
   - a hero screenshot of the dashboard after the trigger;
   - the **"What we reinvented"** section: Sample tracking and LIMS, 01/02/03;
   - the architecture diagram (Mermaid: feed → server → rules / estimates → API / SSE → web + MCP → agent);
   - Quick start: `npm install && npm run dev`; `npm test`;
   - MCP: a link to `docs/MCP_SETUP.md`; the `shift_handover` example;
   - Open model: a link to `docs/EVENT_MODEL.md` and "Bring your own LIMS export";
   - test results: the count and a screenshot;
   - the safety boundaries and a **"Simulated data: not connected to a real lab"** disclaimer;
   - **"Built with"** crediting every library and skill (Motion, Magic UI, shadcn/ui, Tailwind, NumberFlow, Hono, Vitest, MCP SDK, SheetJS, plus the 3D stack if used, plus Matt Pocock's skills and the design skill);
   - the team (Block Party: Victoria and Manthan) and the MIT licence.
2. Run a **clean-clone check**: clone into `/tmp/meridian-check`, then `npm install && npm test && npm run dev`, following only the README. Fix any gaps.
3. Run `git log --all -p | grep -iE "sk-ant|api[_-]?key|secret"`. It must find nothing. Confirm `.env` is untracked.
4. Commit `H: README, setup, credits`. Push.

### Phase B: the pitch (pitch/)
5. Write `pitch/SCRIPT.md`: the MASTER_PLAN §7 beats, with exact spoken lines, the speaker, the screen action and the target timestamp for each, at most **3:00**. Include:
   - Victoria's opening: what a LIMS is, plus her lived example;
   - the brief's words: "closed data → open model", "no endpoint → MCP", "the agent investigates";
   - the closing line: *"A LIMS records what happened. Meridian shows what's happening, and what's about to go wrong."*
6. Write `pitch/QA.md`: MASTER_PLAN §9, one or two sentence answers, with an owner for each (Victoria or Manthan).
7. Write `pitch/SLIDES.md`, an outline of at most 5 slides:
   1. title;
   2. problem (01/02);
   3. live demo (switch to the app);
   4. how it works (architecture + "rules decide, AI explains, scientists act" + test screenshot);
   5. vision (Live → Shift → Lab-wide) + next steps.
   Use the event palette.
8. Write `pitch/DEMO_RUNBOOK.md`: the exact click path, pre-demo checklist and recovery steps (see Specifications).

### Phase C: proof and self-check (docs/QA.md)
9. Score MASTER_PLAN §10 honestly (0–2 per line) in `docs/QA.md`. Fix the lowest-scoring line first if time allows.
10. Tell the user to record **backup video #2** (the final build, at most 3:00, following SCRIPT.md).
11. Tell the user to do **two timed rehearsals**, each at most 3:00, with Victoria; update SCRIPT.md after each.

### Phase D: freeze and submit (Sunday 09:00–09:45)
12. Freeze the code by 09:00: only README or typo fixes after that.
13. Run `npm test` one last time; `git status` must be clean; `git push`.
14. Print the final commit hash: `git rev-parse HEAD`. Print the repo URL.
15. ⏸ Tell the user: **"Submit the URL + hash now (deadline 10:00)."** Record the time submitted in STATUS.md.

## Specifications
- A stranger can run the app and the tests from the README alone (the clean-clone check passed).
- The README contains the disclaimer, safety boundaries, architecture, MCP and open-model sections, test proof and complete credits.
- `pitch/` contains SCRIPT (at most 3:00), QA, SLIDES and DEMO_RUNBOOK.
- DEMO_RUNBOOK has a **pre-demo checklist**:
  - charger in;
  - notifications off (Focus mode);
  - browser zoom 100%;
  - `npm run dev` already running;
  - Reset demo pressed;
  - Claude Desktop open and connected;
  - MCP Inspector open in a backup tab;
  - the backup video on the desktop;
  - `VITE_3D` set as rehearsed.
- DEMO_RUNBOOK has **recovery steps**:
  - the app freezes → reload, then Reset demo;
  - SSE stalls → reload;
  - the agent fails → switch to the Inspector tab;
  - anything else → play the backup video and narrate.
- `docs/QA.md` self-check is 18 or more out of 20, or lists exactly what's missing.
- The repo is public, has an MIT LICENSE in the root, a clean history from the hackathon window and the final hash recorded; it's submitted before 10:00.

## Advice and Pointers
- Rehearse the trigger moment until it's boring. That's the moment judges remember.
- Victoria speaks first and last; human credibility is the strongest Impact signal.
- Say "unknown" proudly when the data can't support an estimate. That's trust, not weakness.
- Keep slides sparse; the live app is the slide.

## Forbidden Actions
- Don't change features after 09:00 Sunday.
- Don't claim production readiness, real LIMS connectivity, diagnosis, reporting time or deadlines, anywhere (README, slides, script).
- Don't submit without a clean `git status` and a recorded hash.
- Don't skip the backup video.
