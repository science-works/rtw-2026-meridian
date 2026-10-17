# VISUAL_LAYER.md: immersive, but honest

**Owner:** workstreams D (dashboard) and E (Story mode). They only touch `web/`.

**Read with:** `CLAUDE.md` (design tokens, safety) and `docs/MASTER_PLAN.md` (§3 folder ownership, §7 demo beats).

**Goal:** make the pain point *felt* in seconds (Presentation, 10 points) without touching the backend or the API contract, and without ever showing a number the server didn't compute.

## 1. The rule that governs every effect

> **Every motion must explain something true about the lab.** If an effect doesn't map to a real event, count or rule from the API, it doesn't ship.

Hard constraints:
- **`web/` only.** Consume the `shared/` contract (`/api/overview`, `/api/cases`, `/api/alerts`, `/api/stream`, `/api/sim/*`). Never edit `server/`, `mcp/` or `shared/`. If an effect needs data the API lacks, log it in `STATUS.md` as a contract request; don't fake it.
- **Feature flag:** `VITE_FX=off` turns every effect off and leaves a fully working plain dashboard. That's the demo fallback.
- Each animation lasts no longer than about **900 ms**. Respect `prefers-reduced-motion`. Provide a "skip animations" toggle.
- **3D only via `docs/playbooks/03_3D_LAB_FLOOR.md`, behind `VITE_3D` (off by default), with an automatic 2D fallback.** Projector laptops and venue machines are unpredictable, so everything else uses CSS, SVG and Motion. 450 dots in SVG/DOM is fine.
- Use the palette in CLAUDE.md:
  - crimson only for real alerts;
  - teal for on track;
  - periwinkle for in progress;
  - amber for a hold, such as a missing block.
- Readable from the back of the room: base text 16px or larger, plus high contrast.

## 2. Approved open-source toolkit (licences checked)

| Library | Licence | Use it for | Install |
|---|---|---|---|
| **Motion** (formerly Framer Motion), motion.dev | MIT | Layout transitions, the drawer, ripples, Story-mode choreography | `npm i motion` |
| **Magic UI**, magicuidesign/magicui | MIT | Ready animated components (see §3); copy-paste via the shadcn registry | `npx shadcn@latest add "https://magicui.design/r/<component>"` (check each component's exact command on its page) |
| **Magic UI agent skill** | MIT | Lets Claude Code pick, install and adapt Magic UI components correctly | `npx skills add magicuidesign/magicui --skill magic-ui --agent claude-code` (installs into `.claude/skills/`, so add it to `.gitignore`) |
| **shadcn/ui** | MIT | Base components (cards, sheet/drawer, tabs, badge, tooltip) | `npx shadcn@latest init` |
| **NumberFlow**, `@number-flow/react` | MIT | Stage counts and estimates that roll smoothly to new values | `npm i @number-flow/react` |
| **React Flow / xyflow** (optional) | MIT | A station map (the equipment view), only if time allows | `npm i @xyflow/react` |
| **Anthropic frontend-design skill** (if available in your Claude Code) | Anthropic skills repo | Overall aesthetic direction | Comes with Anthropic's skills |
| Your chosen design skill (Impeccable *or* UI UX Pro Max) | See its repo | Polish pass on spacing and type | Use one only |

Avoid for this build:
- **GSAP:** now free, but under its own "no charge" licence rather than an open-source one. Motion covers everything here.
- **Aceternity UI:** free copy-paste components, but check the licence first.
- **Remotion:** it makes videos, and our demo must be live.
- **Lottie:** pre-baked animations aren't data-driven.

**Credit every library in the README's "Built with" section. Skills stay out of git.**

## 3. Effect → pain point → data map

| # | Effect | The pain point it makes visible | Driven by | Component |
|---|---|---|---|---|
| V1 | **Lab river:** dots for cases flowing into 10 stage lanes; lanes widen where work piles up (103 backlog cases at microtomy) | "Nobody can see the whole lab at once" | `/api/overview`, `/api/cases` | Motion layout and SVG dots; NumberFlow lane counts |
| V2 | **Counts that roll** when state changes | "Things change all day and nobody notices" | SSE `state-changed` → re-fetch | NumberFlow |
| V3 | **Alerts slide into the attention queue** one by one, newest first | "Errors surface late, one at a time" | `/api/alerts` | Magic UI *Animated List* |
| V4 | **Stainer failure ripple:** one crimson pulse from the stainer card, travelling to the 20 slides and 10 cases, whose estimates then roll forward 60 minutes | "One failure silently delays many patients' cases" | `POST /api/sim/basket-failure` → SSE → `/api/alerts` | Magic UI *Ripple* / *Border Beam* plus Motion stagger |
| V5 | **Spotlight on a hold:** everything dims except 26H1003; A1–E1 glow teal in the processor, F1 pulses amber at cut-up; caption "No whole-case handoff time yet: F1 outstanding" | "One missing block holds the whole case, invisibly" | `/api/cases/26H1003` | Motion plus a CSS dim overlay |
| V6 | **Journey bar (flight-tracker style)** in the case drawer: departed, in progress, next; the estimate with its reasons | "When will it be ready, and why not sooner?" | `CaseDetail.timeline`, `estimate.components` | shadcn Sheet plus Motion progress |
| V7 | **"Caught now vs found later" bar** on each alert: where we caught it (now, at the bench) against the next stage where a person would otherwise notice (e.g. IQC), shown as the stages it would have travelled. **Stage names only, no invented times** unless the estimate engine supplies them. | "Errors found down the line waste every step in between" (Victoria) | Alert stage + remaining stages from the case | Magic UI *Animated Beam* or a simple stepped SVG |
| V8 | **Agent beam:** a one-way beam from the "Claude (via MCP)" badge *into* Meridian when a tool call happens, never out, showing the agent only reads | "Can we trust AI here?" Yes: it can't write | Optional `GET /api/stream` tool-call events (contract request) or a static diagram on the slide | Magic UI *Animated Beam* |

**Must have:** V1, V2, V3, V4, V5. **Should have:** V6, V7. **Could have:** V8 (it can be a slide diagram instead).

## 4. Task cards (add to MASTER_PLAN workstreams D and E)

- **VX0: Toolkit setup.** 15 min. Deps D1.
  - `npx shadcn@latest init`; install `motion` and `@number-flow/react`; install the Magic UI skill.
  - Add the `VITE_FX` flag and reduced-motion handling.
  - Done when the plain dashboard still renders with `VITE_FX=off`.
- **VX1: Lab river (V1 + V2).** 60 min. Deps D2.
  - Done when the counts match `/api/overview` exactly and lanes animate on load.
- **VX2: Alert stream (V3).** 30 min. Deps D3.
  - Done when the 4 alerts animate in and clicking one opens the case.
- **VX3: Failure ripple (V4).** 45 min. Deps D4, B3. **The money shot.**
  - Done when the trigger plays it once, the 20 slides and 10 cases highlight, the estimates roll forward, and Reset restores everything. It must work 3 times in a row.
- **VX4: Spotlight (V5).** 30 min. Deps D5.
- **VX5: Journey bar and "caught now vs found later" (V6 + V7).** 60 min. Deps D5, A5.
- **VX6: Story-mode choreography.** 45 min (E1). Sequence V1 → V5 → V4 → hand-off to Claude Desktop → plain dashboard; arrow keys advance.
- **VX7: Projector pass.** 15 min. Check on an external display at 1440×900; turn effects down if anything stutters.

**Cut order if behind:** V8 → V7 → V6 → React Flow. **Never cut:** V4 (the ripple), and a working `VITE_FX=off` fallback.

## 5. Prompt for the UI agent

> "You are Agent D/E. Read CLAUDE.md, docs/MASTER_PLAN.md and docs/VISUAL_LAYER.md. Work only in `web/`. Start with VX0, then VX1–VX4 in order. Use Motion, NumberFlow and Magic UI (use the magic-ui skill to pick and install components). Every effect must be driven by the real API; never hard-code numbers. Keep `VITE_FX=off` working. Commit after each VX task and log it in STATUS.md."
